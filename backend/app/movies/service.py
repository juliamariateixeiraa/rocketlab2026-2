"""Consultas e regras de negócio do catálogo de filmes."""

import math
from uuid import uuid4

from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.movies.models import (
    DimGenre,
    DimMovie,
    DimPerson,
    FactMoviePerformance,
    MovieReview,
    bridge_movie_genre,
)
from app.movies.schemas import (
    GenreRead,
    MovieDetail,
    MovieListItem,
    MovieSort,
    MovieWrite,
    Page,
    RatingSummary,
    ReviewRead,
)

DIRETOR = "Diretor"


class UnknownGenresError(ValueError):
    def __init__(self, names: list[str]) -> None:
        super().__init__(f"Gêneros inexistentes: {', '.join(names)}")
        self.names = names


# --- Leitura ----------------------------------------------------------------------


async def list_genres(session: AsyncSession) -> list[GenreRead]:
    genres = await session.scalars(select(DimGenre).order_by(DimGenre.nome_genero))
    return [GenreRead.model_validate(genre) for genre in genres]


async def rating_summaries(session: AsyncSession, movie_ids: list[str]) -> dict[str, RatingSummary]:
    """Calcula média e quantidade de avaliações a partir de ``movie_reviews``."""

    if not movie_ids:
        return {}
    rows = await session.execute(
        select(MovieReview.sk_movie_id, func.avg(MovieReview.nota), func.count())
        .where(MovieReview.sk_movie_id.in_(movie_ids))
        .group_by(MovieReview.sk_movie_id)
    )
    return {
        movie_id: RatingSummary(nota_media=round(avg, 2), qtd_avaliacoes=count)
        for movie_id, avg, count in rows
    }


def _apply_sort(query: Select, sort: MovieSort) -> Select:
    match sort:
        case MovieSort.POPULARIDADE:
            # Todo filme tem uma linha de desempenho (ver create_movie); o JOIN
            # interno deixa o SQLite usar o índice (popularidade, sk_movie_id).
            # Em ordem decrescente o SQLite já coloca os NULLs por último.
            return query.join(FactMoviePerformance).order_by(
                FactMoviePerformance.popularidade.desc(), FactMoviePerformance.sk_movie_id.desc()
            )
        case MovieSort.TITULO:
            return query.order_by(DimMovie.titulo)
        case MovieSort.MAIS_RECENTES:
            return query.order_by(DimMovie.ano_lancamento.desc().nulls_last(), DimMovie.titulo)
        case MovieSort.MAIS_ANTIGOS:
            return query.order_by(DimMovie.ano_lancamento.asc().nulls_last(), DimMovie.titulo)


async def list_movies(
    session: AsyncSession,
    *,
    busca: str | None,
    genero: str | None,
    ano: int | None,
    ordenar: MovieSort,
    page: int,
    page_size: int,
) -> Page[MovieListItem]:
    filters = []
    if busca and busca.strip():
        filters.append(DimMovie.titulo.icontains(busca.strip(), autoescape=True))
    if genero:
        filters.append(
            DimMovie.sk_movie_id.in_(
                select(bridge_movie_genre.c.sk_movie_id)
                .join(DimGenre)
                .where(func.lower(DimGenre.nome_genero) == genero.lower())
            )
        )
    if ano is not None:
        filters.append(DimMovie.ano_lancamento == ano)

    total = await session.scalar(select(func.count()).select_from(DimMovie).where(*filters))
    assert total is not None

    page_query = _apply_sort(select(DimMovie).where(*filters), ordenar)
    movies = (
        await session.scalars(
            page_query.options(selectinload(DimMovie.genres))
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
    ).all()
    ratings = await rating_summaries(session, [m.sk_movie_id for m in movies])

    items = [
        MovieListItem(
            sk_movie_id=movie.sk_movie_id,
            titulo=movie.titulo,
            ano_lancamento=movie.ano_lancamento,
            url_poster=movie.url_poster,
            generos=[genre.nome_genero for genre in movie.genres],
            **ratings.get(movie.sk_movie_id, RatingSummary()).model_dump(),
        )
        for movie in movies
    ]
    return Page(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size),
    )


async def _load_movie(session: AsyncSession, movie_id: str) -> DimMovie | None:
    return await session.scalar(
        select(DimMovie)
        .where(DimMovie.sk_movie_id == movie_id)
        .options(
            selectinload(DimMovie.genres),
            selectinload(DimMovie.companies),
            selectinload(DimMovie.people),
            selectinload(DimMovie.reviews),
        )
        .execution_options(populate_existing=True)
    )


