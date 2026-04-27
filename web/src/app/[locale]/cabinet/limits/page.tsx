'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Limits = { tier: number; daily_usd: number; monthly_usd: number; label: string };

export default function LimitsPage() {
  const [l, setL] = useState<Limits | null>(null);
  useEffect(() => { api.get<Limits>('/v1/me/limits', { auth: 'user' }).then(setL).catch(() => {}); }, []);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / Лимиты</p>
          <h1>Лимиты</h1>
          <p className="lead">Зависят от уровня KYC. Повышайте Tier для увеличения лимитов.</p>
        </div>
      </div>
      {l && (
        <div className="metric-grid">
          <div className="card">
            <div className="card-title">Текущий уровень</div>
            <div className="card-value">Tier {l.tier}</div>
            <div className="card-trend">{l.label}</div>
          </div>
          <div className="card">
            <div className="card-title">Дневной</div>
            <div className="card-value money">$ {l.daily_usd.toLocaleString('ru-RU')}</div>
          </div>
          <div className="card">
            <div className="card-title">Месячный</div>
            <div className="card-value money">$ {l.monthly_usd.toLocaleString('ru-RU')}</div>
          </div>
        </div>
      )}
    </>
  );
}
