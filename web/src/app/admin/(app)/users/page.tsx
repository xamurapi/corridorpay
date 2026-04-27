'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type U = { id: string; email: string; full_name: string | null; country_iso2: string | null; role: string; status: string; kyc_tier: number; email_verified: boolean; created_at: string };

export default function AdminUsersPage() {
  const [items, setItems] = useState<U[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api.get<{ items: U[]; total: number }>(`/admin/v1/users?per_page=50${q ? `&q=${encodeURIComponent(q)}` : ''}`, { auth: 'admin' });
      setItems(r.items); setTotal(r.total);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, [q]);

  async function setStatus(id: string, status: string) {
    const reason = prompt('Причина (X-Admin-Reason)') || undefined;
    if (!reason) return;
    try {
      await api.patch(`/admin/v1/users/${id}`, { status }, { auth: 'admin', adminReason: reason });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / Пользователи</p>
          <h1>Пользователи</h1>
          <p className="lead">Всего: {total}. Фильтр + suspend/restore с обязательной причиной.</p>
        </div>
        <input className="input" style={{ width: 280 }} placeholder="Поиск по email / имени" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <section className="panel">
        {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Email</th><th>Имя</th><th>Страна</th><th>Роль</th><th>KYC</th><th>Статус</th><th>Создан</th><th>Действия</th></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>{u.email} {u.email_verified && '✓'}</td>
                  <td>{u.full_name || '—'}</td>
                  <td>{u.country_iso2 || '—'}</td>
                  <td><span className="status processing">{u.role}</span></td>
                  <td>Tier {u.kyc_tier}</td>
                  <td><span className={`status ${u.status === 'active' ? 'completed' : 'failed'}`}>{u.status}</span></td>
                  <td>{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                  <td>
                    {u.status === 'active' ? (
                      <button className="btn btn-danger btn-sm" onClick={() => setStatus(u.id, 'suspended')}>Заблок.</button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setStatus(u.id, 'active')}>Активир.</button>
                    )}
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
