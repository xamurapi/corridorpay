'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type P = {
  id: string; code: string; name: string; country_code: string;
  capabilities: Record<string, boolean>; weight: number; enabled: boolean;
  health_status: string; success_rate_pct: number; avg_latency_ms: number;
};

export default function AdminPspPage() {
  const [items, setItems] = useState<P[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() { try { setItems(await api.get<P[]>('/admin/v1/psp', { auth: 'admin' })); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, enabled: boolean) {
    const reason = prompt(`Причина ${enabled ? 'включения' : 'kill-switch'}`) || undefined;
    if (!reason) return;
    try {
      await api.patch(`/admin/v1/psp/${id}`, { enabled }, { auth: 'admin', adminReason: reason });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / PSP</p>
          <h1>PSP-партнёры</h1>
          <p className="lead">17 PSP по 12 странам · health · weights · kill-switch.</p>
        </div>
      </div>
      <section className="panel">
        {error && <p style={{ color: 'var(--c-red)' }}>{error}</p>}
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Имя</th><th>Страна</th><th>Capabilities</th><th>Weight</th><th>Health</th><th>Success</th><th>Latency</th><th>Действия</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.code}</td>
                  <td>{p.name}</td>
                  <td>{p.country_code}</td>
                  <td style={{ fontSize: 12, color: 'var(--c-muted)' }}>{Object.entries(p.capabilities).filter(([_, v]) => v).map(([k]) => k).join(', ')}</td>
                  <td className="num">{p.weight}</td>
                  <td><span className={`status ${p.health_status === 'healthy' ? 'completed' : p.health_status === 'down' ? 'failed' : 'pending'}`}>{p.health_status}</span></td>
                  <td className="num">{p.success_rate_pct}%</td>
                  <td className="num">{p.avg_latency_ms}ms</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(p.id, !p.enabled)}>
                      {p.enabled ? 'Выкл.' : 'Вкл.'}
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
