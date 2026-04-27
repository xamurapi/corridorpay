from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=200)
    country_iso2: str = Field(min_length=2, max_length=2)
    preferred_lang: str = Field(default="ru", min_length=2, max_length=2)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class OtpSentOut(BaseModel):
    otp_sent: bool = True
    target: str
    purpose: str
    debug_code: str | None = None  # only in dev/local


class VerifyOtpIn(BaseModel):
    target: str
    code: str = Field(min_length=4, max_length=8)
    purpose: str = "signup"


class LoginIn(BaseModel):
    email: EmailStr
    password: str | None = None
    otp: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshIn(BaseModel):
    refresh_token: str
