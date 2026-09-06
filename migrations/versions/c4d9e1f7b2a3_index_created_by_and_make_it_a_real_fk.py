"""index created_by and make it a real foreign key

Every user-scoped query filters on created_by, but it was indexed on no table -
so each one was a sequential scan that degraded with total rows across all
users. It also wasn't a real foreign key, so deleting a user orphaned their
rows instead of removing them (#169).

Revision ID: c4d9e1f7b2a3
Revises: a53f6cfdd3e5
Create Date: 2026-09-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d9e1f7b2a3'
down_revision: Union[str, Sequence[str], None] = 'a53f6cfdd3e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Every table carrying a created_by column.
TABLES = [
    "transactions",
    "tip_deposits",
    "recurring_payments",
    "installments",
    "paychecks",
    "paycheck_schedules",
    "balance_anchors",
    "credit_card_payments",
    "credit_card_charges",
    "credit_card_charge_allocations",
]


def _assert_no_orphans() -> None:
    """Fail before changing anything if any created_by points at a user that
    no longer exists.

    created_by has never been enforced, and the test fixtures delete users
    directly, so orphans are plausible. Adding the constraint with orphans
    present would fail partway through and leave the schema half-migrated -
    better to refuse up front and report every offending table at once, so
    whoever runs this can decide what the rows are worth rather than having a
    migration silently delete financial data.
    """
    bind = op.get_bind()
    orphans = []
    for table in TABLES:
        count = bind.execute(
            sa.text(
                f"SELECT COUNT(*) FROM {table} t "
                "LEFT JOIN users u ON u.id = t.created_by "
                "WHERE u.id IS NULL"
            )
        ).scalar_one()
        if count:
            orphans.append(f"  {table}: {count} row(s)")

    if orphans:
        raise RuntimeError(
            "Cannot add the created_by foreign key - these rows reference a "
            "user that no longer exists:\n"
            + "\n".join(orphans)
            + "\n\nInspect them, then either reassign or delete them, e.g.:\n"
            "  DELETE FROM <table> t USING ... WHERE NOT EXISTS "
            "(SELECT 1 FROM users u WHERE u.id = t.created_by);"
        )


def upgrade() -> None:
    _assert_no_orphans()

    for table in TABLES:
        op.create_index(f"ix_{table}_created_by", table, ["created_by"])
        op.create_foreign_key(
            f"fk_{table}_created_by_users",
            table,
            "users",
            ["created_by"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    for table in TABLES:
        op.drop_constraint(f"fk_{table}_created_by_users", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_created_by", table_name=table)
