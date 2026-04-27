'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type Dashboard = {
  users: { total: number; new_24h: number };
  transactions: { count_24h: number; completed_24h: number; active: number; success_rate_pct: number };
  gmv_24h_minor: number;
  revenue_24h_minor: number;
  kyc_queue_depth: number;
};

export default function AdminDashboard() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dashboard>('/admin/v1/dashboard', { auth: 'admin' })
      .then(setD)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / Дашборд</p>
          <h1>Операционный дашборд</h1>
          <p className="lead">Состояние системы за 24 часа · обновляется по запросу.</p>
        </div>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => location.reload()}>↻ Обновить</button>
        </div>
      </div>

      {error && <div className="card" style={{ borderColor: 'var(--c-red)' }}>
        <div className="card-trend down">⚠ {error}</div>
      </div>}

      {d && (
        <>
          <div className="metric-grid">
            <div className="card">
              <div className="card-title">GMV (24ч)</div>
              <div className="card-value money">$ {formatMoney(d.gmv_24h_minor, 'USD')}</div>
              <div className="card-trend">USD-эквивалент</div>
            </div>
            <div className="card">
              <div className="card-title">Выручка (24ч)</div>
              <div className="card-value money">$ {formatMoney(d.revenue_24h_minor, 'USD')}</div>
              <div className="card-trend up">FX + Tx fee</div>
            </div>
            <div className="card">
              <div className="card-title">Успешных tx</div>
              <div className="card-value">{d.transactions.completed_24h}</div>
              <div className="card-trend">из {d.transactions.count_24h}</div>
            </div>
            <div className="card">
              <div className="card-title">Success rate</div>
              <div className="card-value">{d.transactions.success_rate_pct}%</div>
              <div className="card-trend up">SLO ≥ 95%</div>
            </div>
            <div className="card">
              <div className="card-title">Активные tx</div>
              <div className="card-value">{d.transactions.active}</div>
              <div className="card-trend">в процессе</div>
            </div>
            <div className="card">
              <div className="card-title">Пользователи</div>
              <div className="card-value">{d.users.total}</div>
              <div className="card-trend up">+{d.users.new_24h} за 24ч</div>
            </div>
            <div className="card">
              <div className="card-title">KYC очередь</div>
              <div className="card-value">{d.kyc_queue_depth}</div>
              <div className="card-trend">pending + review</div>
            </div>
          </div>

          <section className="panel">
            <div className="panel-head"><h2>Быстрые действия</h2></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/admin/transactions" className="btn btn-ghost">💸 Транзакции</a>
              <a href="/admin/kyc-queue" className="btn btn-ghost">🪪 KYC очередь</a>
              <a href="/admin/fx" className="btn btn-ghost">💱 FX курсы</a>
              <a href="/admin/psp" className="btn btn-ghost">🔌 PSP-партнёры</a>
              <a href="/admin/audit-log" className="btn btn-ghost">🔒 Audit log</a>
            </div>
          </section>
        </>
      )}
    </>
  );
}
