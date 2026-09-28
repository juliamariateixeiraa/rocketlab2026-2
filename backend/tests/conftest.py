from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import enable_sqlite_foreign_keys, get_db
from app.main import app
from app.movies.models import DimGenre

GENRES = ("Action", "Comedy", "Drama", "Horror")


@pytest.fixture
async def session_factory(tmp_path: Path) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    """Banco SQLite isolado por teste, com alguns gêneros cadastrados."""

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    enable_sqlite_foreign_keys(engine)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    async with factory() as session:
        session.add_all(DimGenre(nome_genero=name) for name in GENRES)
        await session.commit()

    yield factory
    await engine.dispose()


@pytest.fixture
async def client(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[httpx.AsyncClient]:
    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1") as client:
        yield client
    app.dependency_overrides.clear()
