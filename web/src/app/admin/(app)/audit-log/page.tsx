'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type A = {
  id: string; actor_id: string | null; actor_type: string; action: string;
  target_type: string; target_id: string | null;
  diff: Record<string, unknown>; reason: string | null; ip: string | null; created_at: string;
};

export default function AuditLogPage() {
  const [items, setItems] = useState<A[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get<{ items: A[]; total: number }>('/admin/v1/audit?per_page=100', { auth: 'admin' })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / Audit log</p>
          <h1>Audit log</h1>
          <p className="lead">Все действия staff: actor, action, target, diff, IP. Append-only, 7 лет retention.</p>
        </div>
        <span className="card-trend">Всего: {total}</span>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Время</th><th>Actor</th><th>Action</th><th>Target</th><th>Reason</th><th>IP</th><th>Diff</th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.created_at).toLocaleString('ru-RU')}</td>
                  <td className="mono">{a.actor_id?.slice(0, 8) || '—'}…</td>
                  <td><span className="status processing">{a.action}</span></td>
                  <td>{a.target_type}: <span className="mono">{a.target_id || '—'}</span></td>
                  <td>{a.reason || '—'}</td>
                  <td className="mono">{a.ip || '—'}</td>
                  <td className="mono" style={{ fontSize: 11, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {Object.keys(a.diff || {}).length ? JSON.stringify(a.diff) : '—'}
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
