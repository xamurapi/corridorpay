'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Me = {
  id: string; email: string; full_name: string | null; country_iso2: string | null;
  preferred_lang: string; role: string; status: string; kyc_tier: number;
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ full_name: '', country_iso2: 'RU', preferred_lang: 'ru' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Me>('/v1/me', { auth: 'user' }).then((u) => {
      setMe(u);
      setForm({
        full_name: u.full_name || '',
        country_iso2: u.country_iso2 || 'RU',
        preferred_lang: u.preferred_lang,
      });
    }).catch((e) => setError((e as Error).message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaved(false);
    try {
      const u = await api.patch<Me>('/v1/me', form, { auth: 'user' });
      setMe(u); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError((e as Error).message); }
  }

  if (!me) return <div>Загрузка…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / Настройки</p>
          <h1>Настройки</h1>
          <p className="lead">Профиль · безопасность · предпочтения</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Профиль</h2></div>
        <form onSubmit={save}>
          <div className="field"><label>Email</label><input className="input" disabled value={me.email} /></div>
          <div className="field"><label>Полное имя</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="field-row">
            <div className="field"><label>Страна</label>
              <select className="input" value={form.country_iso2} onChange={(e) => setForm({ ...form, country_iso2: e.target.value })}>
                {['RU','IN','CN','EU','TR','BY','UZ','KZ','KG','AM','AZ','GE'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Язык</label>
              <select className="input" value={form.preferred_lang} onChange={(e) => setForm({ ...form, preferred_lang: e.target.value })}>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {saved && <p style={{ color: 'var(--c-green)', fontSize: 13, marginBottom: 12 }}>✓ Сохранено</p>}
          <button type="submit" className="btn-primary-sm btn">Сохранить</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Безопасность</h2></div>
        <p style={{ color: 'var(--c-muted)', fontSize: 14, marginBottom: 12 }}>
          Активные сессии · 2FA (TOTP / passkey) · история входов — настраиваются здесь.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" disabled>Включить TOTP</button>
          <button className="btn btn-ghost" disabled>Зарегистрировать passkey</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Аккаунт</h2></div>
        <ul style={{ listStyle: 'none', color: 'var(--c-muted)', fontSize: 14, lineHeight: 1.8 }}>
          <li>· Роль: <b style={{ color: 'var(--c-text)' }}>{me.role}</b></li>
          <li>· KYC: <b style={{ color: 'var(--c-text)' }}>Tier {me.kyc_tier}</b></li>
          <li>· Статус: <b style={{ color: 'var(--c-text)' }}>{me.status}</b></li>
        </ul>
      </section>
    </>
  );
}
