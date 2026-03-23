"""add languages and gender to users

Revision ID: a9f2c1b3d4e5
Revises: c7d8e9f0a1b2
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9f2c1b3d4e5"
down_revision: Union[str, Sequence[str], None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("languages", sa.JSON(), nullable=True))
    op.add_column("users", sa.Column("gender", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "gender")
    op.drop_column("users", "languages")

