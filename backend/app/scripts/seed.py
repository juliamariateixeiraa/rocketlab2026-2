"""Carga inicial do banco a partir dos CSVs da camada Diamond.

Uso (a partir de ``backend/``)::

    .venv/bin/python -m app.scripts.seed               # usa ../data
    .venv/bin/python -m app.scripts.seed --data-dir /caminho/para/csvs
    .venv/bin/python -m app.scripts.seed --reset        # apaga os dados e recarrega

O schema precisa existir antes (``alembic upgrade head``).
"""

import argparse
import csv
import sys
import time
from collections.abc import Callable, Iterable, Iterator
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import Connection, Table, create_engine, delete, event, func, insert, select

from app.core.config import get_settings
from app.movies import models

BATCH_SIZE = 10_000
DEFAULT_DATA_DIR = Path(__file__).resolve().parents[3] / "data"

csv.field_size_limit(sys.maxsize)

Row = dict[str, Any]


# --- Conversões -----------------------------------------------------------------


def clean_text(value: str) -> str:
    """Remove aspas residuais de uma exportação CSV duplamente escapada.

    Alguns textos chegam com uma aspa inicial sobrando e aspas internas
    duplicadas; eles são normalizados e têm a primeira letra capitalizada.
    """

    if not value.startswith('"'):
        return value
    value = value[1:]
    if (value.endswith('"') and not value.endswith('""')) or value.endswith('"""'):
        value = value[:-1]
    value = value.replace('""', '"').strip()
    return value[:1].upper() + value[1:]


def optional_text(value: str) -> str | None:
    return clean_text(value) or None


def optional_int(value: str) -> int | None:
    return int(float(value)) if value else None


def optional_float(value: str) -> float | None:
    return float(value) if value else None


def optional_decimal(value: str) -> Decimal | None:
    return Decimal(value) if value else None


def optional_date(value: str) -> date | None:
    return date.fromisoformat(value) if value else None


# --- Leitura e escrita em lotes ---------------------------------------------------


def read_csv(data_dir: Path, name: str) -> Iterator[dict[str, str]]:
    with (data_dir / f"{name}.csv").open(newline="", encoding="utf-8") as file:
        yield from csv.DictReader(file)


def batched(rows: Iterable[Row]) -> Iterator[list[Row]]:
    batch: list[Row] = []
    for row in rows:
        batch.append(row)
        if len(batch) == BATCH_SIZE:
            yield batch
            batch = []
    if batch:
        yield batch


def load(
    conn: Connection, table: Table, rows: Iterable[Row], ignore_duplicates: bool = False
) -> int:
    statement = insert(table)
    if ignore_duplicates:
        statement = statement.prefix_with("OR IGNORE")

    total = 0
    started = time.perf_counter()
    for batch in batched(rows):
        conn.execute(statement, batch)
        total += len(batch)
    print(f"  {table.name:<25} {total:>9,} linhas  ({time.perf_counter() - started:.1f}s)")
    return total


def dedupe_dimension(
    rows: Iterable[dict[str, str]],
    pk: str,
    natural_key: Callable[[Row], tuple[str, ...]],
    transform: Callable[[dict[str, str]], Row],
) -> tuple[list[Row], dict[str, str]]:
    """Deduplica uma dimensão pela chave natural já limpa.

    Retorna as linhas únicas e um mapa ``sk antiga -> sk canônica`` usado para
    reescrever as tabelas ponte.
    """

    unique: dict[tuple[str, ...], Row] = {}
    aliases: dict[str, str] = {}
    for raw in rows:
        row = transform(raw)
        canonical = unique.setdefault(natural_key(row), row)
        aliases[row[pk]] = canonical[pk]
    return list(unique.values()), aliases


# --- Tabelas ----------------------------------------------------------------------


def movie_row(raw: dict[str, str]) -> Row:
    return {
        "sk_movie_id": raw["sk_movie_id"],
        "id_filme": raw["id_filme"],
        "titulo": clean_text(raw["titulo"]),
        "data_lancamento": optional_date(raw["data_lancamento"]),
        "ano_lancamento": optional_int(raw["ano_lancamento"]),
        "duracao_minutos": optional_int(raw["duracao_minutos"]),
        "status_filme": optional_text(raw["status_filme"]),
        "sinopse": optional_text(raw["sinopse"]),
        "url_poster": raw["url_poster"] or None,
        "url_backdrop": raw["url_backdrop"] or None,
    }


def performance_row(raw: dict[str, str]) -> Row:
    return {
        "sk_movie_id": raw["sk_movie_id"],
        "orcamento_usd": optional_decimal(raw["orcamento_usd"]),
        "receita_usd": optional_decimal(raw["receita_usd"]),
        "lucro_usd": optional_decimal(raw["lucro_usd"]) or Decimal(0),
        "orcamento_brl": optional_decimal(raw["orcamento_brl"]),
        "receita_brl": optional_decimal(raw["receita_brl"]),
        "lucro_brl": optional_decimal(raw["lucro_brl"]) or Decimal(0),
        "popularidade": optional_float(raw["popularidade"]),
        "nota_tmdb": optional_float(raw["nota_tmdb"]),
        "qtd_tmdb": optional_int(raw["qtd_tmdb"]),
        "nota_imdb": optional_float(raw["nota_imdb"]),
        "qtd_imdb": optional_int(raw["qtd_imdb"]),
    }


