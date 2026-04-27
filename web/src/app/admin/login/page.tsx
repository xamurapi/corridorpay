'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setTokens } from '@/lib/api';

type TokenResp = { access_token: string; refresh_token: string };

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@corridorpay.ru');
  const [password, setPassword] = useState('admin12345');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const r = await api.post<TokenResp>('/v1/auth/login', { email, password });
      setTokens({ access: r.access_token, admin: true });
      router.replace('/admin/dashboard');
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Вход в админку</h1>
        <p className="lead">Только для сотрудников. Все действия логируются в audit log.</p>
        <form onSubmit={submit}>
          <div className="field"><label>Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field"><label>Пароль</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: 14 }}>
            {loading ? '…' : 'Войти'}
          </button>
        </form>
        <p className="alt">
          В seed: <span className="mono">admin@corridorpay.ru / admin12345</span>
        </p>
      </div>
    </div>
  );
}
