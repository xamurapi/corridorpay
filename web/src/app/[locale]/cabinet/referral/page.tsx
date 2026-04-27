'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Me = { id: string; email: string; full_name: string | null };

export default function ReferralPage() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => { api.get<Me>('/v1/me', { auth: 'user' }).then(setMe).catch(() => {}); }, []);
  const code = me?.id?.slice(0, 8).toUpperCase() || 'XXXXXXXX';
  const link = typeof window !== 'undefined' ? `${window.location.origin}/auth/signup?ref=${code}` : '';

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / Рефералы</p>
          <h1>Реферальная программа</h1>
          <p className="lead">Приведите друга — получите $5 после его первой транзакции от $50.</p>
        </div>
      </div>
      <section className="panel">
        <div className="field"><label>Ваш реферальный код</label><input className="input mono" readOnly value={code} /></div>
        <div className="field"><label>Реферальная ссылка</label><input className="input mono" readOnly value={link} /></div>
      </section>
    </>
  );
}
