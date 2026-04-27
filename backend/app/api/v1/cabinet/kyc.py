import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.kyc import KycApplication, KycDocument
from app.models.user import User

router = APIRouter(prefix="/kyc", tags=["cabinet"])


class KycIn(BaseModel):
    tier: int = Field(ge=1, le=3)
    metadata: dict = Field(default_factory=dict)


class KycDocOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    doc_type: str
    file_name: str
    status: str
    created_at: datetime


class KycAppOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tier: int
    status: str
    provider: str
    submitted_at: datetime | None
    decided_at: datetime | None
    created_at: datetime


@router.get("/applications", response_model=list[KycAppOut])
async def list_apps(current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[KycAppOut]:
    res = await db.execute(
        select(KycApplication).where(KycApplication.user_id == current.id).order_by(KycApplication.created_at.desc())
    )
    return [KycAppOut.model_validate(a) for a in res.scalars().all()]


@router.post("/applications", response_model=KycAppOut, status_code=201)
async def create_app(payload: KycIn, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> KycAppOut:
    app = KycApplication(
        id=uuid.uuid4(),
        user_id=current.id,
        tier=payload.tier,
        status="pending",
        provider="manual",
        submitted_at=datetime.now(timezone.utc),
        metadata_json=payload.metadata,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return KycAppOut.model_validate(app)


class DocIn(BaseModel):
    doc_type: str
    file_name: str


@router.post("/applications/{app_id}/documents", response_model=KycDocOut, status_code=201)
async def upload_doc(app_id: uuid.UUID, payload: DocIn, current: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> KycDocOut:
    res = await db.execute(select(KycApplication).where(KycApplication.id == app_id, KycApplication.user_id == current.id))
    app = res.scalar_one_or_none()
    if not app:
        raise errors.not_found("kyc.not_found", "Application not found")
    doc = KycDocument(
        id=uuid.uuid4(),
        application_id=app.id,
        doc_type=payload.doc_type,
        file_name=payload.file_name,
        status="uploaded",
    )
    db.add(doc)
    if app.status == "pending":
        app.status = "review"
    await db.commit()
    await db.refresh(doc)
    return KycDocOut.model_validate(doc)
