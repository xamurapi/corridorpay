import uuid
from pydantic import BaseModel, ConfigDict


class WalletOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    currency: str
    balance: int
    blocked: int
    available: int
    status: str


class WalletCreate(BaseModel):
    currency: str
