'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

const SECTIONS = [
  {
    titleKey: 'main',
    items: [
      { href: '/cabinet/dashboard', icon: '📊', key: 'dashboard' },
      { href: '/cabinet/wallets', icon: '💳', key: 'wallets' },
      { href: '/cabinet/send', icon: '→', key: 'transfer_new' },
      { href: '/cabinet/transactions', icon: '📜', key: 'history' },
      { href: '/cabinet/recipients', icon: '👥', key: 'recipients' },
    ],
  },
  {
    titleKey: 'account',
    items: [
      { href: '/cabinet/kyc', icon: '🪪', key: 'kyc' },
      { href: '/cabinet/api', icon: '🔑', key: 'api_keys' },
      { href: '/cabinet/limits', icon: '📐', key: 'limits' },
      { href: '/cabinet/notifications', icon: '🔔', key: 'notifications' },
      { href: '/cabinet/settings', icon: '⚙️', key: 'settings' },
    ],
  },
  {
    titleKey: 'help',
    items: [
      { href: '/cabinet/support', icon: '💬', key: 'support' },
      { href: '/cabinet/referral', icon: '🎁', key: 'referral' },
    ],
  },
] as const;

export function CabinetSidebar() {
  const t = useTranslations('cabinet');
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      {SECTIONS.map((sec) => (
        <div key={sec.titleKey}>
          <h4>{t(sec.titleKey)}</h4>
          {sec.items.map((it) => {
            const active = pathname === it.href || (it.href !== '/cabinet' && pathname?.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href} className={active ? 'active' : ''}>
                <span className="ico">{it.icon}</span>
                <span>{t(it.key)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
