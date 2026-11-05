import { ChevronRight, ScrollText } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { END_YEAR, type GameState, type Snapshot } from '../engine';
import { signed } from '../format';
import { useI18n } from '../i18n/I18nContext';
import type { StringKey } from '../i18n/strings';

type Row = { label: StringKey; key: keyof Snapshot; kind?: 'money' | 'price'; higherIsBetter: boolean | null };

const ROWS: Row[] = [
  { label: 'report.capacity', key: 'capacity', higherIsBetter: null },
  { label: 'report.demand', key: 'demand', higherIsBetter: null },
  { label: 'report.occupied', key: 'occupied', higherIsBetter: null },
  { label: 'report.price', key: 'price', kind: 'price', higherIsBetter: null },
  { label: 'report.cash', key: 'cash', kind: 'money', higherIsBetter: true },
  { label: 'report.net', key: 'netRevenue', kind: 'money', higherIsBetter: true },
  { label: 'ind.faculty', key: 'faculty', higherIsBetter: true },
  { label: 'ind.students', key: 'students', higherIsBetter: true },
  { label: 'ind.neighborhood', key: 'neighborhood', higherIsBetter: true },
  { label: 'ind.sustainability', key: 'sustainability', higherIsBetter: true },
  { label: 'ind.autoDependence', key: 'autoDependence', higherIsBetter: false },
  { label: 'ind.inertia', key: 'inertia', higherIsBetter: false },
  { label: 'report.academicLand', key: 'academicLand', higherIsBetter: true },
];

export default function TurnReport({ state, onNext }: { state: GameState; onNext: () => void }) {
  const { t, tx, money } = useI18n();
  const r = state.lastReport;
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus({ preventScroll: true }), [r?.year]);
  if (!r) return null;
  const f = r.annual;
  const final = r.endYear >= END_YEAR;

  const fmt = (row: Row, n: number) => (row.kind === 'money' ? money(n) : row.kind === 'price' ? `$${n}` : n.toLocaleString());
  const fmtDelta = (row: Row, d: number) => {
    if (row.kind === 'money') return d === 0 ? '±0' : `${d > 0 ? '+' : ''}${money(d)}`;
    return signed(d);
  };

  return (
    <section className="panel" aria-labelledby="report-title">
      <div className="phase-label">{t('phase.d')}</div>
      <h2 className="panel-title" id="report-title" style={{ marginTop: 2 }}>{t('report.title', { from: r.year, to: r.endYear })}</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        <table className="delta-table">
          <thead><tr><th>{t('report.indicator')}</th><th>{r.year}</th><th>{r.endYear}</th><th>Δ</th></tr></thead>
          <tbody>
            {ROWS.map((row) => {
              const a = r.before[row.key] as number;
              const b = r.after[row.key] as number;
              const d = b - a;
              const cls = d === 0 || row.higherIsBetter === null ? 'flat' : (d > 0) === row.higherIsBetter ? 'up' : 'down';
              return (
                <tr key={row.key}>
                  <td>{t(row.label)}</td>
                  <td className="num">{fmt(row, a)}</td>
                  <td className="num">{fmt(row, b)}</td>
                  <td className={`num ${cls}`}>{fmtDelta(row, d)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div>
          <h3 className="panel-title" style={{ fontSize: 13 }}>{t('report.statement')}</h3>
          <div className="fin-grid">
            <span>{t('report.revenue')}</span><span className="num">{money(f.permitRevenue)}</span>
            <span>{t('report.operations')}</span><span className="num">−{money(f.operatingCost)}</span>
            <span>{t('report.maintenance')}</span><span className="num">−{money(f.maintenanceCost)}</span>
            <span>{t('report.programs')}</span><span className="num">−{money(f.programCost)}</span>
            <span>{t('report.debt')}</span><span className="num">−{money(f.debtService)}</span>
            {f.interest > 0 && (<><span>{t('report.interest')}</span><span className="num">−{money(f.interest)}</span></>)}
            <span className="total">{t('report.netPerYear')}</span><span className={`num total ${f.net < 0 ? 'down' : ''}`}>{money(f.net)}</span>
            <span className="muted">{t('report.times', { n: f.years })}</span><span className="num muted">{money(f.net * f.years)}</span>
          </div>
          {r.notes.length > 0 && (
            <>
              <h3 className="panel-title" style={{ fontSize: 13, marginTop: 12 }}>{t('report.notes')}</h3>
              <ul className="notes">{r.notes.map((n, i) => <li key={i}>{tx(n)}</li>)}</ul>
            </>
          )}
        </div>
      </div>
      <div className="phase-label" style={{ marginTop: 14 }}>{t('phase.e')}</div>
      <blockquote className="history-entry" style={{ marginTop: 6 }}>
        <ScrollText size={14} aria-hidden style={{ verticalAlign: '-2px', marginRight: 6 }} />
        {tx(r.historyText)}
      </blockquote>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button ref={btn} type="button" className="btn btn-gold btn-lg" onClick={onNext}>
          {final ? t('report.final') : t('report.proceed', { year: r.endYear })} <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}
