"""Google OAuth 2.0 helpers — incremental scopes for Gmail + Calendar.

State is stored in Redis with a short TTL for CSRF protection on the callback.
Refresh tokens are stored encrypted in the oauth_accounts table.
"""
from __future__ import annotations

import secrets
from typing import Any
from urllib.parse import urlencode

import httpx
import redis.asyncio as redis_async
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import OAuthAccount
from app.security.crypto import decrypt, encrypt

log = structlog.get_logger(__name__)

AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

PROVIDER = "google"
STATE_TTL_SECONDS = 600  # 10 minutes
REDIS_STATE_PREFIX = "googleoauth:state:"
REDIS_ACCESS_PREFIX = "googleoauth:access:"

ALL_SCOPE_NAMES = {
    "gmail": "https://www.googleapis.com/auth/gmail.readonly",
    # Full `calendar` scope (not `calendar.events`) so freeBusy queries work too.
    # Calendar.events alone is write-only-for-events; reading freeBusy + listing
    # other people's calendars requires the broader scope.
    "calendar": "https://www.googleapis.com/auth/calendar",
    # Always-on so we know which Google account connected.
    "openid": "openid",
    "email": "https://www.googleapis.com/auth/userinfo.email",
}


class OAuthError(Exception):
    pass


_redis: redis_async.Redis | None = None


def _get_redis() -> redis_async.Redis:
    global _redis
    if _redis is None:
        _redis = redis_async.from_url(get_settings().redis_url, decode_responses=True)
    return _redis


def _client_creds() -> tuple[str, str, str]:
    s = get_settings()
    if not (s.google_oauth_client_id and s.google_oauth_client_secret):
        raise OAuthError(
            "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set"
        )
    return s.google_oauth_client_id, s.google_oauth_client_secret, s.google_oauth_redirect_uri


def resolve_scopes(names: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    # Always include openid + email so we capture which account connected.
    for n in ["openid", "email", *names]:
        url = ALL_SCOPE_NAMES.get(n, n)  # accept either short name or full URL
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


async def build_auth_url(scopes: list[str], existing_scopes: list[str] | None = None) -> str:
    """Return Google's consent URL. Stores a CSRF state in Redis."""
    client_id, _, redirect_uri = _client_creds()
    state = secrets.token_urlsafe(32)
    await _get_redis().set(f"{REDIS_STATE_PREFIX}{state}", "1", ex=STATE_TTL_SECONDS)

    # Merge any previously-granted scopes so re-consent extends rather than narrows.
    final_scopes = sorted({*resolve_scopes(scopes), *(existing_scopes or [])})

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(final_scopes),
        "state": state,
        "access_type": "offline",  # required to get refresh_token
        "prompt": "consent",  # force re-consent so refresh_token is reliably issued
        "include_granted_scopes": "true",
    }
    return f"{AUTH_BASE}?{urlencode(params)}"


async def consume_state(state: str) -> bool:
    r = _get_redis()
    key = f"{REDIS_STATE_PREFIX}{state}"
    # GETDEL is atomic; pipe-equivalent works on older redis.
    pipe = r.pipeline()
    pipe.get(key)
    pipe.delete(key)
    val, _ = await pipe.execute()
    return val == "1"


async def exchange_code(http: httpx.AsyncClient, code: str) -> dict[str, Any]:
    client_id, client_secret, redirect_uri = _client_creds()
    resp = await http.post(
        TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise OAuthError(f"token exchange {resp.status_code}: {resp.text[:300]}")
    return resp.json()


async def refresh_access_token(http: httpx.AsyncClient, refresh_token: str) -> dict[str, Any]:
    client_id, client_secret, _ = _client_creds()
    resp = await http.post(
        TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=20.0,
    )
    if resp.status_code >= 400:
        raise OAuthError(f"token refresh {resp.status_code}: {resp.text[:300]}")
    return resp.json()


async def fetch_userinfo(http: httpx.AsyncClient, access_token: str) -> dict[str, Any]:
    resp = await http.get(
        USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10.0,
    )
    if resp.status_code >= 400:
        raise OAuthError(f"userinfo {resp.status_code}: {resp.text[:300]}")
    return resp.json()


# --- Account persistence ----------------------------------------------------------

async def get_account(db: AsyncSession) -> OAuthAccount | None:
    return (
        await db.scalars(select(OAuthAccount).where(OAuthAccount.provider == PROVIDER))
    ).one_or_none()


async def save_account(
    db: AsyncSession,
    *,
    refresh_token: str,
    scopes: list[str],
    account_email: str | None,
) -> OAuthAccount:
    # Invalidate any cached access token — the new refresh token may carry
    # different scopes, and reusing the stale access token will 403 on the
    # newly-granted endpoints.
    await _get_redis().delete(f"{REDIS_ACCESS_PREFIX}{PROVIDER}")

    existing = await get_account(db)
    if existing:
        existing.refresh_token_encrypted = encrypt(refresh_token)
        existing.scopes = scopes
        existing.account_email = account_email
        await db.commit()
        await db.refresh(existing)
        return existing
    acct = OAuthAccount(
        provider=PROVIDER,
        refresh_token_encrypted=encrypt(refresh_token),
        scopes=scopes,
        account_email=account_email,
    )
    db.add(acct)
    await db.commit()
    await db.refresh(acct)
    return acct


async def delete_account(db: AsyncSession) -> bool:
    await _get_redis().delete(f"{REDIS_ACCESS_PREFIX}{PROVIDER}")
    acct = await get_account(db)
    if acct is None:
        return False
    await db.delete(acct)
    await db.commit()
    return True


async def get_access_token(http: httpx.AsyncClient, db: AsyncSession) -> str:
    """Return a valid access token for the connected account, refreshing via Redis cache."""
    r = _get_redis()
    cached = await r.get(f"{REDIS_ACCESS_PREFIX}{PROVIDER}")
    if cached:
        return cached

    acct = await get_account(db)
    if acct is None:
        raise OAuthError("no Google account connected — visit /api/auth/google/start")

    refresh_token = decrypt(acct.refresh_token_encrypted)
    body = await refresh_access_token(http, refresh_token)
    access_token = body["access_token"]
    ttl = max(60, int(body.get("expires_in", 3500)) - 30)
    await r.set(f"{REDIS_ACCESS_PREFIX}{PROVIDER}", access_token, ex=ttl)
    return access_token


def has_scope(account: OAuthAccount | None, scope_name: str) -> bool:
    if account is None:
        return False
    target = ALL_SCOPE_NAMES.get(scope_name, scope_name)
    return target in (account.scopes or [])
