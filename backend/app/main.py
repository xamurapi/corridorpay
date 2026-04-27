import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, ORJSONResponse

from app.core.config import settings

logging.basicConfig(level=settings.LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
log = logging.getLogger("corridorpay")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting CorridorPay API · env=%s", settings.APP_ENV)
    yield
    log.info("Shutting down")


app = FastAPI(
    title="CorridorPay API",
    version="1.0.0",
    description="Cross-border payments orchestrator over 12 corridors.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id", "X-RateLimit-Remaining"],
)


@app.middleware("http")
async def request_id_and_timing(request: Request, call_next):
    rid = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        log.exception("Unhandled error rid=%s", rid)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal.unhandled",
                    "message": "Internal server error",
                    "request_id": rid,
                }
            },
        )
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-Id"] = rid
    response.headers["X-CorridorPay-Version"] = "1.0.0"
    log.info("%s %s -> %d (%.1fms) rid=%s", request.method, request.url.path, response.status_code, elapsed_ms, rid)
    return response


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "env": settings.APP_ENV, "service": settings.APP_NAME}


# === routers ===
from app.api.v1.public import router as public_router  # noqa: E402
from app.api.v1.auth import router as auth_router  # noqa: E402
from app.api.v1.cabinet import router as cabinet_router  # noqa: E402
from app.api.admin import router as admin_router  # noqa: E402

app.include_router(public_router, prefix="/v1/public", tags=["public"])
app.include_router(auth_router, prefix="/v1/auth", tags=["auth"])
app.include_router(cabinet_router, prefix="/v1", tags=["cabinet"])
app.include_router(admin_router, prefix="/admin/v1", tags=["admin"])
