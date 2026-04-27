'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { api } from '@/lib/api';

export default function ContactsPage() {
  const locale = useLocale();
  const ru = locale === 'ru';
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/v1/public/contact', form);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="section-pad" style={{ paddingTop: 140 }}>
      <h1 className="section-title">{ru ? 'Связаться с нами' : 'Contact us'}</h1>
      <p className="section-sub">{ru ? 'Ответим в течение 24 часов' : 'We reply within 24 hours'}</p>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        {sent ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <h3 style={{ marginBottom: 6 }}>{ru ? 'Сообщение отправлено' : 'Message sent'}</h3>
            <p style={{ color: 'var(--c-muted)' }}>{ru ? 'Мы получили заявку и скоро ответим.' : 'We received your message and will reply soon.'}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card" style={{ padding: 28 }}>
            <div className="field">
              <label>{ru ? 'Имя' : 'Name'}</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>{ru ? 'Сообщение' : 'Message'}</label>
              <textarea className="input" required minLength={10} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: 14 }}>
              {ru ? 'Отправить' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
