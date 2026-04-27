import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

const PAGES: Record<string, { ru: { title: string; body: string }; en: { title: string; body: string } }> = {
  terms: {
    ru: { title: 'Условия использования', body: '13 секций: стороны, сервис (orchestration, не банк), регистрация, права/обязанности, тарифы и FX-маркап, лимиты Tier 1/2/3, запрещённые операции, ответственность, прекращение, применимое право (DIFC), споры (DIAC), контакты, история версий.' },
    en: { title: 'Terms of Service', body: '13 sections: parties, service (orchestration, not a bank), signup, rights, fees & FX markup, tier limits, prohibited transactions, liability, termination, governing law (DIFC), arbitration (DIAC), contacts, version history.' },
  },
  privacy: {
    ru: { title: 'Политика конфиденциальности', body: 'Соответствует GDPR (ЕС 2016/679), 152-ФЗ (РФ), DPDP Act 2023 (Индия). 12 секций: контролёр, какие данные, цели, передача третьим лицам, сроки хранения, cross-border, права субъекта, cookies, безопасность, дети, изменения, контакты DPO.' },
    en: { title: 'Privacy Policy', body: 'Compliant with GDPR (EU 2016/679), 152-FZ (RU), DPDP Act 2023 (India). 12 sections: controller, data collected, purposes, third-party sharing, retention, cross-border, subject rights, cookies, security, children, updates, DPO contacts.' },
  },
  aml: {
    ru: { title: 'AML / KYC Policy', body: '11 секций: применимое регулирование (FATF, UAE, 115-ФЗ, RBI, AMLD), уровни KYC, CDD/EDD, sanctions screening (OFAC/EU/UN/UK/ЦБ РФ/RBI), transaction monitoring, SAR/STR, запрещённые юрисдикции, цели, хранение, обучение, MLRO.' },
    en: { title: 'AML / KYC Policy', body: '11 sections: regulation, KYC tiers, CDD/EDD, sanctions screening, monitoring, SAR/STR, prohibited jurisdictions, prohibited purposes, retention, training, MLRO contacts.' },
  },
  api: {
    ru: { title: 'Условия использования API', body: '11 секций: доступ (требуется KYC Tier 2/3), окружения (Sandbox/Production), HMAC-SHA256, rate limits, SLA 99.0–99.99%, webhooks (подпись + retry-цепочка 6 попыток), обязанности интегратора, запреты, версионирование (180 дней), прекращение, контакты.' },
    en: { title: 'API Terms', body: '11 sections: access (KYC Tier 2/3 required), environments, HMAC-SHA256 auth, rate limits, SLA, webhooks, integrator duties, prohibitions, versioning (180 days), termination, contacts.' },
  },
  cookies: {
    ru: { title: 'Cookie Policy', body: 'GDPR (Art. 7), ePrivacy, 152-ФЗ, India DPDP. 7 секций: что такое cookies, категории (Necessary/Functional/Analytics/Marketing), список (cp_lang, cp_consent, _ym_*, __cf_bm), как получаем согласие, управление, третьи стороны (Yandex.Metrika, Cloudflare), контакты.' },
    en: { title: 'Cookie Policy', body: '7 sections: definitions, categories, list, consent flow, management, third parties (Yandex.Metrika, Cloudflare), contacts.' },
  },
};

export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = PAGES[slug];
  if (!page) notFound();
  const lang = locale === 'en' ? 'en' : 'ru';
  return (
    <article className="section-pad" style={{ maxWidth: 760, margin: '0 auto', paddingTop: 140 }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 18, letterSpacing: '-0.5px' }}>{page[lang].title}</h1>
      <p style={{ color: 'var(--c-muted)', lineHeight: 1.8, fontSize: 16 }}>{page[lang].body}</p>
      <p style={{ color: 'var(--c-muted2)', fontSize: 13, marginTop: 32 }}>
        {locale === 'ru' ? 'Версия: 2026-04-27' : 'Version: 2026-04-27'}
      </p>
    </article>
  );
}
