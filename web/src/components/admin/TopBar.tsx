'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearTokens, revokeSession } from '@/lib/api';

type Me = { id: string; email: string; full_name: string | null; role: string };

const STAFF_ROLES = ['superadmin', 'admin', 'compliance', 'support', 'finance', 'developer', 'viewer'];

export function AdminTopBar() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api
      .get<Me>('/v1/me', { auth: 'admin' })
      .then((u) => {
        // A valid non-staff token must not unlock the admin shell.
        if (!STAFF_ROLES.includes(u.role)) {
          clearTokens('admin');
          router.replace('/admin/login');
          return;
        }
        setMe(u);
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  async function logout() {
    await revokeSession('admin');
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
