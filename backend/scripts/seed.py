"""Seed: 12 corridors, PSPs, FX rates, demo users (admin + customer)."""
import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.corridor import Corridor, PSPProvider
from app.models.fx import FxRate
from app.models.user import User
from app.models.wallet import Wallet


CORRIDORS = [
    ("RU", "Россия", "Russia", "RUB", "₽", "🇷🇺", "СБП", "yookassa"),
    ("IN", "Индия", "India", "INR", "₹", "🇮🇳", "UPI", "cashfree"),
    ("CN", "Китай", "China", "CNY", "¥", "🇨🇳", "WeChat Pay/Alipay", "lianlian"),
    ("EU", "Европа", "Europe (SEPA)", "EUR", "€", "🇪🇺", "SEPA Instant", "stripe"),
    ("TR", "Турция", "Turkey", "TRY", "₺", "🇹🇷", "FAST", "iyzico"),
    ("BY", "Беларусь", "Belarus", "BYN", "Br", "🇧🇾", "ЕРИП", "bepaid"),
    ("UZ", "Узбекистан", "Uzbekistan", "UZS", "сум", "🇺🇿", "HUMO/UzCard", "click"),
    ("KZ", "Казахстан", "Kazakhstan", "KZT", "₸", "🇰🇿", "Kaspi", "kaspi"),
    ("KG", "Кыргызстан", "Kyrgyzstan", "KGS", "сом", "🇰🇬", "Elcart", "mbank"),
    ("AM", "Армения", "Armenia", "AMD", "֏", "🇦🇲", "Idram/ArCa", "idram"),
    ("AZ", "Азербайджан", "Azerbaijan", "AZN", "₼", "🇦🇿", "m10", "m10"),
    ("GE", "Грузия", "Georgia", "GEL", "₾", "🇬🇪", "BOG Pay / TBC Pay", "bog"),
]

PSPS = [
    ("yookassa", "YooKassa", "RU", 100),
    ("cloudpayments", "CloudPayments", "RU", 50),
    ("cashfree", "Cashfree", "IN", 100),
    ("razorpay", "Razorpay", "IN", 50),
    ("lianlian", "LianLian Global", "CN", 100),
    ("stripe", "Stripe Connect", "EU", 100),
    ("adyen", "Adyen", "EU", 60),
    ("iyzico", "iyzico", "TR", 100),
    ("bepaid", "bePaid", "BY", 100),
    ("click", "Click", "UZ", 100),
    ("payme", "Payme", "UZ", 60),
    ("kaspi", "Kaspi Pay", "KZ", 100),
    ("mbank", "MBank API", "KG", 100),
    ("idram", "Idram", "AM", 100),
    ("m10", "m10 / Pasha", "AZ", 100),
    ("bog", "BOG Payments", "GE", 100),
    ("tbc", "TBC Pay", "GE", 60),
]

# USD-anchored mid-rates (approx. for demo)
USD_RATES = {
    "USD": Decimal("1.0"),
    "RUB": Decimal("92.50"),
    "INR": Decimal("83.20"),
    "CNY": Decimal("7.24"),
    "EUR": Decimal("0.94"),
    "TRY": Decimal("32.50"),
    "BYN": Decimal("3.27"),
    "UZS": Decimal("12650.00"),
    "KZT": Decimal("455.00"),
    "KGS": Decimal("88.50"),
    "AMD": Decimal("390.00"),
    "AZN": Decimal("1.70"),
    "GEL": Decimal("2.71"),
}


async def seed():
    async with AsyncSessionLocal() as db:
        # Corridors
        for code, ru, en, ccy, sym, flag, rail, psp in CORRIDORS:
            res = await db.execute(select(Corridor).where(Corridor.code == code))
            if res.scalar_one_or_none():
                continue
            db.add(
                Corridor(
                    id=uuid.uuid4(),
                    code=code,
                    country_name_ru=ru,
                    country_name_en=en,
                    currency=ccy,
                    currency_symbol=sym,
                    flag=flag,
                    rail=rail,
                    primary_psp=psp,
                )
            )

        # PSP providers
        for code, name, country, weight in PSPS:
            res = await db.execute(select(PSPProvider).where(PSPProvider.code == code))
            if res.scalar_one_or_none():
                continue
            db.add(
                PSPProvider(
                    id=uuid.uuid4(),
                    code=code,
                    name=name,
                    country_code=country,
                    weight=weight,
                    capabilities={"inbound": True, "outbound": True, "refund": True},
                )
            )

        # FX rates: USD -> ccy
        now = datetime.now(timezone.utc)
        for ccy, rate in USD_RATES.items():
            if ccy == "USD":
                continue
            res = await db.execute(select(FxRate).where(FxRate.base == "USD", FxRate.quote == ccy))
            r = res.scalar_one_or_none()
            if r:
                r.rate = rate
                r.fetched_at = now
            else:
                db.add(FxRate(id=uuid.uuid4(), base="USD", quote=ccy, rate=rate, source="seed", fetched_at=now))

        # Demo admin
        res = await db.execute(select(User).where(User.email == "admin@corridorpay.ru"))
        if not res.scalar_one_or_none():
            admin = User(
                id=uuid.uuid4(),
                email="admin@corridorpay.ru",
                full_name="Елена Морозова",
                country_iso2="RU",
                preferred_lang="ru",
                role="superadmin",
                kyc_tier=3,
                email_verified=True,
                password_hash=hash_password("admin12345"),
                referral_code="ADMIN001",
            )
            db.add(admin)

        # Demo customer
        res = await db.execute(select(User).where(User.email == "demo@corridorpay.ru"))
        if not res.scalar_one_or_none():
            demo = User(
                id=uuid.uuid4(),
                email="demo@corridorpay.ru",
                full_name="Rohit Aggarwal",
                country_iso2="IN",
                preferred_lang="ru",
                role="user",
                kyc_tier=2,
                email_verified=True,
                password_hash=hash_password("demo12345"),
                referral_code="DEMO0001",
            )
            db.add(demo)
            await db.flush()
            db.add(Wallet(id=uuid.uuid4(), user_id=demo.id, currency="INR", balance=12_458_000))  # ₹124,580
            db.add(Wallet(id=uuid.uuid4(), user_id=demo.id, currency="RUB", balance=0))
            db.add(Wallet(id=uuid.uuid4(), user_id=demo.id, currency="USD", balance=24_850))  # $248.50

        await db.commit()
        print("[OK] Seed complete: 12 corridors, 17 PSPs, FX rates, demo admin + user")


if __name__ == "__main__":
    asyncio.run(seed())
