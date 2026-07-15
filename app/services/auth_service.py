from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
import uuid
from app.schemas import RegisterRequest, LoginRequest, OAuthUserInfo
from app.models import User
from app.models.refresh_token import RefreshToken
from app.models.oauth_account import OAuthAccount
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, generate_refresh_token, hash_token

REFRESH_TOKEN_EXPIRE_DAYS = 7


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    result = await db.execute(select(User).where(User.email_address == data.email_address))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email_address=data.email_address,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _issue_refresh_token(db: AsyncSession, user_id: uuid.UUID) -> str:
    raw, token_hash = generate_refresh_token()
    record = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(record)
    return raw


async def login_user(db: AsyncSession, data: LoginRequest) -> tuple[str, str]:
    result = await db.execute(select(User).where(User.email_address == data.email_address))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(str(user.id))
    refresh_token_raw = await _issue_refresh_token(db, user.id) if data.remember_me else None
    await db.commit()
    return access_token, refresh_token_raw


async def refresh_session(db: AsyncSession, raw_token: str) -> tuple[str, str]:
    token_hash = hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Rotate: revoke old, issue new
    record.is_revoked = True
    access_token = create_access_token(str(record.user_id))
    new_raw = await _issue_refresh_token(db, record.user_id)
    await db.commit()
    return access_token, new_raw


async def logout_user(db: AsyncSession, raw_token: str | None) -> None:
    if not raw_token:
        return
    token_hash = hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    record = result.scalar_one_or_none()
    if record:
        record.is_revoked = True
        await db.commit()


async def oauth_login(db: AsyncSession, provider: str, info: OAuthUserInfo) -> tuple[str, str]:
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == info.provider_user_id,
        )
    )
    oauth_account = result.scalar_one_or_none()

    if oauth_account:
        user_id = oauth_account.user_id
    else:
        if not info.email_verified:
            raise HTTPException(status_code=403, detail="Email not verified by provider")

        result = await db.execute(select(User).where(User.email_address == info.email))
        user = result.scalar_one_or_none()

        if not user:
            if info.email not in settings.WHITELIST:
                raise HTTPException(status_code=403, detail="Registration closed")
            user = User(
                first_name=info.first_name,
                last_name=info.last_name,
                email_address=info.email,
                password_hash=None,
                avatar=info.avatar,
            )
            db.add(user)
            await db.flush()

        user_id = user.id
        db.add(OAuthAccount(user_id=user_id, provider=provider, provider_user_id=info.provider_user_id))

    access_token = create_access_token(str(user_id))
    refresh_token_raw = await _issue_refresh_token(db, user_id)
    await db.commit()
    return access_token, refresh_token_raw
