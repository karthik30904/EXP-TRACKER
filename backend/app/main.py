from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import get_logger, setup_logging
from app.db.session import database_ready
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.routers import auth, expenses, stats
from app.services.auth import auth_service
from app.services.expense import expense_service

setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="Expense tracking REST API with JWT auth and RBAC",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)

app.include_router(expenses.router, prefix=settings.api_v1_prefix)
app.include_router(stats.router, prefix=settings.api_v1_prefix)
app.include_router(auth.router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def bootstrap_phase3_demo_data() -> None:
    if not settings.seed_demo_accounts:
        return

    for bootstrapper in (
        getattr(expense_service.repository, "ensure_seed_expenses", None),
        auth_service.ensure_demo_accounts,
    ):
        try:
            if callable(bootstrapper):
                bootstrapper()
        except Exception as exc:  # pragma: no cover - startup safety net
            logger.warning("bootstrap_skipped", error=str(exc))


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str | bool]:
    """Health check endpoint for Docker and integration tests."""
    using_database = settings.use_database and bool(settings.database_url)
    storage_mode = "database" if using_database else "memory"
    database_ok = database_ready() if using_database else False
    status_value = "healthy" if not using_database or database_ok else "degraded"
    return {"status": status_value, "storage": storage_mode, "database_ready": database_ok}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(
        "http_exception",
        status_code=exc.status_code,
        detail=exc.detail,
        request_id=request_id,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id, "type": "HTTPException"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.warning(
        "validation_error",
        errors=exc.errors(),
        request_id=request_id,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "request_id": request_id,
            "type": "ValidationError",
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception(
        "unhandled_exception",
        error=str(exc),
        request_id=request_id,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
            "type": type(exc).__name__,
        },
    )
