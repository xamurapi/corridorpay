import { setRequestLocale } from 'next-intl/server';

const TIERS = [
  { name: 'Free', price: '0 ₽', tx_fee: '0.5%', fx_markup: '2.5%', limit: '$1k/мес', api: '—', priority: 'Email' },
  { name: 'Pro', price: '1 990 ₽/мес', tx_fee: '0.3%', fx_markup: '1.8%', limit: '$15k/мес', api: '600 req/min', priority: 'Email + chat' },
  { name: 'Business', price: '9 900 ₽/мес', tx_fee: '0.2%', fx_markup: '1.2%', limit: '$250k/мес', api: '3000 req/min', priority: 'Dedicated' },
  { name: 'Enterprise', price: 'индивидуально', tx_fee: 'от 0.1%', fx_markup: 'от 0.8%', limit: 'индивидуально', api: 'индивидуально', priority: '24/7 SLA' },
];

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ru = locale === 'ru';
  return (
    <section className="section-pad" style={{ paddingTop: 140 }}>
      <h1 className="section-title">{ru ? 'Тарифы' : 'Pricing'}</h1>
      <p className="section-sub">
        {ru ? 'Платите только за то, что используете. Прозрачно, без скрытых комиссий.' : 'Pay only for what you use. Transparent, no hidden fees.'}
      </p>
      <div style={{ maxWidth: 1100, margin: '40px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {TIERS.map((tier) => (
          <div key={tier.name} className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{tier.name}</h3>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>{tier.price}</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--c-muted)', fontSize: 14 }}>
              <li>· {ru ? 'Tx-комиссия' : 'TX fee'}: <b style={{ color: 'var(--c-text)' }}>{tier.tx_fee}</b></li>
              <li>· {ru ? 'FX маркап' : 'FX markup'}: <b style={{ color: 'var(--c-text)' }}>{tier.fx_markup}</b></li>
              <li>· {ru ? 'Лимит' : 'Limit'}: <b style={{ color: 'var(--c-text)' }}>{tier.limit}</b></li>
              <li>· API: <b style={{ color: 'var(--c-text)' }}>{tier.api}</b></li>
              <li>· {ru ? 'Поддержка' : 'Support'}: <b style={{ color: 'var(--c-text)' }}>{tier.priority}</b></li>
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
