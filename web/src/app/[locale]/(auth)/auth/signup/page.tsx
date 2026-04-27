'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { api, setTokens } from '@/lib/api';

type OtpResp = { otp_sent: boolean; target: string; debug_code?: string };
type TokenResp = { access_token: string; refresh_token: string; expires_in: number };

export default function SignupPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const locale = useLocale();
  const [stage, setStage] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ email: '', full_name: '', country_iso2: 'RU' });
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await api.post<OtpResp>('/v1/auth/signup', { ...form, preferred_lang: locale });
      setStage('otp'); setDebugCode(r.debug_code || null);
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await api.post<TokenResp>('/v1/auth/verify-otp', { target: form.email, code, purpose: 'signup' });
      setTokens({ access: r.access_token, refresh: r.refresh_token });
      router.push('/cabinet');
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('signup_title')}</h1>
        <p className="lead">{t('signup_sub')}</p>
        {stage === 'form' ? (
          <form onSubmit={send}>
            <div className="field">
              <label>{t('name')}</label>
              <input className="input" required minLength={2} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('email')}</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('country')}</label>
              <select className="input" value={form.country_iso2} onChange={(e) => setForm({ ...form, country_iso2: e.target.value })}>
                {['RU','IN','CN','EU','TR','BY','UZ','KZ','KG','AM','AZ','GE'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14 }}>
              {loading ? '…' : t('send_code')}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <div className="field">
              <label>{t('code')} {debugCode ? <span style={{ color: 'var(--c-amber)' }}>(dev: {debugCode})</span> : null}</label>
              <input className="input" required minLength={4} maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14 }}>
              {loading ? '…' : t('verify')}
            </button>
          </form>
        )}
        <p className="alt">
          {t('have_account')} <Link href="/auth/login">{t('to_login')}</Link>
        </p>
      </div>
    </div>
  );
}
