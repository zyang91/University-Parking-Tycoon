import { useMemo, useState } from 'react';
import { capacity, hasCommitment, type GameState, type Parcel } from '../engine';
import { useI18n, type I18n } from '../i18n/I18nContext';

const COLS = 5;
const PW = 56;
const PH = 50;
const GAP = 6;
const X0 = 28;
const Y0 = 58;

const HOUSE_COLORS = ['#b05a45', '#9a4e3c', '#c27a5a', '#8d6a52', '#a9634d', '#b88a62'];
const CAR_COLORS = ['#c0392b', '#2e5c8a', '#e0b84a', '#3f6e44', '#ece6d6', '#5b4a7a', '#222'];

function parcelPos(p: Parcel) {
  const c = p.id % COLS;
  const r = Math.floor(p.id / COLS);
  return { x: X0 + c * (PW + GAP), y: Y0 + r * (PH + GAP) };
}

function describe(p: Parcel, year: number, { t, tx }: I18n): string {
  switch (p.type) {
    case 'academic':
      return `${p.name ? tx(p.name) : t('map.academicBuilding')}${p.since > 1900 ? t('map.built', { year: p.since }) : t('map.historic')}`;
    case 'lot':
      return t('map.lotDesc', { year: p.since });
    case 'garage':
      return (
        t('map.garageDesc', { name: p.name ? tx(p.name) : t('map.parkingGarage'), year: p.since, cond: Math.round(p.condition) }) +
        (p.condition < 40 ? t('map.deteriorated') : '')
      );
    case 'green':
      return p.since > 1948 ? t('map.greenSince', { year: p.since }) : t('map.campusGreen');
    case 'vacant':
      return t('map.vacantDesc', { year });
  }
}

function Cars({ x, y, n, cols, seed }: { x: number; y: number; n: number; cols: number; seed: number }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push(
      <rect key={i} x={x + c * 8} y={y + r * 16} width={5} height={9} fill={CAR_COLORS[(i * 3 + seed) % CAR_COLORS.length]} stroke="#1b1b1b" strokeWidth={0.5} />,
    );
  }
  return <>{out}</>;
}

function ParcelShape({ p, occ, garageSign }: { p: Parcel; occ: number; garageSign: string }) {
  const { x, y } = parcelPos(p);
  switch (p.type) {
    case 'academic': {
      const windows = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) windows.push(<rect key={`${r}-${c}`} x={x + 9 + c * 8} y={y + 20 + r * 10} width={4} height={6} fill="#f1d48d" />);
      return (
        <>
          <rect x={x} y={y} width={PW} height={PH} fill="#cdbf9a" />
          <rect x={x + 4} y={y + 14} width={PW - 8} height={PH - 18} fill="#a5483a" stroke="#5e2a22" />
          <polygon points={`${x + 2},${y + 15} ${x + PW / 2},${y + 3} ${x + PW - 2},${y + 15}`} fill="#3a3a44" />
          {windows}
          <rect x={x + PW / 2 - 4} y={y + PH - 12} width={8} height={8} fill="#3b2a1d" />
        </>
      );
    }
    case 'lot': {
      const slots = 12;
      const n = Math.round(Math.min(1, occ) * slots);
      const lines = [];
      for (let i = 0; i <= 6; i++) {
        lines.push(<line key={`a${i}`} x1={x + 4 + i * 8} y1={y + 6} x2={x + 4 + i * 8} y2={y + 18} stroke="#eee" strokeWidth={0.8} />);
        lines.push(<line key={`b${i}`} x1={x + 4 + i * 8} y1={y + 30} x2={x + 4 + i * 8} y2={y + 42} stroke="#eee" strokeWidth={0.8} />);
      }
      return (
        <>
          <rect x={x} y={y} width={PW} height={PH} fill="#6b6b6b" />
          {lines}
          <Cars x={x + 5.5} y={y + 7.5} n={Math.min(6, n)} cols={6} seed={p.id} />
          <Cars x={x + 5.5} y={y + 31.5} n={Math.max(0, n - 6)} cols={6} seed={p.id + 2} />
          <text x={x + PW - 9} y={y + 27} fontSize={9} fill="#f1d48d" fontWeight={700}>P</text>
        </>
      );
    }
    case 'garage': {
      const worn = p.condition < 40;
      const levels = 4;
      const filled = Math.round(Math.min(1, occ) * levels * 4);
      const dots = [];
      for (let l = 0; l < levels; l++) {
        for (let i = 0; i < 4; i++) {
          const k = l * 4 + i;
          if (k < filled) dots.push(<rect key={k} x={x + 8 + i * 9} y={y + 10 + l * 9} width={5} height={3} fill={CAR_COLORS[(k + p.id) % CAR_COLORS.length]} />);
        }
      }
      return (
        <>
          <rect x={x} y={y} width={PW} height={PH} fill="#8e8a80" />
          <polygon points={`${x + PW - 10},${y + 4} ${x + PW - 2},${y + 10} ${x + PW - 2},${y + PH - 2} ${x + PW - 10},${y + PH - 8}`} fill={worn ? '#6f5f4a' : '#77736a'} />
          <rect x={x + 3} y={y + 4} width={PW - 13} height={PH - 12} fill={worn ? '#a39276' : '#c3beb2'} stroke="#4a4740" />
          {[0, 1, 2, 3].map((l) => (
            <rect key={l} x={x + 3} y={y + 7 + l * 9} width={PW - 13} height={2} fill="#4a4740" />
          ))}
          {dots}
          {worn && <path d={`M${x + 12} ${y + 6} l4 8 l-3 6 l5 10`} stroke="#3b2a1d" strokeWidth={1} fill="none" />}
          <text x={x + 5} y={y + PH - 1} fontSize={7} fill="#1f2a44" fontWeight={700}>{garageSign}</text>
        </>
      );
    }
    case 'green': {
      return (
        <>
          <rect x={x} y={y} width={PW} height={PH} fill="#6f9c5c" />
          <rect x={x + 2} y={y + PH / 2 - 1} width={PW - 4} height={2} fill="#d8c9a0" />
          {[[12, 12], [40, 14], [16, 36], [42, 38], [28, 25]].map(([dx, dy], i) => (
            <g key={i}>
              <rect x={x + dx - 1} y={y + dy + 3} width={2} height={5} fill="#5a3d24" />
              <circle cx={x + dx} cy={y + dy} r={6} fill={i % 2 ? '#3f6e3a' : '#4d7a46'} />
            </g>
          ))}
        </>
      );
    }
    case 'vacant':
    default: {
      return (
        <>
          <rect x={x} y={y} width={PW} height={PH} fill="#cbb98b" />
          {[[8, 10], [30, 18], [44, 8], [14, 34], [38, 40], [24, 30]].map(([dx, dy], i) => (
            <path key={i} d={`M${x + dx} ${y + dy} l2 -4 l2 4`} stroke="#8a7a4a" fill="none" strokeWidth={1} />
          ))}
        </>
      );
    }
  }
}

