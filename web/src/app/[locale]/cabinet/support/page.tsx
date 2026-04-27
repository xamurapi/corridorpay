'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Ticket = { id: string; subject: string; message: string; category: string; status: string; priority: string; created_at: string };

export default function SupportPage() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [form, setForm] = useState({ subject: '', message: '', category: 'general' });
  const [error, setError] = useState<string | null>(null);

  async function load() { try { setItems(await api.get<Ticket[]>('/v1/support/tickets', { auth: 'user' })); } catch {} }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      await api.post('/v1/support/tickets', form, { auth: 'user' });
      setForm({ subject: '', message: '', category: 'general' });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / Поддержка</p>
          <h1>Поддержка</h1>
          <p className="lead">Создайте тикет — ответим в течение 24 часов</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Новый тикет</h2></div>
        <form onSubmit={submit}>
          <div className="field-row">
            <div className="field"><label>Тема</label><input className="input" required minLength={3} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div className="field"><label>Категория</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="general">Общие вопросы</option>
                <option value="payment">Платёж</option>
                <option value="kyc">KYC</option>
                <option value="api">API</option>
                <option value="bug">Ошибка</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Сообщение</label><textarea className="input" required minLength={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn-primary-sm btn">Отправить</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Мои обращения</h2></div>
        {items.length === 0 ? <p style={{ color: 'var(--c-muted)' }}>—</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Тема</th><th>Категория</th><th>Статус</th><th>Создан</th></tr></thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td>{t.subject}</td>
                    <td>{t.category}</td>
                    <td><span className={`status ${t.status === 'closed' ? 'completed' : 'pending'}`}>{t.status}</span></td>
                    <td>{new Date(t.created_at).toLocaleString('ru-RU')}</td>
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
