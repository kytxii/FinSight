from enum import Enum
from typing import TYPE_CHECKING
from sqlalchemy import Date, DateTime, UUID, Boolean, Enum as PaycheckFrequencyEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date, timezone
from app.database import Base
import uuid

if TYPE_CHECKING:
    from app.models.paycheck import Paycheck


class PaycheckFrequency(str, Enum):
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    SEMI_MONTHLY = "SEMI_MONTHLY"
    MONTHLY = "MONTHLY"


class PaycheckSchedule(Base):
    __tablename__ = "paycheck_schedules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    frequency: Mapped[PaycheckFrequency] = mapped_column(PaycheckFrequencyEnum(PaycheckFrequency), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    updated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    paychecks: Mapped[list["Paycheck"]] = relationship(back_populates="schedule", cascade="all, delete-orphan")
