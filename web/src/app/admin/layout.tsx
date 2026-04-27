import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CorridorPay · Админ',
  description: 'Внутренняя админ-панель CorridorPay',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
