"""Ledger invariant: transfer journal entries must balance per currency.

Regression guard for the bug where the destination-currency legs summed to
-amount_out and every transfer was rejected with `ledger.imbalance`.
"""
import uuid

import pytest

from app.services.transactions import build_transfer_entries


def _sum_by_currency(entries: list[dict]) -> dict[str, int]:
    by_ccy: dict[str, int] = {}
    for e in entries:
        sign = 1 if e["direction"] == "debit" else -1
        by_ccy[e["currency"]] = by_ccy.get(e["currency"], 0) + sign * e["amount_minor"]
    return by_ccy


@pytest.mark.parametrize(
    "from_ccy,to_ccy,amt_in,amt_out,fee",
    [
        ("INR", "RUB", 10_000_000, 11_100_000, 30_000),
        ("USD", "EUR", 100_00, 94_00, 1_50),
        ("RUB", "USD", 92_500_00, 1_000_00, 250_00),
    ],
)
def test_transfer_entries_balance_per_currency(from_ccy, to_ccy, amt_in, amt_out, fee):
    entries = build_transfer_entries(
        user_id=uuid.uuid4(),
        tx_id=uuid.uuid4(),
        from_ccy=from_ccy,
        to_ccy=to_ccy,
        amt_in_minor=amt_in,
        amt_out_minor=amt_out,
        fee_minor=fee,
    )
    by_ccy = _sum_by_currency(entries)
    assert set(by_ccy) == {from_ccy, to_ccy}
    for ccy, delta in by_ccy.items():
        assert delta == 0, f"{ccy} imbalance: {delta}"


def test_user_charged_principal_plus_fee():
    entries = build_transfer_entries(
        user_id=uuid.uuid4(),
        tx_id=uuid.uuid4(),
        from_ccy="USD",
        to_ccy="EUR",
        amt_in_minor=100_00,
        amt_out_minor=94_00,
        fee_minor=1_50,
    )
    wallet = next(e for e in entries if e["kind"] == "user_wallet")
    assert wallet["amount_minor"] == 100_00 + 1_50
    assert wallet["direction"] == "credit"
