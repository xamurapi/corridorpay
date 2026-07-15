'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { api, revokeSession } from '@/lib/api';

type Me = { id: string; email: string; full_name?: string | null; kyc_tier: number };

export function CabinetTopBar() {
  const t = useTranslations('nav');
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.get<Me>('/v1/me', { auth: 'user' }).then(setMe).catch(() => {
      router.replace('/auth/login');
    });
  }, [router]);

  async function logout() {
    await revokeSession('user');
    router.replace('/auth/login');
  }

  const initials = (me?.full_name || me?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <nav className="app-nav">
      <Link href="/cabinet" className="app-logo">
        <span>CorridorPay</span>
        <span className="suffix">{t('cabinet')}</span>
      </Link>
      <div className="app-actions">
        <button className="app-bell" aria-label="Notifications">
          🔔<span className="dot" />
        </button>
        <div className="app-user">
          <div className="avatar">{initials}</div>
          <span>{me?.full_name || me?.email || '…'}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          ↪ Выйти
        </button>
      </div>
    </nav>
  );
}
