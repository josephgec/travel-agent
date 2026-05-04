"""Google OAuth routes."""
from __future__ import annotations

from typing import Annotated
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.integrations.google_oauth import (
    ALL_SCOPE_NAMES,
    OAuthError,
    build_auth_url,
    consume_state,
    delete_account,
    exchange_code,
    fetch_userinfo,
    get_account,
    save_account,
)

router = APIRouter(prefix="/api/auth/google", tags=["auth"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("/start")
async def start(
    db: DbSession,
    scopes: list[str] = Query(default_factory=lambda: ["gmail"]),
) -> RedirectResponse:
    existing = await get_account(db)
    existing_scopes = (existing.scopes if existing else None)
    try:
        url = await build_auth_url(scopes, existing_scopes=existing_scopes)
    except OAuthError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return RedirectResponse(url, status_code=302)


@router.get("/callback")
async def callback(
    db: DbSession,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    settings = get_settings()
    base = settings.frontend_base_url.rstrip("/")

    if error:
        return RedirectResponse(f"{base}/settings?google_error={quote_plus(error)}", status_code=302)
    if not code or not state:
        return RedirectResponse(f"{base}/settings?google_error=missing_code_or_state", status_code=302)

    if not await consume_state(state):
        return RedirectResponse(f"{base}/settings?google_error=invalid_state", status_code=302)

    try:
        async with httpx.AsyncClient() as http:
            token_body = await exchange_code(http, code)
            access_token = token_body.get("access_token")
            refresh_token = token_body.get("refresh_token")
            granted = (token_body.get("scope") or "").split() or []
            account_email: str | None = None
            if access_token:
                try:
                    info = await fetch_userinfo(http, access_token)
                    account_email = info.get("email")
                except OAuthError:
                    pass

            if not refresh_token:
                # Possible if user previously consented and Google didn't reissue.
                # Force re-consent by hitting /start again; we set prompt=consent so
                # this case is rare.
                return RedirectResponse(
                    f"{base}/settings?google_error=no_refresh_token",
                    status_code=302,
                )

            await save_account(
                db,
                refresh_token=refresh_token,
                scopes=granted,
                account_email=account_email,
            )
    except OAuthError as e:
        return RedirectResponse(
            f"{base}/settings?google_error={quote_plus(str(e))}",
            status_code=302,
        )

    return RedirectResponse(f"{base}/settings?google=connected", status_code=302)


@router.get("/status")
async def status_endpoint(db: DbSession) -> dict:
    acct = await get_account(db)
    if acct is None:
        return {"connected": False}
    granted = set(acct.scopes or [])
    return {
        "connected": True,
        "account_email": acct.account_email,
        "scopes": sorted(granted),
        "capabilities": {
            short_name: full in granted
            for short_name, full in ALL_SCOPE_NAMES.items()
            if short_name not in ("openid", "email")
        },
        "updated_at": acct.updated_at.isoformat(),
    }


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect(db: DbSession) -> None:
    await delete_account(db)
