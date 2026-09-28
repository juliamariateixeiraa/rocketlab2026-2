from fastapi import APIRouter

from app.movies.router import genres_router, reviews_router, stats_router
from app.movies.router import router as movies_router

api_router = APIRouter()

api_router.include_router(movies_router, prefix="/movies", tags=["movies"])
api_router.include_router(genres_router, prefix="/genres", tags=["genres"])
api_router.include_router(reviews_router, prefix="/reviews", tags=["reviews"])
api_router.include_router(stats_router, prefix="/stats", tags=["stats"])
