from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from datetime import datetime, timezone, timedelta
import jwt
from app.core.config import settings

pwd_hasher = PasswordHash(hashers=[Argon2Hasher()])

def hash_password(password: str) -> str:
    hashed_password = pwd_hasher.hash(password)
    return hashed_password

def verify_password(plain: str, hashed: str) -> bool:
    verified_password = pwd_hasher.verify(plain, hashed)
    return verified_password

def create_access_token(subject: str) -> str:
    payload = {                                                                               
      "sub": subject,                                                                       
      "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)                                   
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token

def decode_access_token(token: str) -> str:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return payload["sub"]