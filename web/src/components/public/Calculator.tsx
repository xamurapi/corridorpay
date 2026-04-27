'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { formatMoney, formatRate, symbolFor, toMinor } from '@/lib/format';

const DEFAULT_CCYS = ['RUB', 'INR', 'CNY', 'EUR', 'TRY', 'BYN', 'UZS', 'KZT', 'KGS', 'AMD', 'AZN', 'GEL', 'USD'];

type Quote = {
  from_currency: string;
  to_currency: string;
  amount_in_minor: number;
  amount_out_minor: number;
  fee_minor: number;
  fx_rate: number;
  fx_rate_effective: number;
  markup_bps: number;
  rate_lock_ttl_sec: number;
};

export function Calculator() {
  const t = useTranslations('landing');
  const [from, setFrom] = useState('INR');
  const [to, setTo] = useState('RUB');
  const [amount, setAmount] = useState('50000');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const v = parseFloat(amount.replace(/\s+/g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const q = await api.post<Quote>(
          '/v1/public/quotes',
          { from_currency: from, to_currency: to, amount_in_minor: toMinor(v, from) },
          { signal: ctrl.signal },
        );
        setQuote(q);
        setError(null);
      } catch (e: unknown) {
        if ((e as { name?: string }).name !== 'AbortError') {
          setError((e as Error).message);
          setQuote(null);
        }
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [from, to, amount]);

  return (
    <div className="calc-card">
      <h3>{t('calc_title')}</h3>
      <div className="calc-field">
        <label>{t('calc_send')}</label>
        <div className="calc-input-row">
          <input
            className="calc-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select className="calc-select" value={from} onChange={(e) => setFrom(e.target.value)}>
            {DEFAULT_CCYS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="calc-field">
        <label>{t('calc_receive')}</label>
        <div className="calc-input-row">
          <input
            className="calc-input"
            readOnly
            value={quote ? formatMoney(quote.amount_out_minor, quote.to_currency) : '—'}
          />
          <select className="calc-select" value={to} onChange={(e) => setTo(e.target.value)}>
            {DEFAULT_CCYS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="calc-result">
        <div className="calc-result-label">{t('calc_total')}</div>
        <div className="calc-result-amount money">
          {symbolFor(to)}{' '}
          {quote ? formatMoney(quote.amount_out_minor, quote.to_currency) : '—'}
        </div>
        <div className="calc-meta">
          <div>
            {t('calc_rate')}:{' '}
            <b className="num">{quote ? formatRate(quote.fx_rate_effective) : '—'}</b>
          </div>
          <div>
            {t('calc_fee')}:{' '}
            <b className="num">{quote ? formatMoney(quote.fee_minor, quote.from_currency) : '—'} {symbolFor(from)}</b>
          </div>
          <div>
            {t('calc_eta')}: <b>{t('calc_eta_value')}</b>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: 'var(--c-red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      <a href={`/auth/signup?from=${from}&to=${to}&amount=${amount}`} className="calc-cta" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
        {t('calc_cta')}
      </a>
    </div>
  );
}
