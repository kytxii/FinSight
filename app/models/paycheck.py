from typing import TYPE_CHECKING
from sqlalchemy import Numeric, Date, DateTime, UUID, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date, timezone
from decimal import Decimal
from app.database import Base
import uuid

if TYPE_CHECKING:
    from app.models.paycheck_schedule import PaycheckSchedule


class Paycheck(Base):
    __tablename__ = "paychecks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    schedule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("paycheck_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    pay_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    updated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    schedule: Mapped["PaycheckSchedule"] = relationship(back_populates="paychecks")
