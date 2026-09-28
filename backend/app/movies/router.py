from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.movies import service
from app.movies.schemas import (
    CatalogStats,
    GenreRead,
    MovieDetail,
    MovieListItem,
    MovieSort,
    MovieWrite,
    Page,
    ReviewCreate,
    ReviewFeedItem,
    ReviewRead,
)

router = APIRouter()
genres_router = APIRouter()
reviews_router = APIRouter()
stats_router = APIRouter()

Session = Annotated[AsyncSession, Depends(get_db)]


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Filme não encontrado")


def _unknown_genres(error: service.UnknownGenresError) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error))


@genres_router.get("", response_model=list[GenreRead])
async def list_genres(session: Session) -> list[GenreRead]:
    return await service.list_genres(session)


@router.get("", response_model=Page[MovieListItem])
async def list_movies(
    session: Session,
    busca: Annotated[str | None, Query(max_length=200, description="Trecho do título")] = None,
    genero: Annotated[str | None, Query(description="Nome do gênero")] = None,
    ano: Annotated[int | None, Query(description="Ano de lançamento")] = None,
    min_avaliacoes: Annotated[
        int, Query(ge=0, description="Só filmes com pelo menos N avaliações")
    ] = 0,
    ordenar: MovieSort = MovieSort.POPULARIDADE,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Page[MovieListItem]:
    return await service.list_movies(
        session,
        busca=busca,
        genero=genero,
        ano=ano,
        min_avaliacoes=min_avaliacoes,
        ordenar=ordenar,
        page=page,
        page_size=page_size,
    )


@router.get("/{movie_id}", response_model=MovieDetail)
async def get_movie(movie_id: str, session: Session) -> MovieDetail:
    movie = await service.get_movie(session, movie_id)
    if movie is None:
        raise _not_found()
    return movie


@router.post("", response_model=MovieDetail, status_code=status.HTTP_201_CREATED)
async def create_movie(data: MovieWrite, session: Session) -> MovieDetail:
    try:
        return await service.create_movie(session, data)
    except service.UnknownGenresError as error:
        raise _unknown_genres(error) from error


@router.put("/{movie_id}", response_model=MovieDetail)
async def update_movie(movie_id: str, data: MovieWrite, session: Session) -> MovieDetail:
    try:
        movie = await service.update_movie(session, movie_id, data)
    except service.UnknownGenresError as error:
        raise _unknown_genres(error) from error
    if movie is None:
        raise _not_found()
    return movie


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movie(movie_id: str, session: Session) -> Response:
    if not await service.delete_movie(session, movie_id):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{movie_id}/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def add_review(movie_id: str, data: ReviewCreate, session: Session) -> ReviewRead:
    review = await service.add_review(session, movie_id, data)
    if review is None:
        raise _not_found()
    return review


@reviews_router.get("", response_model=Page[ReviewFeedItem])
async def list_reviews(
    session: Session,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Page[ReviewFeedItem]:
    return await service.list_reviews(session, page=page, page_size=page_size)


@stats_router.get("", response_model=CatalogStats)
async def catalog_stats(session: Session) -> CatalogStats:
    return await service.catalog_stats(session)
