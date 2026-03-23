"""add yelp_fusion_snapshot json to restaurants

Revision ID: c7d8e9f0a1b2
Revises: b1c2d3e4f5a6
Create Date: 2026-03-22

Stores the full Yelp Fusion business-details JSON on each import so no API field is lost.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("restaurants", sa.Column("yelp_fusion_snapshot", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("restaurants", "yelp_fusion_snapshot")
