"""feat(models): add name to paycheck_schedules

Revision ID: e2dbacdd9e09
Revises: 58be7e487280
Create Date: 2026-07-18 11:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2dbacdd9e09'
down_revision: Union[str, Sequence[str], None] = '58be7e487280'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('paycheck_schedules', sa.Column('name', sa.String(length=100), server_default='Paycheck', nullable=False))
    # Drop the server default now that existing rows are backfilled - new rows
    # require the caller to supply a name, matching the other required columns.
    op.alter_column('paycheck_schedules', 'name', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('paycheck_schedules', 'name')
