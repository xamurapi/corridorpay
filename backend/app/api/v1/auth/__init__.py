from fastapi import APIRouter

from app.api.v1.auth.routes import router as auth_routes

router = APIRouter()
router.include_router(auth_routes)
