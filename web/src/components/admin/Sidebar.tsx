'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  {
    title: 'Мониторинг',
    items: [
      { href: '/admin/dashboard', icon: '📊', label: 'Дашборд' },
      { href: '/admin/transactions', icon: '💸', label: 'Транзакции' },
      { href: '/admin/kyc-queue', icon: '🪪', label: 'KYC / AML' },
      { href: '/admin/users', icon: '👥', label: 'Пользователи' },
    ],
  },
  {
    title: 'Операции',
    items: [
      { href: '/admin/psp', icon: '🔌', label: 'PSP-партнёры' },
      { href: '/admin/fx', icon: '💱', label: 'FX' },
      { href: '/admin/corridors', icon: '🌍', label: 'Корридоры' },
      { href: '/admin/audit-log', icon: '🔒', label: 'Audit log' },
    ],
  },
  {
    title: 'Платформа',
    items: [
      { href: '/admin/staff', icon: '👤', label: 'Сотрудники' },
      { href: '/admin/settings', icon: '⚙️', label: 'Настройки' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar no-langbar">
      {SECTIONS.map((sec) => (
        <div key={sec.title}>
          <h4>{sec.title}</h4>
          {sec.items.map((it) => {
            const active = pathname === it.href || pathname?.startsWith(it.href + '/');
            return (
              <Link key={it.href} href={it.href} className={active ? 'active' : ''}>
                <span className="ico">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
