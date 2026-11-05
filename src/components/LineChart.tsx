interface Series {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

interface Props {
  title: string;
  years: number[];
  series: Series[];
  fmt?: (n: number) => string;
  min?: number;
  max?: number;
}

const W = 460;
const H = 200;
const PAD = { l: 48, r: 12, t: 10, b: 24 };

export default function LineChart({ title, years, series, fmt = (n) => String(Math.round(n)), min, max }: Props) {
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  let lo = min ?? Math.min(0, ...all);
  let hi = max ?? Math.max(1, ...all);
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.05;
  if (min === undefined) lo -= lo < 0 ? pad : 0;
  if (max === undefined) hi += pad;
  const x = (i: number) => PAD.l + (years.length <= 1 ? 0 : (i / (years.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  const summary = series.map((s) => `${s.label}: ${fmt(s.values[0] ?? 0)} to ${fmt(s.values[s.values.length - 1] ?? 0)}`).join('; ');

  return (
    <figure className="panel chart" style={{ margin: 0 }}>
      <figcaption className="panel-title">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${summary}`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#d8cba8" strokeDasharray="3 3" />
            <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {lo < 0 && hi > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="#a5483a" />}
        {years.map((yr, i) => (i % 2 === 0 || i === years.length - 1) && (
          <text key={yr} x={x(i)} y={H - 6} textAnchor="middle">{yr}</text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeDasharray={s.dashed ? '6 4' : undefined}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          />
        ))}
        {series.map((s) => s.values.length > 0 && (
          <circle key={`${s.label}-end`} cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={3.5} fill={s.color} />
        ))}
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
    </figure>
  );
}
