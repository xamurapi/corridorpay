from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

# Sentinel dev secret — must never reach a production deployment.
DEV_JWT_SECRET = "dev-secret-change-me-please-min-32-chars-long-x"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "local"
    APP_NAME: str = "corridorpay"

    DATABASE_URL: str = "postgresql+asyncpg://corridorpay:corridorpay@localhost:5434/corridorpay"

    JWT_SECRET: str = DEV_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MIN: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3030"

    LOG_LEVEL: str = "INFO"

    OTP_TTL_SEC: int = 300
    FX_LOCK_TTL_SEC: int = 300

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def _validate_production(self) -> None:
        # Refuse to boot a production instance with a weak or default signing key.
        if self.APP_ENV in ("production", "prod"):
            if self.JWT_SECRET == DEV_JWT_SECRET:
                raise RuntimeError(
                    "JWT_SECRET is still the default dev value in a production environment. "
                    "Set a strong unique JWT_SECRET (min 32 chars)."
                )
            if len(self.JWT_SECRET) < 32:
                raise RuntimeError(
                    "JWT_SECRET is too short for production (min 32 chars). "
                    f"Got {len(self.JWT_SECRET)} chars."
                )


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s._validate_production()
    return s


settings = get_settings()
