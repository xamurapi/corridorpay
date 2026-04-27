'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { formatMoney, symbolFor } from '@/lib/format';

type Wallet = { id: string; currency: string; balance: number; blocked: number; available: number; status: string };

const ALL = ['RUB', 'INR', 'CNY', 'EUR', 'TRY', 'BYN', 'UZS', 'KZT', 'KGS', 'AMD', 'AZN', 'GEL', 'USD'];

export default function WalletsPage() {
  const t = useTranslations('cabinet');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setWallets(await api.get<Wallet[]>('/v1/wallets', { auth: 'user' })); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function add(currency: string) {
    setError(null);
    try { await api.post('/v1/wallets', { currency }, { auth: 'user' }); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  const have = new Set(wallets.map((w) => w.currency));
  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / {t('wallets')}</p>
          <h1>{t('wallets')}</h1>
          <p className="lead">12 валют для приёма и хранения средств. Балансы хранятся в копейках/пайсах.</p>
        </div>
      </div>

      <div className="metric-grid">
        {wallets.map((w) => (
          <div key={w.id} className="card">
            <div className="card-title">{w.currency}</div>
            <div className="card-value money">
              {symbolFor(w.currency)} {formatMoney(w.balance, w.currency)}
            </div>
            <div className="card-trend">
              {w.blocked > 0
                ? `Заблокировано: ${formatMoney(w.blocked, w.currency)}`
                : 'Свободно'}
            </div>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head"><h2>+ Добавить кошелёк</h2></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ALL.filter((c) => !have.has(c)).map((c) => (
            <button key={c} onClick={() => add(c)} className="btn btn-ghost">+ {c}</button>
          ))}
        </div>
        {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginTop: 12 }}>{error}</p>}
      </section>
    </>
  );
}
