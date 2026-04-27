import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Calculator } from '@/components/public/Calculator';
import { CorridorsGrid } from '@/components/public/CorridorsGrid';

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Inner locale={locale} />;
}

function Inner({ locale }: { locale: string }) {
  const t = useTranslations('landing');
  const nav = useTranslations('nav');
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="hero-badge">{t('badge')}</div>
          <h1>
            {t('hero_title')} <span className="hl">{t('hero_highlight')}</span>
          </h1>
          <p className="lead">{t('hero_subtitle')}</p>
          <div className="hero-btns">
            <Link href="/calculator" className="btn-primary">
              {t('cta_calc')}
            </Link>
            <Link href="/auth/signup" className="btn-secondary">
              {t('cta_signup')}
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-val">12</div>
              <div className="stat-label">{t('stats_corridors')}</div>
            </div>
            <div className="stat">
              <div className="stat-val">132</div>
              <div className="stat-label">{t('stats_pairs')}</div>
            </div>
            <div className="stat">
              <div className="stat-val">~3 мин</div>
              <div className="stat-label">{t('stats_speed')}</div>
            </div>
            <div className="stat">
              <div className="stat-val">99.95%</div>
              <div className="stat-label">{t('stats_uptime')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="section-pad">
        <div className="section-label">{nav('calculator')}</div>
        <h2 className="section-title">{t('calc_title')}</h2>
        <p className="section-sub">{t('calc_sub')}</p>
        <div className="calc-wrap">
          <Calculator />
        </div>
      </section>

      {/* CORRIDORS */}
      <section className="section-pad" style={{ background: 'var(--c-bg2)' }}>
        <h2 className="section-title">{t('corridors_title')}</h2>
        <p className="section-sub">{t('corridors_sub')}</p>
        {/* @ts-expect-error Async server component */}
        <CorridorsGrid locale={locale} />
      </section>

      {/* HOW IT WORKS */}
      <section className="section-pad">
        <h2 className="section-title">{t('how_title')}</h2>
        <div className="flow-steps">
          <div className="flow-step">
            <div className="step-num">1</div>
            <h4>{t('how_step1')}</h4>
            <p>{t('how_step1_desc')}</p>
          </div>
          <div className="flow-step">
            <div className="step-num">2</div>
            <h4>{t('how_step2')}</h4>
            <p>{t('how_step2_desc')}</p>
          </div>
          <div className="flow-step">
            <div className="step-num">3</div>
            <h4>{t('how_step3')}</h4>
            <p>{t('how_step3_desc')}</p>
          </div>
          <div className="flow-step">
            <div className="step-num">4</div>
            <h4>{t('how_step4')}</h4>
            <p>{t('how_step4_desc')}</p>
          </div>
        </div>
      </section>

      {/* CASES */}
      <section className="section-pad" style={{ background: 'var(--c-bg2)' }}>
        <h2 className="section-title">{t('cases_title')}</h2>
        <div className="cases-grid">
          <div className="case-card">
            <span className="icon">💼</span>
            <h4>{t('case_freelancer')}</h4>
            <p>{t('case_freelancer_desc')}</p>
          </div>
          <div className="case-card">
            <span className="icon">🏢</span>
            <h4>{t('case_business')}</h4>
            <p>{t('case_business_desc')}</p>
          </div>
          <div className="case-card">
            <span className="icon">🛒</span>
            <h4>{t('case_marketplace')}</h4>
            <p>{t('case_marketplace_desc')}</p>
          </div>
          <div className="case-card">
            <span className="icon">👨‍👩‍👧</span>
            <h4>{t('case_individuals')}</h4>
            <p>{t('case_individuals_desc')}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-box">
          <h2>{t('cta_box_title')}</h2>
          <p>{t('cta_box_sub')}</p>
          <Link href="/auth/signup" className="btn-primary">
            {nav('signup')}
          </Link>
        </div>
      </section>
    </>
  );
}