async def get_movie(session: AsyncSession, movie_id: str) -> MovieDetail | None:
    movie = await _load_movie(session, movie_id)
    if movie is None:
        return None

    def people_of(tipo: str) -> list[str]:
        return sorted(p.nome_pessoa for p in movie.people if p.tipo_pessoa == tipo)

    rating = (await rating_summaries(session, [movie_id])).get(movie_id, RatingSummary())
    return MovieDetail(
        sk_movie_id=movie.sk_movie_id,
        id_filme=movie.id_filme,
        titulo=movie.titulo,
        data_lancamento=movie.data_lancamento,
        ano_lancamento=movie.ano_lancamento,
        duracao_minutos=movie.duracao_minutos,
        status_filme=movie.status_filme,
        sinopse=movie.sinopse,
        url_poster=movie.url_poster,
        url_backdrop=movie.url_backdrop,
        generos=[genre.nome_genero for genre in movie.genres],
        diretores=people_of(DIRETOR),
        roteiristas=people_of("Roteirista"),
        elenco=people_of("Ator"),
        produtoras=[company.nome_produtora for company in movie.companies],
        avaliacoes=[
            ReviewRead.model_validate(review)
            for review in sorted(movie.reviews, key=lambda r: r.created_at, reverse=True)
        ],
        **rating.model_dump(),
    )


# --- Escrita ----------------------------------------------------------------------


async def _resolve_genres(session: AsyncSession, names: list[str]) -> list[DimGenre]:
    if not names:
        return []
    by_name = {
        genre.nome_genero.lower(): genre
        for genre in await session.scalars(
            select(DimGenre).where(func.lower(DimGenre.nome_genero).in_([n.lower() for n in names]))
        )
    }
    missing = [name for name in names if name.lower() not in by_name]
    if missing:
        raise UnknownGenresError(missing)
    return [by_name[name.lower()] for name in names]


async def _get_or_create_directors(session: AsyncSession, names: list[str]) -> list[DimPerson]:
    """Reaproveita diretores já cadastrados (sem diferenciar maiúsculas) ou cria novos."""

    directors = []
    for name in names:
        person = await session.scalar(
            select(DimPerson)
            .where(
                # O lower() do SQLite só trata ASCII: sem a comparação exata,
                # "Ángel" não seria encontrado e violaria a restrição única.
                or_(
                    DimPerson.nome_pessoa == name, func.lower(DimPerson.nome_pessoa) == name.lower()
                ),
                DimPerson.tipo_pessoa == DIRETOR,
            )
            .order_by(DimPerson.nome_pessoa != name)
            .limit(1)
        )
        if person is None:
            person = DimPerson(nome_pessoa=name, tipo_pessoa=DIRETOR)
            session.add(person)
        directors.append(person)
    return directors


def _apply_fields(movie: DimMovie, data: MovieWrite) -> None:
    movie.titulo = data.titulo
    movie.sinopse = data.sinopse
    movie.duracao_minutos = data.duracao_minutos
    movie.status_filme = data.status_filme
    movie.url_poster = data.url_poster
    movie.url_backdrop = data.url_backdrop
    movie.data_lancamento = data.data_lancamento
    movie.ano_lancamento = (
        data.data_lancamento.year if data.data_lancamento else data.ano_lancamento
    )


async def create_movie(session: AsyncSession, data: MovieWrite) -> MovieDetail:
    movie = DimMovie(id_filme=f"local-{uuid4().hex[:12]}")
    _apply_fields(movie, data)
    movie.genres = await _resolve_genres(session, data.generos)
    movie.people = await _get_or_create_directors(session, data.diretores)
    movie.performance = FactMoviePerformance()
    session.add(movie)
    await session.commit()

    detail = await get_movie(session, movie.sk_movie_id)
    assert detail is not None
    return detail


async def update_movie(
    session: AsyncSession, movie_id: str, data: MovieWrite
) -> MovieDetail | None:
    movie = await _load_movie(session, movie_id)
    if movie is None:
        return None

    _apply_fields(movie, data)
    movie.genres = await _resolve_genres(session, data.generos)
    # Só os diretores são editáveis; elenco e roteiristas importados são mantidos.
    others = [person for person in movie.people if person.tipo_pessoa != DIRETOR]
    movie.people = others + await _get_or_create_directors(session, data.diretores)
    await session.commit()

    return await get_movie(session, movie_id)


async def delete_movie(session: AsyncSession, movie_id: str) -> bool:
    """Remove o filme; avaliações, métricas e vínculos caem por ON DELETE CASCADE."""

    result = await session.execute(delete(DimMovie).where(DimMovie.sk_movie_id == movie_id))
    await session.commit()
    return result.rowcount > 0