def review_summary_row(raw: dict[str, str]) -> Row:
    return {
        "sk_review_id": raw["sk_review_id"],
        "sk_movie_id": raw["sk_movie_id"],
        "qtd_avaliacoes_usuarios": optional_int(raw["qtd_avaliacoes_usuarios"]) or 0,
        "nota_media_usuarios": optional_float(raw["nota_media_usuarios"]),
    }


def movie_review_row(raw: dict[str, str]) -> Row:
    return {
        "sk_movie_review_id": raw["sk_movie_review_id"],
        "sk_movie_id": raw["sk_movie_id"],
        "nome": raw["nome"],
        "nota": float(raw["nota"]),
        "comentario": raw["comentario"],
    }


def bridge_rows(
    rows: Iterable[dict[str, str]], column: str, aliases: dict[str, str] | None = None
) -> Iterator[Row]:
    for raw in rows:
        target = raw[column]
        yield {
            "sk_movie_id": raw["sk_movie_id"],
            column: aliases.get(target, target) if aliases else target,
        }


TABLES_IN_DELETE_ORDER: tuple[Table, ...] = (
    models.MovieReview.__table__,
    models.DimReview.__table__,
    models.FactMoviePerformance.__table__,
    models.bridge_movie_person,
    models.bridge_movie_company,
    models.bridge_movie_genre,
    models.DimPerson.__table__,
    models.DimCompany.__table__,
    models.DimGenre.__table__,
    models.DimMovie.__table__,
)


def seed(conn: Connection, data_dir: Path) -> None:
    def csv_(name: str) -> Iterator[dict[str, str]]:
        return read_csv(data_dir, name)

    load(conn, models.DimMovie.__table__, map(movie_row, csv_("dim_movies")))
    load(
        conn,
        models.DimGenre.__table__,
        (
            {"sk_genre_id": r["sk_genre_id"], "nome_genero": clean_text(r["nome_genero"])}
            for r in csv_("dim_genres")
        ),
    )

    companies, company_aliases = dedupe_dimension(
        csv_("dim_companies"),
        pk="sk_company_id",
        natural_key=lambda r: (r["nome_produtora"],),
        transform=lambda r: {
            "sk_company_id": r["sk_company_id"],
            "nome_produtora": clean_text(r["nome_produtora"]),
        },
    )
    load(conn, models.DimCompany.__table__, companies)

    people, person_aliases = dedupe_dimension(
        csv_("dim_people"),
        pk="sk_person_id",
        natural_key=lambda r: (r["nome_pessoa"], r["tipo_pessoa"]),
        transform=lambda r: {
            "sk_person_id": r["sk_person_id"],
            "nome_pessoa": clean_text(r["nome_pessoa"]),
            "tipo_pessoa": r["tipo_pessoa"],
        },
    )
    load(conn, models.DimPerson.__table__, people)

    load(conn, models.bridge_movie_genre, bridge_rows(csv_("bridge_movie_genre"), "sk_genre_id"))
    # Ignora pares repetidos que surgem ao unificar produtoras/pessoas duplicadas.
    load(
        conn,
        models.bridge_movie_company,
        bridge_rows(csv_("bridge_movie_company"), "sk_company_id", company_aliases),
        ignore_duplicates=True,
    )
    load(
        conn,
        models.bridge_movie_person,
        bridge_rows(csv_("bridge_movie_person"), "sk_person_id", person_aliases),
        ignore_duplicates=True,
    )

    load(
        conn,
        models.FactMoviePerformance.__table__,
        map(performance_row, csv_("fact_movies_performance")),
    )
    load(conn, models.DimReview.__table__, map(review_summary_row, csv_("dim_reviews")))
    load(conn, models.MovieReview.__table__, map(movie_review_row, csv_("movies_reviews")))


def tune_sqlite_for_bulk_load(dbapi_connection: Any, connection_record: Any) -> None:
    """Acelera a carga: cache grande para os índices de chaves SHA-256 aleatórias
    e sem fsync. Se a carga falhar, basta rodá-la de novo com ``--reset``."""

    del connection_record
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA cache_size = -524288")  # 512 MB
    cursor.execute("PRAGMA synchronous = OFF")
    cursor.execute("PRAGMA journal_mode = MEMORY")
    cursor.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Carrega os CSVs iniciais no banco de dados.")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument(
        "--reset", action="store_true", help="apaga os dados existentes antes da carga"
    )
    args = parser.parse_args()

    if not (args.data_dir / "dim_movies.csv").exists():
        sys.exit(f"CSVs não encontrados em {args.data_dir}. Use --data-dir para indicar a pasta.")

    database_url = get_settings().database_url.replace("+aiosqlite", "")
    engine = create_engine(database_url)
    event.listen(engine, "connect", tune_sqlite_for_bulk_load)

    with engine.begin() as conn:
        has_data = conn.execute(
            select(func.count()).select_from(models.DimMovie.__table__)
        ).scalar()
        if has_data and not args.reset:
            sys.exit("O banco já possui filmes. Use --reset para apagar e recarregar.")
        if args.reset:
            for table in TABLES_IN_DELETE_ORDER:
                conn.execute(delete(table))

        print(f"Carregando CSVs de {args.data_dir}")
        started = time.perf_counter()
        seed(conn, args.data_dir)

    print(f"Carga concluída em {time.perf_counter() - started:.1f}s")


if __name__ == "__main__":
    main()
