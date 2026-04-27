'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { api, setTokens } from '@/lib/api';

type OtpResp = { otp_sent: boolean; target: string; debug_code?: string };
type TokenResp = { access_token: string; refresh_token: string };

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [stage, setStage] = useState<'email' | 'otp' | 'pwd'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await api.post<OtpResp | TokenResp>('/v1/auth/login', { email });
      if ('otp_sent' in r) {
        setStage('otp'); setDebugCode((r as OtpResp).debug_code || null);
      } else {
        setTokens({ access: r.access_token, refresh: r.refresh_token });
        router.push('/cabinet');
      }
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await api.post<TokenResp>('/v1/auth/login', { email, password });
      setTokens({ access: r.access_token, refresh: r.refresh_token });
      router.push('/cabinet');
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await api.post<TokenResp>('/v1/auth/login', { email, otp: code });
      setTokens({ access: r.access_token, refresh: r.refresh_token });
      router.push('/cabinet');
    } catch (err) { setError((err as Error).message); }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{t('login_title')}</h1>
        <p className="lead">{t('login_sub')}</p>
        {stage === 'email' && (
          <form onSubmit={sendOtp}>
            <div className="field">
              <label>{t('email')}</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14, marginBottom: 8 }}>
              {loading ? '…' : t('send_code')}
            </button>
            <button type="button" onClick={() => setStage('pwd')} className="btn-secondary" style={{ width: '100%', padding: 12, fontSize: 14 }}>
              Войти по паролю
            </button>
          </form>
        )}
        {stage === 'pwd' && (
          <form onSubmit={withPassword}>
            <div className="field">
              <label>{t('email')}</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('password')}</label>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14 }}>
              {loading ? '…' : 'Войти'}
            </button>
          </form>
        )}
        {stage === 'otp' && (
          <form onSubmit={verifyOtp}>
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
          {t('no_account')} <Link href="/auth/signup">{t('to_signup')}</Link>
        </p>
      </div>
    </div>
  );
}
