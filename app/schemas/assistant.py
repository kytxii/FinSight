from pydantic import BaseModel, Field
from enum import Enum


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ChatHistoryMessage(BaseModel):
    role: ChatRole
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    reply: str
    requests_remaining_today: int
    requests_remaining_this_minute: int


class UsageResponse(BaseModel):
    requests_remaining_today: int
    requests_remaining_this_minute: int