interface Props {
  state: GameState;
  compact?: boolean;
  interactive?: boolean;
}

export default function CampusMap({ state, interactive = true }: Props) {
  const i18n = useI18n();
  const { t } = i18n;
  const [selected, setSelected] = useState<number | null>(null);
  const cap = capacity(state);
  const occ = cap > 0 ? Math.min(1, state.demand / cap) : 0;
  const shortage = state.demand > 0 ? Math.max(0, state.demand - cap) / state.demand : 0;
  const spillCars = Math.min(16, Math.round(shortage * 34));
  const busMode = state.year >= 1958 ? 'bus' : 'streetcar';
  const showTransit = state.transitQuality > 35;

  const houses = useMemo(() => {
    const top = [];
    const bottom = [];
    for (let i = 0; i < 16; i++) {
      const annexed = state.flags.annexLot && i >= 11;
      if (!annexed) top.push(<g key={`t${i}`}><rect x={i * 23} y={6} width={21} height={22} fill={HOUSE_COLORS[i % HOUSE_COLORS.length]} stroke="#4a2a20" strokeWidth={0.5} /><rect x={i * 23 + 4} y={12} width={4} height={5} fill="#f1d48d" /><rect x={i * 23 + 12} y={12} width={4} height={5} fill="#f1d48d" /><rect x={i * 23 + 8} y={21} width={5} height={7} fill="#3b2a1d" /></g>);
      bottom.push(<g key={`b${i}`}><rect x={i * 23} y={308} width={21} height={20} fill={HOUSE_COLORS[(i + 3) % HOUSE_COLORS.length]} stroke="#4a2a20" strokeWidth={0.5} /><rect x={i * 23 + 4} y={312} width={4} height={5} fill="#f1d48d" /><rect x={i * 23 + 12} y={312} width={4} height={5} fill="#f1d48d" /></g>);
    }
    return { top, bottom };
  }, [state.flags.annexLot]);

  const sel = selected !== null ? state.parcels[selected] : null;
  const counts = state.parcels.reduce<Record<string, number>>((m, p) => ((m[p.type] = (m[p.type] ?? 0) + 1), m), {});
  const ariaSummary =
    t('map.summary', { year: state.year, a: counts.academic ?? 0, l: counts.lot ?? 0, g: counts.garage ?? 0, gr: counts.green ?? 0, v: counts.vacant ?? 0 }) +
    (spillCars > 0 ? t('map.spill') : '');

  return (
    <div className="map-wrap">
      <svg className="campus-svg" viewBox="0 0 360 332" role="group" aria-label={ariaSummary}>
        <rect x={0} y={0} width={360} height={332} fill="#d9cfae" />
        {/* North neighborhood */}
        {houses.top}
        {state.flags.annexLot && (
          <g>
            <rect x={253} y={4} width={107} height={26} fill="#6b6b6b" />
            <text x={262} y={21} fontSize={8} fill="#f1d48d" fontWeight={700}>{t('map.annex')}</text>
          </g>
        )}
        {/* Elm Street with spillover parking */}
        <rect x={0} y={33} width={360} height={14} fill="#55524c" />
        <line x1={0} y1={40} x2={360} y2={40} stroke="#d9c86a" strokeDasharray="6 5" strokeWidth={1} />
        {Array.from({ length: spillCars }).map((_, i) => (
          <rect key={i} x={6 + i * 22} y={34} width={10} height={5} fill={CAR_COLORS[i % CAR_COLORS.length]} stroke="#111" strokeWidth={0.4} />
        ))}
        <text x={292} y={45} fontSize={5} fill="#e9dfc8">{t('map.elm')}</text>
        {/* Campus boundary */}
        <rect x={X0 - 6} y={Y0 - 4} width={COLS * (PW + GAP) + 6} height={4 * (PH + GAP) + 2} fill="#e3d8b6" stroke="#4d7a46" strokeWidth={2} strokeDasharray="3 2" />
        {state.parcels.map((p) => {
          const { x, y } = parcelPos(p);
          const label = describe(p, state.year, i18n);
          return (
            <g
              key={`${p.id}-${p.type}-${p.since}`}
              className={`parcel parcel-new${selected === p.id ? ' selected' : ''}`}
              tabIndex={interactive ? 0 : -1}
              role={interactive ? 'button' : undefined}
              aria-label={label}
              onClick={() => interactive && setSelected(p.id === selected ? null : p.id)}
              onKeyDown={(e) => {
                if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setSelected(p.id === selected ? null : p.id);
                }
              }}
            >
              <title>{label}</title>
              <ParcelShape p={p} occ={occ} garageSign={t('map.garageSign')} />
              <rect className="parcel-outline" x={x} y={y} width={PW} height={PH} fill="none" stroke="#2d2d2d" strokeWidth={1} />
            </g>
          );
        })}
        {/* Westbridge Avenue */}
        <rect x={0} y={284} width={360} height={20} fill="#4a4741" />
        <line x1={0} y1={294} x2={360} y2={294} stroke="#d9c86a" strokeDasharray="8 6" strokeWidth={1} />
        {hasCommitment(state, 'bikeInfra') && <line x1={0} y1={286} x2={360} y2={286} stroke="#6fbf5c" strokeWidth={2} strokeDasharray="4 3" />}
        {showTransit && (
          <g className="car-drive">
            <rect x={0} y={287} width={busMode === 'bus' ? 26 : 30} height={8} fill={busMode === 'bus' ? '#d9a43a' : '#7e3329'} stroke="#111" strokeWidth={0.6} />
            <rect x={3} y={288} width={20} height={3} fill="#cfe3f0" />
          </g>
        )}
        {hasCommitment(state, 'shuttle') && (
          <g className="car-drive" style={{ animationDelay: '-4.5s', animationDuration: '7s' }}>
            <rect x={0} y={296} width={18} height={7} fill="#1f2a44" stroke="#f1d48d" strokeWidth={0.6} />
            <text x={2} y={302} fontSize={5} fill="#f1d48d">{t('map.shuttleSign')}</text>
          </g>
        )}
        <text x={270} y={302} fontSize={5} fill="#e9dfc8">{t('map.ave')}</text>
        {houses.bottom}
      </svg>
      {interactive && (
        <>
          <div className="map-legend" aria-hidden="true">
            <span><i className="swatch" style={{ background: '#a5483a' }} />{t('map.academic')}</span>
            <span><i className="swatch" style={{ background: '#6b6b6b' }} />{t('map.lot')}</span>
            <span><i className="swatch" style={{ background: '#c3beb2' }} />{t('map.garage')}</span>
            <span><i className="swatch" style={{ background: '#6f9c5c' }} />{t('map.green')}</span>
            <span><i className="swatch" style={{ background: '#cbb98b' }} />{t('map.vacant')}</span>
          </div>
          <div className="parcel-info" aria-live="polite">
            {sel ? describe(sel, state.year, i18n) : <span className="muted">{t('map.prompt')}</span>}
          </div>
        </>
      )}
    </div>
  );
}
