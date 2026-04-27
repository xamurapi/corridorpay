import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None = None
    country_iso2: str | None = None
    preferred_lang: str
    role: str
    status: str
    kyc_tier: int
    email_verified: bool
    phone_verified: bool
    created_at: datetime


class MeUpdate(BaseModel):
    full_name: str | None = None
    country_iso2: str | None = None
    preferred_lang: str | None = None
