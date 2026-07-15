import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { CorridorsGrid } from '@/components/public/CorridorsGrid';

export default async function CorridorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Inner locale={locale} />;
}

function Inner({ locale }: { locale: string }) {
  const t = useTranslations('landing');
  return (
    <section className="section-pad" style={{ paddingTop: 140 }}>
      <h1 className="section-title">{t('corridors_title')}</h1>
      <p className="section-sub">{t('corridors_sub')}</p>
      <CorridorsGrid locale={locale} />
    </section>
  );
}
