export default function StaffPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / Сотрудники</p>
          <h1>Сотрудники</h1>
          <p className="lead">RBAC: 7 ролей · 2FA обязательно · IP-whitelist.</p>
        </div>
      </div>
      <section className="panel">
        <p style={{ color: 'var(--c-muted)' }}>
          Управление учётными записями staff производится через /admin/users с фильтром по роли.
          В разработке: отдельный экран с TOTP-секретами, IP-allowlist, статистикой логинов.
        </p>
      </section>
    </>
  );
}
