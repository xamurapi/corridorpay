'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type Tx = {
  id: string; status: string; from_currency: string; to_currency: string;
  amount_in_minor: number; amount_out_minor: number; fee_minor: number;
  created_at: string; recipient_snapshot: { full_name?: string };
};

export default function TransactionsPage() {
  const t = useTranslations('cabinet');
  const tStatus = useTranslations('tx_status');
  const [items, setItems] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const path = `/v1/transactions${filter ? `?status=${filter}` : ''}`;
    api.get<{ items: Tx[]; total: number }>(path, { auth: 'user' })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => {});
  }, [filter]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / {t('history')}</p>
          <h1>{t('history')}</h1>
          <p className="lead">Все ваши транзакции. Всего: {total}</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <select className="input" style={{ width: 220 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Все статусы</option>
            <option value="completed">Завершённые</option>
            <option value="failed">Ошибка</option>
            <option value="held_for_review">На проверке</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Получатель</th>
                <th>Направление</th>
                <th>Сумма</th>
                <th>Комиссия</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tx) => (
                <tr key={tx.id}>
                  <td className="mono">
                    <Link href={`/cabinet/transactions/${tx.id}`}>{tx.id.slice(0, 8)}…</Link>
                  </td>
                  <td>{tx.recipient_snapshot?.full_name || '—'}</td>
                  <td>{tx.from_currency} → {tx.to_currency}</td>
                  <td className="num">{formatMoney(tx.amount_in_minor, tx.from_currency)} → {formatMoney(tx.amount_out_minor, tx.to_currency)}</td>
                  <td className="num">{formatMoney(tx.fee_minor, tx.from_currency)}</td>
                  <td><span className={`status ${tx.status}`}>{tStatus(tx.status as never)}</span></td>
                  <td>{new Date(tx.created_at).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--c-muted)' }}>—</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
