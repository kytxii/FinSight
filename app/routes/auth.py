from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from app.schemas.user import RegisterRequest, LoginRequest, UserResponse, TokenResponse
from app.services.auth_service import register_user, login_user
from app.dependencies import get_db
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if data.email_address not in settings.WHITELIST:
        raise HTTPException(status_code=403, detail="Registration closed")
    user = await register_user(db, data)
    return user

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/30seconds")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await login_user(db, data)
    return TokenResponse(access_token=token, token_type="bearer")