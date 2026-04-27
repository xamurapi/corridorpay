'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type App = { id: string; tier: number; status: string; provider: string; submitted_at: string | null; created_at: string };

export default function KycPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setApps(await api.get<App[]>('/v1/kyc/applications', { auth: 'user' })); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(tier: number) {
    setError(null);
    try { await api.post('/v1/kyc/applications', { tier }, { auth: 'user' }); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  const TIERS = [
    { tier: 1, name: 'Tier 1 — Email + телефон', limit: '$200/день · $1 000/мес', items: ['Email', 'Телефон'] },
    { tier: 2, name: 'Tier 2 — Паспорт + селфи', limit: '$3 000/день · $15 000/мес', items: ['Паспорт', 'Селфи', 'Адрес'] },
    { tier: 3, name: 'Tier 3 — Бизнес', limit: 'индивидуально', items: ['Incorporation', 'Articles', 'UBO', 'Bank statement'] },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / KYC</p>
          <h1>KYC / Верификация</h1>
          <p className="lead">Уровни 1/2/3. Подача заявки → проверка → одобрение.</p>
        </div>
      </div>

      <div className="metric-grid">
        {TIERS.map((t) => (
          <div key={t.tier} className="card">
            <div className="card-title">{t.name}</div>
            <div className="card-trend" style={{ marginBottom: 14 }}>{t.limit}</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--c-muted)', marginBottom: 14 }}>
              {t.items.map((i) => <li key={i}>· {i}</li>)}
            </ul>
            <button className="btn btn-primary-sm btn-sm" onClick={() => submit(t.tier)}>Подать заявку</button>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Мои заявки</h2></div>
        {apps.length === 0 ? (
          <p style={{ color: 'var(--c-muted)' }}>Заявок нет</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Tier</th><th>Provider</th><th>Статус</th><th>Создана</th></tr></thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td>{a.tier}</td>
                    <td>{a.provider}</td>
                    <td><span className={`status ${a.status === 'approved' ? 'completed' : a.status === 'rejected' ? 'failed' : 'pending'}`}>{a.status}</span></td>
                    <td>{new Date(a.created_at).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginTop: 12 }}>{error}</p>}
      </section>
    </>
  );
}
