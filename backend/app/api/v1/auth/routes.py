import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import Session as UserSession
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.auth import (
    LoginIn,
    OtpSentOut,
    RefreshIn,
    SignupIn,
    TokenPair,
    VerifyOtpIn,
)
from app.schemas.user import UserOut
from app.services.otp import consume_otp, issue_otp

router = APIRouter()


def _is_dev() -> bool:
    return settings.APP_ENV in ("local", "dev", "test")


def _make_token_pair(user: User, db: AsyncSession, *, ip: str | None = None, ua: str | None = None) -> TokenPair:
    jti = uuid.uuid4().hex
    access = create_access_token(sub=str(user.id), role=user.role, kyc_tier=user.kyc_tier)
    refresh = create_refresh_token(sub=str(user.id), jti=jti)
    db.add(
        UserSession(
            id=uuid.uuid4(),
            user_id=user.id,
            refresh_jti=jti,
            user_agent=ua,
            ip=ip,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS),
        )
    )
    return TokenPair(access_token=access, refresh_token=refresh, expires_in=settings.ACCESS_TOKEN_TTL_MIN * 60)


@router.post("/signup", response_model=OtpSentOut)
async def signup(payload: SignupIn, request: Request, db: AsyncSession = Depends(get_db)) -> OtpSentOut:
    email = payload.email.lower()
    existing = await db.execute(select(User).where(User.email == email))
    user = existing.scalar_one_or_none()
    if user is None:
        user = User(
            id=uuid.uuid4(),
            email=email,
            full_name=payload.full_name,
            country_iso2=payload.country_iso2.upper(),
            preferred_lang=payload.preferred_lang.lower(),
            password_hash=hash_password(payload.password) if payload.password else None,
            referral_code=uuid.uuid4().hex[:8].upper(),
        )
        db.add(user)
        await db.flush()
        # auto-create wallets in user's country currency + USD
        for ccy in {"USD"}:
            db.add(Wallet(id=uuid.uuid4(), user_id=user.id, currency=ccy))
    elif user.email_verified:
        # already verified -> still OK to re-issue login OTP
        pass

    _, code = await issue_otp(db, target=email, purpose="signup")
    await db.commit()
    return OtpSentOut(target=email, purpose="signup", debug_code=code if _is_dev() else None)


@router.post("/verify-otp", response_model=TokenPair)
async def verify_otp(payload: VerifyOtpIn, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    target = payload.target.lower().strip()
    ok = await consume_otp(db, target=target, code=payload.code, purpose=payload.purpose)
    if not ok:
        raise errors.bad_request("auth.otp_invalid", "OTP invalid or expired")
    res = await db.execute(select(User).where(User.email == target))
    user = res.scalar_one_or_none()
    if not user:
        raise errors.not_found("auth.user_not_found", "User not found")
    if payload.purpose == "signup":
        user.email_verified = True
        if user.kyc_tier < 1:
            user.kyc_tier = 1
    user.last_login_at = datetime.now(timezone.utc)
    user.last_login_ip = request.client.host if request.client else None
    pair = _make_token_pair(user, db, ip=user.last_login_ip, ua=request.headers.get("user-agent"))
    await db.commit()
    return pair


@router.post("/login", response_model=OtpSentOut | TokenPair)
async def login(payload: LoginIn, request: Request, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise errors.unauthorized("auth.invalid_credentials", "Invalid credentials")

    # Password path
    if payload.password:
        if not user.password_hash or not verify_password(payload.password, user.password_hash):
            raise errors.unauthorized("auth.invalid_credentials", "Invalid credentials")
        user.last_login_at = datetime.now(timezone.utc)
        pair = _make_token_pair(user, db, ip=request.client.host if request.client else None, ua=request.headers.get("user-agent"))
        await db.commit()
        return pair

    # OTP-verify path
    if payload.otp:
        ok = await consume_otp(db, target=email, code=payload.otp, purpose="login")
        if not ok:
            raise errors.unauthorized("auth.otp_invalid", "OTP invalid or expired")
        pair = _make_token_pair(user, db, ip=request.client.host if request.client else None, ua=request.headers.get("user-agent"))
        await db.commit()
        return pair

    # Send OTP path
    _, code = await issue_otp(db, target=email, purpose="login")
    await db.commit()
    return OtpSentOut(target=email, purpose="login", debug_code=code if _is_dev() else None)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshIn, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    try:
        data = decode_token(payload.refresh_token)
    except ValueError:
        raise errors.unauthorized("auth.invalid_refresh", "Invalid refresh token")
    if data.get("type") != "refresh":
        raise errors.unauthorized("auth.wrong_token_type", "Wrong token type")
    sub, jti = data.get("sub"), data.get("jti")
    if not (sub and jti):
        raise errors.unauthorized("auth.invalid_refresh", "Invalid refresh token")

    res = await db.execute(select(UserSession).where(UserSession.refresh_jti == jti))
    sess = res.scalar_one_or_none()
    if not sess or sess.revoked or sess.expires_at < datetime.now(timezone.utc):
        raise errors.unauthorized("auth.session_expired", "Session expired")
    sess.revoked = True

    res2 = await db.execute(select(User).where(User.id == sub))
    user = res2.scalar_one()
    pair = _make_token_pair(user, db, ip=request.client.host if request.client else None, ua=request.headers.get("user-agent"))
    await db.commit()
    return pair


@router.post("/logout")
async def logout(payload: RefreshIn, db: AsyncSession = Depends(get_db)) -> dict:
    try:
        data = decode_token(payload.refresh_token)
    except ValueError:
        return {"ok": True}
    jti = data.get("jti")
    if jti:
        res = await db.execute(select(UserSession).where(UserSession.refresh_jti == jti))
        sess = res.scalar_one_or_none()
        if sess:
            sess.revoked = True
            await db.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current)
