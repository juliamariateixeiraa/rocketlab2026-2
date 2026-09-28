"""Schemas Pydantic de entrada e saída da API de filmes."""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


class MovieSort(StrEnum):
    POPULARIDADE = "popularidade"
    TITULO = "titulo"
    MAIS_RECENTES = "mais_recentes"
    MAIS_ANTIGOS = "mais_antigos"


class RatingSummary(BaseModel):
    """Média e quantidade de avaliações individuais (escala 0–10)."""

    nota_media: float | None = None
    qtd_avaliacoes: int = 0


class MovieListItem(RatingSummary):
    sk_movie_id: str
    titulo: str
    ano_lancamento: int | None
    url_poster: str | None
    generos: list[str]


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sk_movie_review_id: str
    nome: str
    nota: float
    comentario: str
    created_at: datetime

    @field_serializer("created_at")
    def as_utc(self, value: datetime) -> datetime:
        """O SQLite grava ``CURRENT_TIMESTAMP`` em UTC, porém sem fuso."""

        return value if value.tzinfo else value.replace(tzinfo=UTC)


class ReviewCreate(BaseModel):
    """Nova avaliação na escala do banco (0–10); o front converte 1–5 estrelas."""

    nome: str = Field(min_length=1, max_length=120)
    nota: float = Field(ge=0, le=10)
    comentario: str = Field(min_length=1, max_length=4000)

    @field_validator("nome", "comentario")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("o campo não pode ficar em branco")
        return value


class MovieDetail(RatingSummary):
    sk_movie_id: str
    id_filme: str
    titulo: str
    data_lancamento: date | None
    ano_lancamento: int | None
    duracao_minutos: int | None
    status_filme: str | None
    sinopse: str | None
    url_poster: str | None
    url_backdrop: str | None
    generos: list[str]
    diretores: list[str]
    roteiristas: list[str]
    elenco: list[str]
    produtoras: list[str]
    avaliacoes: list[ReviewRead]


class MovieWrite(BaseModel):
    """Dados aceitos no cadastro (POST) e na atualização (PUT) de um filme."""

    titulo: str = Field(min_length=1, max_length=500)
    diretores: list[str] = Field(default_factory=list)
    ano_lancamento: int | None = Field(default=None, ge=1870, le=2100)
    generos: list[str] = Field(default_factory=list)
    sinopse: str | None = Field(default=None, max_length=4000)
    duracao_minutos: int | None = Field(default=None, gt=0, le=1000)
    data_lancamento: date | None = None
    status_filme: str | None = Field(default=None, max_length=50)
    url_poster: str | None = Field(default=None, max_length=2048)
    url_backdrop: str | None = Field(default=None, max_length=2048)

    @field_validator("titulo")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("o título não pode ficar em branco")
        return value

    @field_validator("diretores", "generos")
    @classmethod
    def clean_names(cls, values: list[str]) -> list[str]:
        """Remove espaços, vazios e repetições preservando a ordem."""

        return list(dict.fromkeys(v.strip() for v in values if v.strip()))


class GenreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sk_genre_id: str
    nome_genero: str
