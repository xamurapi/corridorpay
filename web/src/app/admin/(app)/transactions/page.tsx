'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type Tx = {
  id: string; user_id: string; kind: string; status: string;
  from_currency: string; to_currency: string;
  amount_in_minor: number; amount_out_minor: number; fee_minor: number;
  purpose_code: string | null; created_at: string; completed_at: string | null;
};

const STATUSES = ['', 'created', 'risk_check', 'rate_locked', 'routed', 'psp_initiated', 'psp_confirmed', 'ledger_posted', 'payout_initiated', 'payout_completed', 'completed', 'failed', 'rejected', 'cancelled', 'refunded', 'expired', 'held_for_review'];

export default function AdminTransactionsPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');

  async function load() {
    const path = `/admin/v1/transactions?per_page=100${filter ? `&status=${filter}` : ''}`;
    try {
      const r = await api.get<{ items: Tx[]; total: number }>(path, { auth: 'admin' });
      setItems(r.items); setTotal(r.total);
    } catch {}
  }
  useEffect(() => { load(); }, [filter]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">Админ / Транзакции</p>
          <h1>Транзакции</h1>
          <p className="lead">Всего: {total}. Полный список с фильтрами по статусу.</p>
        </div>
        <select className="input" style={{ width: 240 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'Все'}</option>)}
        </select>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>ID</th><th>User</th><th>Kind</th><th>From → To</th><th>Сумма</th><th>Комиссия</th><th>Purpose</th><th>Статус</th><th>Дата</th></tr></thead>
            <tbody>
              {items.map((tx) => (
                <tr key={tx.id}>
                  <td className="mono">{tx.id.slice(0, 8)}…</td>
                  <td className="mono">{tx.user_id.slice(0, 8)}…</td>
                  <td>{tx.kind}</td>
                  <td>{tx.from_currency} → {tx.to_currency}</td>
                  <td className="num">{formatMoney(tx.amount_in_minor, tx.from_currency)} → {formatMoney(tx.amount_out_minor, tx.to_currency)}</td>
                  <td className="num">{formatMoney(tx.fee_minor, tx.from_currency)}</td>
                  <td>{tx.purpose_code || '—'}</td>
                  <td><span className={`status ${tx.status}`}>{tx.status}</span></td>
                  <td>{new Date(tx.created_at).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
