from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from datetime import datetime
from uuid import UUID
import re

class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=20)
    last_name: str = Field(min_length=2, max_length=20)
    email_address: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_compelxity(cls, v: str) -> str:
        if not re.search(r"\d", v):
              raise ValueError("must contain at least one number")
        if not re.search(r"[^a-zA-Z0-9]", v):
            raise ValueError("must contain at least one special character")
        return v

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