from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import RegisterRequest, LoginRequest, UserResponse, TokenResponse
from app.services.auth_service import register_user, login_user, refresh_session, logout_user
from app.dependencies import get_db
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_KWARGS = dict(
    key="refresh_token",
    httponly=True,
    secure=True,
    samesite="none",  # required for cross-origin (Vercel → Render)
    max_age=7 * 24 * 60 * 60,
    path="/",
)


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if data.email_address not in settings.WHITELIST:
        raise HTTPException(status_code=403, detail="Registration closed")
    user = await register_user(db, data)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/30seconds")
async def login(request: Request, response: Response, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token = await login_user(db, data)
    if refresh_token:
        response.set_cookie(value=refresh_token, **_COOKIE_KWARGS)
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    access_token, new_refresh_token = await refresh_session(db, raw_token)
    response.set_cookie(value=new_refresh_token, **_COOKIE_KWARGS)
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    raw_token = request.cookies.get("refresh_token")
    await logout_user(db, raw_token)
    response.delete_cookie(key="refresh_token", path="/")
