import { ChevronRight, ScrollText } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { END_YEAR, type GameState, type Snapshot } from '../engine';
import { money, signed } from '../format';

type Row = { label: string; key: keyof Snapshot; fmt?: (n: number) => string; higherIsBetter?: boolean | null };

const ROWS: Row[] = [
  { label: 'Parking capacity', key: 'capacity', higherIsBetter: null },
  { label: 'Parking demand', key: 'demand', higherIsBetter: null },
  { label: 'Occupied spaces', key: 'occupied', higherIsBetter: null },
  { label: 'Permit price', key: 'price', fmt: (n) => `$${n}`, higherIsBetter: null },
  { label: 'Cash reserves', key: 'cash', fmt: money, higherIsBetter: true },
  { label: 'Net result / yr', key: 'netRevenue', fmt: money, higherIsBetter: true },
  { label: 'Faculty', key: 'faculty', higherIsBetter: true },
  { label: 'Students', key: 'students', higherIsBetter: true },
  { label: 'Neighborhood', key: 'neighborhood', higherIsBetter: true },
  { label: 'Sustainability', key: 'sustainability', higherIsBetter: true },
  { label: 'Automobile dependence', key: 'autoDependence', higherIsBetter: false },
  { label: 'Institutional inertia', key: 'inertia', higherIsBetter: false },
  { label: 'Land for academic use', key: 'academicLand', higherIsBetter: true },
];

export default function TurnReport({ state, onNext }: { state: GameState; onNext: () => void }) {
  const r = state.lastReport;
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus({ preventScroll: true }), [r?.year]);
  if (!r) return null;
  const f = r.annual;
  const final = r.endYear >= END_YEAR;

  return (
    <section className="panel" aria-labelledby="report-title">
      <div className="phase-label">Phase D — Five-Year Review</div>
      <h2 className="panel-title" id="report-title" style={{ marginTop: 2 }}>Review Period {r.year}–{r.endYear}</h2>
      <div style={{ display: "grid", gap: 14 }}>
        <table className="delta-table">
          <thead><tr><th>Indicator</th><th>{r.year}</th><th>{r.endYear}</th><th>Δ</th></tr></thead>
          <tbody>
            {ROWS.map((row) => {
              const a = r.before[row.key] as number;
              const b = r.after[row.key] as number;
              const d = b - a;
              const fmt = row.fmt ?? ((n: number) => n.toLocaleString());
              const cls = d === 0 || row.higherIsBetter === null ? 'flat' : (d > 0) === row.higherIsBetter ? 'up' : 'down';
              return (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="num">{fmt(a)}</td>
                  <td className="num">{fmt(b)}</td>
                  <td className={`num ${cls}`}>{row.fmt === money ? (d === 0 ? '±0' : `${d > 0 ? '+' : ''}${money(d)}`) : signed(d)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div>
          <h3 className="panel-title" style={{ fontSize: 13 }}>Annual Operating Statement</h3>
          <div className="fin-grid">
            <span>Permit revenue</span><span className="num">{money(f.permitRevenue)}</span>
            <span>Operations</span><span className="num">−{money(f.operatingCost)}</span>
            <span>Maintenance</span><span className="num">−{money(f.maintenanceCost)}</span>
            <span>Programs (TDM, leases, enforcement)</span><span className="num">−{money(f.programCost)}</span>
            <span>Debt service</span><span className="num">−{money(f.debtService)}</span>
            {f.interest > 0 && (<><span>Interest on deficit</span><span className="num">−{money(f.interest)}</span></>)}
            <span className="total">Net per year</span><span className={`num total ${f.net < 0 ? 'down' : ''}`}>{money(f.net)}</span>
            <span className="muted">× {f.years} years</span><span className="num muted">{money(f.net * f.years)}</span>
          </div>
          {r.notes.length > 0 && (
            <>
              <h3 className="panel-title" style={{ fontSize: 13, marginTop: 12 }}>Staff Notes</h3>
              <ul className="notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </>
          )}
        </div>
      </div>
      <div className="phase-label" style={{ marginTop: 14 }}>Phase E — Historical Record</div>
      <blockquote className="history-entry" style={{ marginTop: 6 }}>
        <ScrollText size={14} aria-hidden style={{ verticalAlign: '-2px', marginRight: 6 }} />
        {r.historyText}
      </blockquote>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button ref={btn} type="button" className="btn btn-gold btn-lg" onClick={onNext}>
          {final ? 'Read the Final Evaluation' : `Proceed to ${r.endYear}`} <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}
