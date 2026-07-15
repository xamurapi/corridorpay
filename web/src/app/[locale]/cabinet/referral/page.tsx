'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Me = { id: string; email: string; full_name: string | null; referral_code: string | null };

export default function ReferralPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
    api.get<Me>('/v1/me', { auth: 'user' }).then(setMe).catch(() => {});
  }, []);
  // Use the real referral_code issued by the backend (not a slice of the UUID).
  const code = me?.referral_code || '—';
  const link = me?.referral_code && origin ? `${origin}/auth/signup?ref=${code}` : '';

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
