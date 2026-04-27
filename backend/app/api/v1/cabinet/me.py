from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import MeUpdate, UserOut

router = APIRouter(prefix="/me", tags=["cabinet"])


@router.get("", response_model=UserOut)
async def get_me(current: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current)


@router.patch("", response_model=UserOut)
async def update_me(
    payload: MeUpdate,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    if payload.full_name is not None:
        current.full_name = payload.full_name
    if payload.country_iso2 is not None:
        current.country_iso2 = payload.country_iso2.upper()
    if payload.preferred_lang is not None:
        current.preferred_lang = payload.preferred_lang.lower()
    await db.commit()
    await db.refresh(current)
    return UserOut.model_validate(current)


@router.get("/limits")
async def get_limits(current: User = Depends(get_current_user)) -> dict:
    tiers = {
        0: {"daily_usd": 0, "monthly_usd": 0, "label": "Не верифицирован"},
        1: {"daily_usd": 200, "monthly_usd": 1000, "label": "Tier 1 — Email + телефон"},
        2: {"daily_usd": 3000, "monthly_usd": 15000, "label": "Tier 2 — Паспорт + селфи"},
        3: {"daily_usd": 50000, "monthly_usd": 250000, "label": "Tier 3 — Бизнес"},
    }
    return {"tier": current.kyc_tier, **tiers[current.kyc_tier]}
