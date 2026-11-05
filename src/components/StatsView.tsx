import type { GameState } from '../engine';
import { money } from '../format';
import LineChart from './LineChart';

export default function StatsView({ state }: { state: GameState }) {
  const st = state.stats;
  const years = st.map((s) => s.year);
  const col = <K extends keyof (typeof st)[number]>(k: K) => st.map((s) => s[k] as number);
  return (
    <div className="page">
      <div className="page-inner">
        <h2>Statistics</h2>
        <p className="muted">Snapshots at the end of each review period. {st.length <= 1 && 'Complete a turn to start the record.'}</p>
        <div className="charts">
          <LineChart title="Parking Supply vs. Demand" years={years} series={[
            { label: 'Capacity', color: '#1f2a44', values: col('capacity') },
            { label: 'Demand', color: '#a5483a', values: col('demand') },
            { label: 'Occupied', color: '#d9a43a', values: col('occupied'), dashed: true },
          ]} />
          <LineChart title="Cash Reserves" years={years} fmt={money} series={[{ label: 'Cash', color: '#4d7a46', values: col('cash') }]} />
          <LineChart title="Stakeholder Satisfaction" years={years} min={0} max={100} series={[
            { label: 'Faculty', color: '#1f2a44', values: col('faculty') },
            { label: 'Students', color: '#d9a43a', values: col('students') },
            { label: 'Neighborhood', color: '#a5483a', values: col('neighborhood') },
          ]} />
          <LineChart title="Path Dependence & Sustainability" years={years} min={0} max={100} series={[
            { label: 'Automobile dependence', color: '#2d2d2d', values: col('autoDependence') },
            { label: 'Inertia', color: '#7e3329', values: col('inertia'), dashed: true },
            { label: 'Sustainability', color: '#4d7a46', values: col('sustainability') },
          ]} />
          <LineChart title="Permit Price (constant game dollars)" years={years} fmt={(n) => `$${Math.round(n)}`} series={[{ label: 'Annual permit', color: '#d9a43a', values: col('price') }]} />
          <LineChart title="Net Operating Result per Year" years={years} fmt={money} series={[{ label: 'Net', color: '#1f2a44', values: col('netRevenue') }]} />
        </div>
      </div>
    </div>
  );
}
