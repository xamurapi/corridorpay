"""Unit-style tests for FX cross-rate math via in-memory SQLite (no Postgres needed)."""
import pytest
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import Column, String, Numeric, DateTime, MetaData, Table, insert

from app.services.fx import quote


@pytest.mark.asyncio
async def test_quote_cross_rate_via_usd():
    """Build a tiny standalone fx_rates table on SQLite and verify cross-rate math."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    md = MetaData()
    fx_rates = Table(
        "fx_rates",
        md,
        Column("id", String, primary_key=True),
        Column("base", String(3)),
        Column("quote", String(3)),
        Column("rate", Numeric(20, 8)),
        Column("source", String(40)),
        Column("fetched_at", DateTime(timezone=True)),
        Column("created_at", DateTime(timezone=True)),
        Column("updated_at", DateTime(timezone=True)),
    )
    Table(
        "corridors",
        md,
        Column("id", String, primary_key=True),
        Column("code", String(2)),
        Column("currency", String(3)),
        Column("country_name_ru", String(80)),
        Column("country_name_en", String(80)),
        Column("currency_symbol", String(8)),
        Column("flag", String(8)),
        Column("rail", String(40)),
        Column("primary_psp", String(40)),
        Column("enabled", String(8)),
        Column("min_amount_minor", String),
        Column("max_amount_minor", String),
        Column("daily_limit_minor", String),
        Column("base_fee_bps", String),
        Column("fx_markup_bps", String),
        Column("rate_lock_ttl_sec", String),
        Column("settings", String),
        Column("created_at", DateTime(timezone=True)),
        Column("updated_at", DateTime(timezone=True)),
    )

    async with engine.begin() as conn:
        await conn.run_sync(md.create_all)
        now = datetime.now(timezone.utc)
        await conn.execute(insert(fx_rates).values(id=str(uuid.uuid4()), base="USD", quote="INR", rate=83, source="test", fetched_at=now, created_at=now, updated_at=now))
        await conn.execute(insert(fx_rates).values(id=str(uuid.uuid4()), base="USD", quote="RUB", rate=92, source="test", fetched_at=now, created_at=now, updated_at=now))

    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as db:
        # Send 100,000 INR -> RUB; no corridors row -> defaults applied (markup 180bps, fee 30bps)
        q = await quote(db, from_currency="INR", to_currency="RUB", amount_in_minor=10_000_000)
        assert q["fx_rate"] == pytest.approx(92 / 83, rel=1e-3)
        assert 10_700_000 < q["amount_out_minor"] < 11_000_000
        assert q["markup_bps"] == 180
        assert q["fee_bps"] == 30
    await engine.dispose()
