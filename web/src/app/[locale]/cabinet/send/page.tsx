'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { formatMoney, formatRate, symbolFor, toMinor } from '@/lib/format';

type Recipient = { id: string; full_name: string; currency: string; country_iso2: string; method: string; identifier: string };
type Quote = { fx_rate: number; fx_rate_effective: number; fee_minor: number; amount_in_minor: number; amount_out_minor: number; markup_bps: number; rate_lock_ttl_sec: number };
type Lock = Quote & { lock_id: string; expires_at: string; from_currency: string; to_currency: string };
type Tx = { id: string; status: string; amount_in_minor: number; amount_out_minor: number; from_currency: string; to_currency: string };

const PURPOSE_CODES = ['family_support','goods_payment','services','salary','tuition','medical','other'];

export default function SendWizard() {
  const t = useTranslations('cabinet');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState('INR');
  const [to, setTo] = useState('RUB');
  const [amount, setAmount] = useState('50000');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientId, setRecipientId] = useState<string>('');
  const [purpose, setPurpose] = useState('family_support');
  const [lock, setLock] = useState<Lock | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tx, setTx] = useState<Tx | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Recipient[]>('/v1/recipients', { auth: 'user' }).then((r) => {
      setRecipients(r);
      if (r[0]) { setRecipientId(r[0].id); setTo(r[0].currency); }
    }).catch(() => {});
  }, []);

  // countdown
  useEffect(() => {
    if (!lock) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(lock.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [lock]);

  async function next() {
    setError(null);
    if (step === 1) {
      // Get quote + lock
      const v = parseFloat(amount.replace(/\s+/g, '').replace(',', '.'));
      if (!v) return setError('Введите сумму');
      try {
        setBusy(true);
        const l = await api.post<Lock>('/v1/quotes/lock', {
          from_currency: from, to_currency: to, amount_in_minor: toMinor(v, from),
        }, { auth: 'user' });
        setLock(l);
        setStep(2);
      } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    } else if (step === 2) {
      if (!recipientId) return setError('Выберите получателя');
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      // Confirm — create transaction
      if (!lock) return;
      try {
        setBusy(true);
        const created = await api.post<Tx>('/v1/transactions', {
          fx_lock_id: lock.lock_id,
          recipient_id: recipientId,
          purpose_code: purpose,
        }, { auth: 'user', headers: { 'Idempotency-Key': crypto.randomUUID() } });
        setTx(created);
        setStep(5);
      } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumbs">CorridorPay / {t('transfer_new')}</p>
          <h1>{t('transfer_new')}</h1>
          <p className="lead">{t('step')} {step} {t('of')} 5</p>
        </div>
      </div>

      <div className="wizard-steps">
        {[1,2,3,4,5].map((n) => <div key={n} className={`ws ${n < step ? 'done' : n === step ? 'active' : ''}`} />)}
      </div>

      <section className="panel">
        {step === 1 && (
          <>
            <div className="panel-head"><h2>{t('step1_amount')}</h2></div>
            <div className="field-row">
              <div className="field">
                <label>{t('you_send')}</label>
                <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="field">
                <label>Из</label>
                <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
                  {['RUB','INR','CNY','EUR','TRY','BYN','UZS','KZT','KGS','AMD','AZN','GEL','USD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>В</label>
                <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
                  {['RUB','INR','CNY','EUR','TRY','BYN','UZS','KZT','KGS','AMD','AZN','GEL','USD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="panel-head"><h2>{t('step2_recipient')}</h2></div>
            {recipients.length === 0 ? (
              <p style={{ color: 'var(--c-muted)', marginBottom: 14 }}>
                {t('no_recipients')} — <Link href="/cabinet/recipients" style={{ color: 'var(--c-accent2)' }}>добавьте первого</Link>
              </p>
            ) : (
              <div className="field">
                <label>Получатель</label>
                <select className="input" value={recipientId} onChange={(e) => { setRecipientId(e.target.value); const r = recipients.find(x => x.id === e.target.value); if (r) setTo(r.currency); }}>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} · {r.method.toUpperCase()} · {r.identifier}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="panel-head"><h2>{t('step3_method')}</h2></div>
            <div className="field">
              <label>{t('purpose')}</label>
              <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {PURPOSE_CODES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <p style={{ color: 'var(--c-muted)', fontSize: 13 }}>Источник средств: balance (баланс кошелька) — в проде PCI-iframe для карт.</p>
          </>
        )}

        {step === 4 && lock && (
          <>
            <div className="panel-head">
              <h2>{t('step4_review')}</h2>
              <span style={{ color: secondsLeft < 30 ? 'var(--c-red)' : 'var(--c-amber)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div className="card">
                <div className="card-title">Отправляете</div>
                <div className="card-value money">{symbolFor(lock.from_currency)} {formatMoney(lock.amount_in_minor, lock.from_currency)}</div>
              </div>
              <div className="card">
                <div className="card-title">Получит</div>
                <div className="card-value money">{symbolFor(lock.to_currency)} {formatMoney(lock.amount_out_minor, lock.to_currency)}</div>
              </div>
              <div className="card">
                <div className="card-title">{tCommon('rate')}</div>
                <div className="card-value money">{formatRate(lock.fx_rate_effective)}</div>
              </div>
              <div className="card">
                <div className="card-title">{tCommon('fee')}</div>
                <div className="card-value money">{formatMoney(lock.fee_minor, lock.from_currency)} {lock.from_currency}</div>
              </div>
            </div>
          </>
        )}

        {step === 5 && tx && (
          <>
            <div className="panel-head"><h2>{t('tx_completed')} ✅</h2></div>
            <p style={{ color: 'var(--c-muted)', marginBottom: 14 }}>{t('tx_id')}: <span className="mono">{tx.id}</span></p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href={`/cabinet/transactions/${tx.id}`} className="btn-primary">Открыть детали</Link>
              <Link href="/cabinet/dashboard" className="btn-secondary">{t('to_dashboard')}</Link>
            </div>
          </>
        )}

        {error && <p style={{ color: 'var(--c-red)', fontSize: 13, marginTop: 12 }}>{error}</p>}

        {step < 5 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 1 && <button className="btn-secondary" onClick={() => setStep(step - 1)}>{tCommon('back')}</button>}
            <button className="btn-primary" onClick={next} disabled={busy}>
              {busy ? '…' : (step === 4 ? t('confirm_transfer') : tCommon('next'))}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
