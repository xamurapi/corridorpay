from fastapi import APIRouter
from app.api.v1.public.routes import router as public_routes

router = APIRouter()
router.include_router(public_routes)
