export default function AdminSettingsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / Настройки</p>
          <h1>Глобальные настройки</h1>
          <p className="lead">Feature-flags · kill-switch · system-wide лимиты.</p>
        </div>
      </div>
      <section className="panel">
        <ul style={{ listStyle: 'none', color: 'var(--c-muted)', fontSize: 14, lineHeight: 2 }}>
          <li>· Feature-flags: per-corridor, per-tier</li>
          <li>· Maintenance mode (соответствие prefers-reduce-motion для UI)</li>
          <li>· Kill-switch: отключить новые транзакции</li>
          <li>· Notification channels (email/SMS/push) configuration</li>
          <li>· Rate-limits override</li>
        </ul>
      </section>
    </>
  );
}
