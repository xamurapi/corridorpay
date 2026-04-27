import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CorridorPay — мультивалютные переводы без SWIFT',
  description: 'Трансграничные переводы через локальные платёжные рельсы 12 стран. От 1.8%.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
