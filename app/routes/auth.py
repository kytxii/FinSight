from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user import RegisterRequest, LoginRequest, UserResponse, TokenResponse
from app.services.auth_service import register_user, login_user
from app.dependencies import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(db, data)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    token = await login_user(db, data)
    return TokenResponse(access_token=token, token_type="bearer")