import secrets
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.user import OTP


def _gen_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def issue_otp(db: AsyncSession, *, target: str, purpose: str) -> tuple[OTP, str]:
    code = _gen_code()
    otp = OTP(
        id=uuid.uuid4(),
        target=target.lower().strip(),
        purpose=purpose,
        code_hash=hash_password(code),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.OTP_TTL_SEC),
    )
    db.add(otp)
    await db.flush()
    return otp, code


async def consume_otp(db: AsyncSession, *, target: str, code: str, purpose: str) -> bool:
    target = target.lower().strip()
    res = await db.execute(
        select(OTP)
        .where(OTP.target == target, OTP.purpose == purpose, OTP.consumed == False)  # noqa: E712
        .order_by(OTP.created_at.desc())
        .limit(1)
    )
    otp = res.scalar_one_or_none()
    if not otp:
        return False
    if otp.expires_at < datetime.now(timezone.utc):
        return False
    if otp.attempts >= 5:
        return False
    otp.attempts += 1
    if not verify_password(code, otp.code_hash):
        await db.flush()
        return False
    otp.consumed = True
    await db.flush()
    return True
