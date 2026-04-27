import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Calculator } from '@/components/public/Calculator';

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Inner />;
}

function Inner() {
  const t = useTranslations('landing');
  return (
    <section className="section-pad" style={{ paddingTop: 140 }}>
      <h1 className="section-title">{t('calc_title')}</h1>
      <p className="section-sub">{t('calc_sub')}</p>
      <div className="calc-wrap">
        <Calculator />
      </div>
    </section>
  );
}
