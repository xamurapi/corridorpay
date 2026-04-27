'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

export function LangBar() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <div className="lang-bar">
      <Link href={pathname} locale="ru" className={`lang-btn ${locale === 'ru' ? 'active' : ''}`}>
        RU
      </Link>
      <Link href={pathname} locale="en" className={`lang-btn ${locale === 'en' ? 'active' : ''}`}>
        EN
      </Link>
    </div>
  );
}
