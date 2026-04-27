export default function ApiKeysPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / API-ключи</p>
          <h1>API-ключи</h1>
          <p className="lead">Доступ к API доступен с KYC Tier 2/3. HMAC-SHA256, idempotency-key, rate-limits по тарифу.</p>
        </div>
      </div>
      <section className="panel">
        <p style={{ color: 'var(--c-muted)' }}>
          Для получения API-ключа повысьте уровень KYC до Tier 2 и обратитесь в поддержку.
          В разработке: live + test-ключи, ротация, scopes, IP-allowlist, webhook-эндпоинты.
        </p>
      </section>
    </>
  );
}
