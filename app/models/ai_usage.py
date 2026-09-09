from sqlalchemy import Date, Integer, UUID, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date
import uuid

from app.database import Base


class AiUsage(Base):
    """One row per user per calendar day - counts assistant messages sent,
    not underlying Gemini API calls (a single message can drive up to 3 tool
    round trips). Keyed by (user_id, usage_date) so the daily cap survives a
    server restart, unlike the in-memory IP-keyed slowapi limiter used
    elsewhere (#13 cost analysis - a persisted counter is required, not
    optional, for a per-user daily cap to mean anything).
    """

    __tablename__ = "ai_usage"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    usage_date: Mapped[date] = mapped_column(Date, primary_key=True)
    request_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
