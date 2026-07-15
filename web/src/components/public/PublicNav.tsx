import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function PublicNav() {
  const t = useTranslations('nav');
  return (
    <nav className="public-nav">
      <Link href="/" className="brand">
        Corridor<span>Pay</span>
      </Link>
      <div className="links">
        <Link href="/calculator">{t('calculator')}</Link>
        <Link href="/corridors">{t('corridors')}</Link>
        <Link href="/pricing">{t('pricing')}</Link>
        <Link href="/contacts">{t('contacts')}</Link>
      </div>
      <div className="nav-right">
        <Link href="/auth/login" className="nav-login">
          {t('login')}
        </Link>
        <Link href="/auth/signup" className="nav-cta">
          {t('signup')}
        </Link>
      </div>
    </nav>
  );
}
