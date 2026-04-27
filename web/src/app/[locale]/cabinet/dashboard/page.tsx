'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatMoney, symbolFor } from '@/lib/format';

type Wallet = { id: string; currency: string; balance: number; blocked: number; available: number; status: string };
type Tx = {
  id: string; status: string; from_currency: string; to_currency: string;
  amount_in_minor: number; amount_out_minor: number; created_at: string;
  recipient_snapshot: { full_name?: string };
};
type Me = { id: string; full_name?: string | null; email: string; kyc_tier: number };
type Limits = { tier: number; daily_usd: number; monthly_usd: number; label: string };

export default function CabinetDashboardPage() {
  const t = useTranslations('cabinet');
  const tStatus = useTranslations('tx_status');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [recent, setRecent] = useState<Tx[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Wallet[]>('/v1/wallets', { auth: 'user' }).then(setWallets).catch(() => {}),
      api.get<Me>('/v1/me', { auth: 'user' }).then(setMe).catch(() => {}),
      api.get<Limits>('/v1/me/limits', { auth: 'user' }).then(setLimits).catch(() => {}),
      api.get<{ items: Tx[] }>('/v1/transactions?per_page=5', { auth: 'user' })
        .then((r) => setRecent(r.items)).catch(() => {}),
    ]);
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / {t('dashboard')}</p>
          <h1>
            {t('hello')}, {me?.full_name || me?.email?.split('@')[0] || '👋'}
          </h1>
          <p className="lead">
            KYC Tier {limits?.tier ?? 0} · {limits?.label || ''}
          </p>
        </div>
        <div>
          <Link href="/cabinet/send" className="btn-primary">
            + {t('transfer_new')}
          </Link>
        </div>
      </div>

      {/* WALLETS */}
      <div className="metric-grid">
        {wallets.length === 0 && <div className="card"><p style={{ color: 'var(--c-muted)' }}>API offline</p></div>}
        {wallets.slice(0, 4).map((w) => (
          <div key={w.id} className="card">
            <div className="card-title">{t('wallets')} {w.currency}</div>
            <div className="card-value money">
              {symbolFor(w.currency)} {formatMoney(w.balance, w.currency)}
            </div>
            <div className="card-trend">{w.status}</div>
          </div>
        ))}
        {limits && (
          <div className="card">
            <div className="card-title">{t('kyc_limit')}</div>
            <div className="card-value money">$ {limits.monthly_usd.toLocaleString('ru-RU')}</div>
            <div className="card-trend">Tier {limits.tier}</div>
          </div>
        )}
      </div>

      {/* RECENT TX */}
      <section className="panel">
        <div className="panel-head">
          <h2>{t('recent_tx')}</h2>
          <Link href="/cabinet/transactions" style={{ fontSize: 13, color: 'var(--c-accent2)' }}>
            {t('view_all')}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--c-muted)' }}>—</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>From → To</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx) => (
                  <tr key={tx.id}>
                    <td className="mono">{tx.id.slice(0, 8)}…</td>
                    <td>
                      {tx.from_currency} → {tx.to_currency}
                    </td>
                    <td className="num">
                      {formatMoney(tx.amount_in_minor, tx.from_currency)} → {formatMoney(tx.amount_out_minor, tx.to_currency)}
                    </td>
                    <td>
                      <span className={`status ${tx.status}`}>{tStatus(tx.status as never)}</span>
                    </td>
                    <td>{new Date(tx.created_at).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
