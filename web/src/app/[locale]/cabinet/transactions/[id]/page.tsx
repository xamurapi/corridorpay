'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type Timeline = { status: string; note?: string | null; actor_type: string; created_at: string };
type TxDetail = {
  id: string; status: string; from_currency: string; to_currency: string;
  amount_in_minor: number; amount_out_minor: number; fee_minor: number;
  fx_rate_locked: number | null; purpose_code: string | null;
  recipient_snapshot: Record<string, string>; created_at: string; completed_at: string | null;
  timeline: Timeline[];
};

export default function TxDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tStatus = useTranslations('tx_status');
  const [tx, setTx] = useState<TxDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<TxDetail>(`/v1/transactions/${id}`, { auth: 'user' }).then(setTx).catch(() => {});
  }, [id]);

  if (!tx) return <div>Загрузка…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">
            <Link href="/cabinet/transactions">История</Link> / {tx.id.slice(0, 8)}…
          </p>
          <h1>Транзакция</h1>
          <p className="lead">
            <span className={`status ${tx.status}`}>{tStatus(tx.status as never)}</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="metric-grid">
        <div className="card">
          <div className="card-title">Отправлено</div>
          <div className="card-value money">{formatMoney(tx.amount_in_minor, tx.from_currency)} {tx.from_currency}</div>
        </div>
        <div className="card">
          <div className="card-title">Получено</div>
          <div className="card-value money">{formatMoney(tx.amount_out_minor, tx.to_currency)} {tx.to_currency}</div>
        </div>
        <div className="card">
          <div className="card-title">Курс (locked)</div>
          <div className="card-value money">{tx.fx_rate_locked?.toFixed(6) ?? '—'}</div>
        </div>
        <div className="card">
          <div className="card-title">Комиссия</div>
          <div className="card-value money">{formatMoney(tx.fee_minor, tx.from_currency)} {tx.from_currency}</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Получатель</h2></div>
        <pre style={{ fontSize: 13, color: 'var(--c-muted)', whiteSpace: 'pre-wrap' }}>{JSON.stringify(tx.recipient_snapshot, null, 2)}</pre>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Хронология</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tx.timeline.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className={`status ${s.status}`}>{tStatus(s.status as never)}</span>
              <span style={{ color: 'var(--c-muted)', fontSize: 13 }}>{new Date(s.created_at).toLocaleString('ru-RU')}</span>
              {s.note && <span style={{ fontSize: 13 }}>{s.note}</span>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
