'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Q = { id: string; user_id: string; tier: number; status: string; provider: string; created_at: string; submitted_at: string | null };

export default function KycQueuePage() {
  const [items, setItems] = useState<Q[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setItems(await api.get<Q[]>('/admin/v1/kyc/queue', { auth: 'admin' })); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: 'approve' | 'reject' | 'more_info') {
    const reason = prompt('Причина / комментарий') || undefined;
    if (!reason) return;
    try {
      await api.post(`/admin/v1/kyc/applications/${id}/decision`, { decision, note: reason }, { auth: 'admin', adminReason: reason });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / KYC очередь</p>
          <h1>KYC / AML очередь</h1>
          <p className="lead">Заявки на проверку Tier 2/3. Решения логируются в audit.</p>
        </div>
      </div>

      <section className="panel">
        {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {items.length === 0 ? <p style={{ color: 'var(--c-muted)' }}>Очередь пуста.</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>ID</th><th>User</th><th>Tier</th><th>Provider</th><th>Статус</th><th>Создана</th><th>Действия</th></tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.id.slice(0, 8)}…</td>
                    <td className="mono">{a.user_id.slice(0, 8)}…</td>
                    <td>{a.tier}</td>
                    <td>{a.provider}</td>
                    <td><span className="status pending">{a.status}</span></td>
                    <td>{new Date(a.created_at).toLocaleString('ru-RU')}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary-sm btn-sm" onClick={() => decide(a.id, 'approve')}>Одобрить</button>
                      <button className="btn btn-danger btn-sm" onClick={() => decide(a.id, 'reject')}>Отклонить</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => decide(a.id, 'more_info')}>Доп. инфо</button>
                    </td>
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
