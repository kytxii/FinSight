from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    WHITELIST: list[str]
    FRONTEND_URL: str
    DEV_URL: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    model_config = {"env_file": ".env"}

settings = Settings() # pyright: ignore[reportCallIssue]