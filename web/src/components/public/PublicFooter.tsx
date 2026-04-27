import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function PublicFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  return (
    <footer className="public-footer">
      <div className="footer-grid">
        <div className="footer-col">
          <h5>CorridorPay</h5>
          <p style={{ color: 'var(--c-muted)', fontSize: 14, lineHeight: 1.6 }}>{t('tagline')}</p>
        </div>
        <div className="footer-col">
          <h5>{t('product')}</h5>
          <Link href="/calculator">{nav('calculator')}</Link>
          <Link href="/corridors">{nav('corridors')}</Link>
          <Link href="/pricing">{nav('pricing')}</Link>
        </div>
        <div className="footer-col">
          <h5>{t('legal')}</h5>
          <Link href="/legal/terms">{t('terms')}</Link>
          <Link href="/legal/privacy">{t('privacy')}</Link>
          <Link href="/legal/aml">{t('aml')}</Link>
          <Link href="/legal/api">{t('api')}</Link>
          <Link href="/legal/cookies">{t('cookies')}</Link>
        </div>
        <div className="footer-col">
          <h5>{t('support')}</h5>
          <Link href="/contacts">{nav('contacts')}</Link>
          <a href="mailto:hello@corridorpay.ru">hello@corridorpay.ru</a>
          <a href="mailto:support@corridorpay.ru">support@corridorpay.ru</a>
        </div>
      </div>
      <div className="footer-bottom">{t('copyright')}</div>
    </footer>
  );
}
