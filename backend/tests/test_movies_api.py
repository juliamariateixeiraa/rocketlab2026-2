from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.movies.models import DimPerson, MovieReview


async def create_movie(client: httpx.AsyncClient, **fields: Any) -> dict[str, Any]:
    response = await client.post("/movies", json={"titulo": "Filme", **fields})
    assert response.status_code == 201, response.text
    return response.json()


async def test_create_and_get_movie(client: httpx.AsyncClient) -> None:
    created = await create_movie(
        client,
        titulo="  Duna  ",
        diretores=["Denis Villeneuve", " ", "Denis Villeneuve"],
        ano_lancamento=2021,
        generos=["drama", "Action"],
        sinopse="Um jovem nobre em um planeta desértico.",
    )

    assert created["titulo"] == "Duna"
    assert created["diretores"] == ["Denis Villeneuve"]
    assert created["generos"] == ["Action", "Drama"]
    assert created["nota_media"] is None
    assert created["qtd_avaliacoes"] == 0

    response = await client.get(f"/movies/{created['sk_movie_id']}")
    assert response.status_code == 200
    assert response.json() == created


async def test_create_rejects_unknown_genre_and_blank_title(client: httpx.AsyncClient) -> None:
    response = await client.post("/movies", json={"titulo": "X", "generos": ["Novela"]})
    assert response.status_code == 422
    assert "Novela" in response.json()["detail"]

    response = await client.post("/movies", json={"titulo": "   "})
    assert response.status_code == 422


async def test_list_paginates_and_searches(client: httpx.AsyncClient) -> None:
    for title in ("Alien", "Aliens", "Blade Runner", "Alien 3", "Matrix"):
        await create_movie(client, titulo=title, generos=["Horror"] if "Alien" in title else [])

    page = (await client.get("/movies", params={"page_size": 2, "page": 2})).json()
    assert page["total"] == 5
    assert page["pages"] == 3
    assert len(page["items"]) == 2

    found = (await client.get("/movies", params={"busca": "alien", "ordenar": "titulo"})).json()
    assert [m["titulo"] for m in found["items"]] == ["Alien", "Alien 3", "Aliens"]

    by_genre = (await client.get("/movies", params={"genero": "horror"})).json()
    assert by_genre["total"] == 3


async def test_search_treats_wildcards_literally(client: httpx.AsyncClient) -> None:
    await create_movie(client, titulo="100% Lobo")
    await create_movie(client, titulo="1000 Lobos")

    found = (await client.get("/movies", params={"busca": "100%"})).json()
    assert [m["titulo"] for m in found["items"]] == ["100% Lobo"]


async def test_update_replaces_fields_and_reuses_directors(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    movie = await create_movie(client, diretores=["Ángel Manuel Soto"], generos=["Action"])

    response = await client.put(
        f"/movies/{movie['sk_movie_id']}",
        json={
            "titulo": "Novo título",
            "diretores": ["Ángel Manuel Soto", "Greta Gerwig"],
            "generos": ["Comedy"],
            "data_lancamento": "2020-05-01",
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["titulo"] == "Novo título"
    assert updated["diretores"] == ["Greta Gerwig", "Ángel Manuel Soto"]
    assert updated["generos"] == ["Comedy"]
    assert updated["ano_lancamento"] == 2020

    async with session_factory() as session:
        count = await session.scalar(
            select(func.count()).where(DimPerson.nome_pessoa == "Ángel Manuel Soto")
        )
    assert count == 1


async def test_rating_average_comes_from_reviews(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    movie = await create_movie(client)
    async with session_factory() as session:
        session.add_all(
            MovieReview(sk_movie_id=movie["sk_movie_id"], nome="Ana", nota=nota, comentario="ok")
            for nota in (8, 9, 10)
        )
        await session.commit()

    detail = (await client.get(f"/movies/{movie['sk_movie_id']}")).json()
    assert detail["nota_media"] == 9
    assert detail["qtd_avaliacoes"] == 3
    assert len(detail["avaliacoes"]) == 3

    listed = (await client.get("/movies")).json()["items"][0]
    assert listed["nota_media"] == 9


async def test_delete_removes_movie_and_reviews(
    client: httpx.AsyncClient, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    movie = await create_movie(client)
    async with session_factory() as session:
        session.add(MovieReview(sk_movie_id=movie["sk_movie_id"], nome="A", nota=5, comentario="c"))
        await session.commit()

    assert (await client.delete(f"/movies/{movie['sk_movie_id']}")).status_code == 204
    assert (await client.get(f"/movies/{movie['sk_movie_id']}")).status_code == 404
    assert (await client.delete(f"/movies/{movie['sk_movie_id']}")).status_code == 404

    async with session_factory() as session:
        assert await session.scalar(select(func.count()).select_from(MovieReview)) == 0


async def test_unknown_movie_returns_404(client: httpx.AsyncClient) -> None:
    assert (await client.get("/movies/nao-existe")).status_code == 404
    response = await client.put("/movies/nao-existe", json={"titulo": "X"})
    assert response.status_code == 404


async def test_list_genres(client: httpx.AsyncClient) -> None:
    genres = (await client.get("/genres")).json()
    assert [g["nome_genero"] for g in genres] == ["Action", "Comedy", "Drama", "Horror"]
