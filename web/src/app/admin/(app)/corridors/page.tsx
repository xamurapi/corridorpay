'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type C = {
  id: string; code: string; country_name_ru: string; currency: string; flag: string;
  rail: string; primary_psp: string; enabled: boolean;
  min_amount_minor: number; max_amount_minor: number;
  base_fee_bps: number; fx_markup_bps: number; rate_lock_ttl_sec: number;
};

export default function AdminCorridorsPage() {
  const [items, setItems] = useState<C[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() { try { setItems(await api.get<C[]>('/admin/v1/corridors', { auth: 'admin' })); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, enabled: boolean) {
    const reason = prompt(`Причина ${enabled ? 'включения' : 'выключения'} корридора`) || undefined;
    if (!reason) return;
    try {
      await api.patch(`/admin/v1/corridors/${id}`, { enabled }, { auth: 'admin', adminReason: reason });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / Корридоры</p>
          <h1>12 корридоров</h1>
          <p className="lead">Включение/выключение, лимиты, маркапы, TTL rate-lock.</p>
        </div>
      </div>
      <section className="panel">
        {error && <p style={{ color: 'var(--c-red)' }}>{error}</p>}
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Страна</th><th>Валюта</th><th>Рельса</th><th>PSP</th><th>Маркап (bps)</th><th>Tx fee (bps)</th><th>Lock TTL</th><th>Enabled</th><th>Действия</th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.flag} {c.country_name_ru} ({c.code})</td>
                  <td>{c.currency}</td>
                  <td>{c.rail}</td>
                  <td>{c.primary_psp}</td>
                  <td className="num">{c.fx_markup_bps}</td>
                  <td className="num">{c.base_fee_bps}</td>
                  <td className="num">{c.rate_lock_ttl_sec}s</td>
                  <td><span className={`status ${c.enabled ? 'completed' : 'failed'}`}>{c.enabled ? 'on' : 'off'}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(c.id, !c.enabled)}>
                      {c.enabled ? 'Выкл.' : 'Вкл.'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
