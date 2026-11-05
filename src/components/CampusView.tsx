import { academicShortfall, academicTarget, capacity, countParcels, eraFor, type GameState } from '../engine';
import CampusMap from './CampusMap';
import Dashboard from './Dashboard';

export default function CampusView({ state }: { state: GameState }) {
  const rows: [string, number, string][] = [
    ['Academic buildings', countParcels(state, 'academic'), `Target for current enrollment: ${academicTarget(state)}`],
    ['Surface lots', countParcels(state, 'lot'), '250 spaces each'],
    ['Parking garages', countParcels(state, 'garage'), '800 spaces each'],
    ['Green spaces', countParcels(state, 'green'), 'Boost sustainability, students and neighbors'],
    ['Vacant parcels', countParcels(state, 'vacant'), 'Available for academic development'],
  ];
  return (
    <div className="page">
      <div className="page-inner">
        <h2>Campus Overview</h2>
        <p className="muted">{state.year} · {eraFor(state.year).name} · enrollment index {state.popIndex.toFixed(2)}× 1948 · regional transit quality {Math.round(state.transitQuality)}/100</p>
        <div className="two-col" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
          <div>
            <CampusMap state={state} />
            <section className="panel" style={{ marginTop: 12 }}>
              <h3 className="panel-title">Land Inventory (100 units, 5 per parcel)</h3>
              <table className="delta-table">
                <tbody>
                  {rows.map(([label, n, note]) => (
                    <tr key={label}><td>{label}<div className="small muted">{note}</div></td><td className="num">{n}</td><td className="num">{n * 5} units</td></tr>
                  ))}
                </tbody>
              </table>
              {academicShortfall(state) > 0 && <p className="small down" style={{ marginTop: 8 }}>The academic mission needs {academicShortfall(state)} more parcel(s) than it has.</p>}
              <p className="small muted" style={{ marginTop: 8 }}>
                Garages: {state.parcels.filter((p) => p.type === 'garage').map((p) => `${p.name ?? 'Garage'} (${Math.round(p.condition)}%)`).join(', ') || 'none'}.
                {state.flags.annexLot && ' Annex lot: 400 spaces on former rowhouse blocks.'}
                {' '}Effective capacity: {capacity(state).toLocaleString()} spaces.
              </p>
            </section>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Dashboard state={state} />
          </div>
        </div>
      </div>
    </div>
  );
}
