import { headers } from 'next/headers';

type Corridor = {
  code: string;
  country_name_ru: string;
  country_name_en: string;
  currency: string;
  flag: string;
  rail: string;
  primary_psp: string;
};

async function getCorridors(): Promise<Corridor[]> {
  const base = process.env.BACKEND_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${base}/v1/public/corridors`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function CorridorsGrid({ locale }: { locale: string }) {
  // headers() ensures dynamic rendering for the loader
  await headers();
  const corridors = await getCorridors();
  return (
    <div className="corridors-grid">
      {corridors.map((c) => (
        <div key={c.code} className="corridor-card">
          <div className="flag">{c.flag}</div>
          <h4>{locale === 'ru' ? c.country_name_ru : c.country_name_en}</h4>
          <div className="meta">
            <span>{c.currency}</span>
            <span style={{ color: 'var(--c-accent2)' }}>{c.rail}</span>
            <span style={{ fontSize: 12 }}>PSP: {c.primary_psp}</span>
          </div>
        </div>
      ))}
      {corridors.length === 0 && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--c-muted)', padding: 32 }}>
          API offline · 12 corridors будут загружены после старта backend
        </div>
      )}
    </div>
  );
}
