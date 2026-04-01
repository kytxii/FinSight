from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from uuid import UUID

class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=20)
    last_name: str = Field(min_length=2, max_length=20)
    email_address: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    email_address: EmailStr
    password: str

class UpdateUser(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=20)
    last_name: str | None = Field(default=None, min_length=2, max_length=20)
    email_address: EmailStr | None = None

class UserResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email_address: EmailStr
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str