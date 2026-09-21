"""add is_opening_balance to transactions

Revision ID: 7d3e9a1b2c4f
Revises: 34658b71c7e4
Create Date: 2026-09-21 12:00:00.000000

Saldo awal masuk hitungan saldo all-time tetapi keluar dari agregat
bulanan. Backfill baris lama bertipe income berdeskripsi "Saldo awal"
(yang dibuat onboarding sebelum kolom ini ada).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7d3e9a1b2c4f'
down_revision: str | Sequence[str] | None = '34658b71c7e4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'transactions',
        sa.Column(
            'is_opening_balance',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
    )
    op.execute(
        sa.text(
            "UPDATE transactions SET is_opening_balance = true "
            "WHERE type = 'income' AND description = 'Saldo awal'"
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('transactions', 'is_opening_balance')
