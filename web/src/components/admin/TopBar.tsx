'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearTokens } from '@/lib/api';

type Me = { id: string; email: string; full_name: string | null; role: string };

export function AdminTopBar() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.get<Me>('/v1/me', { auth: 'admin' }).then(setMe).catch(() => router.replace('/admin/login'));
  }, [router]);

  function logout() {
    clearTokens('admin');
    router.replace('/admin/login');
  }

  const initials = (me?.full_name || me?.email || '?')
    .split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <nav className="app-nav no-langbar">
      <Link href="/admin/dashboard" className="app-logo">
        <span>CorridorPay</span>
        <span className="suffix admin">Админ</span>
      </Link>
      <div className="app-actions">
        <button className="app-bell" aria-label="Notifications">🔔<span className="dot" /></button>
        <div className="app-user admin-user">
          <div className="avatar">{initials}</div>
          <span>{me?.full_name || me?.email || '…'} · {me?.role}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>↪ Выйти</button>
      </div>
    </nav>
  );
}
