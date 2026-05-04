"""Symmetric encryption for secrets stored at rest (OAuth refresh tokens, etc.).

Key is derived deterministically from SESSION_SECRET so the same .env value yields
the same Fernet key across restarts.
"""
from __future__ import annotations

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


class CryptoError(Exception):
    pass


@lru_cache
def _fernet() -> Fernet:
    secret = get_settings().session_secret
    if not secret:
        raise CryptoError("SESSION_SECRET must be set to encrypt secrets at rest")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as e:
        raise CryptoError("could not decrypt — wrong SESSION_SECRET?") from e
