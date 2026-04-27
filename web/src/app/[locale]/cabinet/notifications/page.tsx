'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type N = { id: string; code: string; title: string; body: string | null; severity: string; read: boolean; created_at: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<N[]>([]);
  async function load() { try { setItems(await api.get<N[]>('/v1/notifications', { auth: 'user' })); } catch {} }
  useEffect(() => { load(); }, []);
  async function readAll() { await api.post('/v1/notifications/read-all', undefined, { auth: 'user' }); await load(); }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / Уведомления</p>
          <h1>Уведомления</h1>
          <p className="lead">In-app · Email · SMS · Telegram</p>
        </div>
        <button className="btn btn-ghost" onClick={readAll}>Отметить все прочитанными</button>
      </div>

      <section className="panel">
        {items.length === 0 ? <p style={{ color: 'var(--c-muted)' }}>Уведомлений нет.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((n) => (
              <div key={n.id} className="card" style={{ opacity: n.read ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong>{n.title}</strong>
                  <span className="card-trend">{new Date(n.created_at).toLocaleString('ru-RU')}</span>
                </div>
                {n.body && <p style={{ fontSize: 14, color: 'var(--c-muted)' }}>{n.body}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
