"""add preferences JSONB column to users

Revision ID: a1b2c3d4e5f6
Revises: f9a798b54228
Create Date: 2026-09-19 11:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: str | Sequence[str] | None = 'f9a798b54228'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'preferences',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )

def downgrade() -> None:
    op.drop_column('users', 'preferences')
