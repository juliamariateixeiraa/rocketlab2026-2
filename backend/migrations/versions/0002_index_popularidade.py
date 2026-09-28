"""Indexa a popularidade para ordenar o catálogo sem varrer a tabela.

Revision ID: 0002_index_popularidade
Revises: 0001_initial_movie_schema
Create Date: 2026-09-28
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_index_popularidade"
down_revision: str | Sequence[str] | None = "0001_initial_movie_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_fact_movies_performance_popularidade",
        "fact_movies_performance",
        ["popularidade", "sk_movie_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_fact_movies_performance_popularidade", table_name="fact_movies_performance")
