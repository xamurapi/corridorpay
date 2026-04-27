'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type R = { base: string; quote: string; rate: number; source: string; fetched_at: string | null };

export default function AdminFxPage() {
  const [rates, setRates] = useState<R[]>([]);
  const [form, setForm] = useState({ base: 'USD', quote: 'RUB', rate: '92.5', source: 'admin_override' });
  const [error, setError] = useState<string | null>(null);

  async function load() { try { setRates(await api.get<R[]>('/admin/v1/fx/rates', { auth: 'admin' })); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const reason = prompt('Причина изменения курса') || undefined;
    if (!reason) return;
    try {
      await api.post('/admin/v1/fx/rates', { base: form.base, quote: form.quote, rate: parseFloat(form.rate), source: form.source }, { auth: 'admin', adminReason: reason });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / FX</p>
          <h1>FX курсы</h1>
          <p className="lead">Live + manual override. Маркапы — в /admin/corridors.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Override курса</h2></div>
        <form onSubmit={save}>
          <div className="field-row">
            <div className="field"><label>Base</label><input className="input" required maxLength={3} value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value.toUpperCase() })} /></div>
            <div className="field"><label>Quote</label><input className="input" required maxLength={3} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value.toUpperCase() })} /></div>
            <div className="field"><label>Rate</label><input className="input" required type="number" step="0.000001" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
            <div className="field"><label>Source</label><input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
          </div>
          {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" className="btn-primary-sm btn">Сохранить (потребует X-Admin-Reason)</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Текущие курсы ({rates.length})</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Base</th><th>Quote</th><th>Rate</th><th>Source</th><th>Fetched</th></tr></thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.base + r.quote}>
                  <td>{r.base}</td>
                  <td>{r.quote}</td>
                  <td className="num">{r.rate.toFixed(6)}</td>
                  <td>{r.source}</td>
                  <td>{r.fetched_at ? new Date(r.fetched_at).toLocaleString('ru-RU') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
