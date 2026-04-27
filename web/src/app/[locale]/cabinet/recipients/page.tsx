'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

type Recipient = {
  id: string; full_name: string; country_iso2: string; currency: string;
  method: string; identifier: string; bank_name: string | null; favorite: boolean;
};

const METHODS = ['upi', 'iban', 'card', 'phone', 'wallet', 'erip', 'qr'];

export default function RecipientsPage() {
  const t = useTranslations('cabinet');
  const [items, setItems] = useState<Recipient[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: '', country_iso2: 'IN', currency: 'INR', method: 'upi', identifier: '', bank_name: '',
  });

  async function load() {
    try { setItems(await api.get<Recipient[]>('/v1/recipients', { auth: 'user' })); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      await api.post('/v1/recipients', form, { auth: 'user' });
      setOpen(false);
      setForm({ full_name: '', country_iso2: 'IN', currency: 'INR', method: 'upi', identifier: '', bank_name: '' });
      await load();
    } catch (e) { setError((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm('Удалить?')) return;
    await api.del(`/v1/recipients/${id}`, { auth: 'user' });
    await load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / {t('recipients')}</p>
          <h1>{t('recipients')}</h1>
          <p className="lead">Адресная книга — UPI, IBAN, карты, телефоны</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(!open)}>{t('add_recipient')}</button>
      </div>

      {open && (
        <section className="panel">
          <form onSubmit={add}>
            <div className="field-row">
              <div className="field"><label>Имя</label><input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="field"><label>Страна</label>
                <select className="input" value={form.country_iso2} onChange={(e) => setForm({ ...form, country_iso2: e.target.value })}>
                  {['RU','IN','CN','EU','TR','BY','UZ','KZ','KG','AM','AZ','GE'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Валюта</label>
                <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {['RUB','INR','CNY','EUR','TRY','BYN','UZS','KZT','KGS','AMD','AZN','GEL','USD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Метод</label>
                <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>Идентификатор</label><input className="input" required placeholder="UPI / IBAN / +7… / номер карты" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} /></div>
            <div className="field"><label>Банк (опц.)</label><input className="input" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
            {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="btn-primary">Сохранить</button>
          </form>
        </section>
      )}

      <section className="panel">
        {items.length === 0 ? (
          <p style={{ color: 'var(--c-muted)' }}>{t('no_recipients')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Имя</th><th>Страна</th><th>Валюта</th><th>Метод</th><th>Идентификатор</th><th>Действие</th></tr></thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.full_name} {r.favorite && '⭐'}</td>
                    <td>{r.country_iso2}</td>
                    <td>{r.currency}</td>
                    <td>{r.method.toUpperCase()}</td>
                    <td className="mono">{r.identifier}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Удалить</button></td>
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
