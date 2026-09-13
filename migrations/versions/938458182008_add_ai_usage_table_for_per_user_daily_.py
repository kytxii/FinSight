"""add ai_usage table for per-user daily assistant message cap

Revision ID: 938458182008
Revises: 291a4bedb04c
Create Date: 2026-09-08 14:41:50.444494

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '938458182008'
down_revision: Union[str, Sequence[str], None] = '291a4bedb04c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "ai_usage",
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "usage_date"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("ai_usage")
