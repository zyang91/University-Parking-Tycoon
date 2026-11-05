import { Building2, Coins, Gauge, Landmark, Leaf, Lock, SquareParking, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  academicLand,
  academicShortfall,
  capacity,
  commitmentAnnualCost,
  COMMITMENT_LABELS,
  type GameState,
} from '../engine';
import { money, signed } from '../format';

export function Info({ text }: { text: string }) {
  return (
    <button type="button" className="info" aria-label={text}>
      ?
      <span className="tip" role="tooltip">{text}</span>
    </button>
  );
}

function meterColor(v: number, invert = false) {
  const x = invert ? 100 - v : v;
  if (x >= 60) return 'var(--green)';
  if (x >= 40) return 'var(--gold)';
  return 'var(--brick)';
}

export function Meter({ label, value, prev, invert, tip, icon }: { label: string; value: number; prev?: number; invert?: boolean; tip: string; icon?: ReactNode }) {
  const d = prev === undefined ? 0 : Math.round(value) - Math.round(prev);
  return (
    <div className="meter">
      <div className="meter-top">
        <span className="stat-row label" style={{ padding: 0 }}>{icon}{label} <Info text={tip} /></span>
        <span className="num">
          {Math.round(value)}
          {d !== 0 && <span className={`delta ${(d > 0) !== !!invert ? 'up' : 'down'}`}>{signed(d)}</span>}
        </span>
      </div>
      <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label}>
        <div key={Math.round(value)} className="meter-fill flash" style={{ width: `${value}%`, background: meterColor(value, invert) }} />
      </div>
    </div>
  );
}

export default function Dashboard({ state }: { state: GameState }) {
  const prev = state.stats.length >= 2 ? state.stats[state.stats.length - 2] : undefined;
  const cap = capacity(state);
  const demand = state.demand;
  const occupied = Math.min(cap, demand);
  const shortage = Math.max(0, demand - cap);
  const vacant = Math.max(0, cap - demand);
  const occPct = cap > 0 ? occupied / cap : 0;
  const shortfall = academicShortfall(state);
  const fin = state.lastFinancials;
  const programCost = state.commitments.reduce((s, c) => s + commitmentAnnualCost(state, c.id), 0);
  const debt = state.debts.reduce((s, d) => s + d.annualPayment, 0);

  return (
    <>
      <section className="panel" aria-labelledby="dash-fin">
        <h2 className="panel-title" id="dash-fin"><Coins size={16} aria-hidden /> Financial Health</h2>
        <div className="stat-row">
          <span className="label">Cash reserves <Info text="University parking reserves in constant game dollars. Negative reserves borrow from a $1M credit line at 4% interest." /></span>
        </div>
        <div className={`big-number${state.cash < 0 ? ' neg' : ''}`}>{money(state.cash)}</div>
        <div className="stat-row">
          <span className="label">Net operating result / yr <Info text="Permit revenue minus operations, maintenance, program costs, debt service and interest. Construction spending is a capital cost, not included here." /></span>
          <span className={`num ${state.lastNetRevenue < 0 ? 'down' : ''}`}>{fin ? money(state.lastNetRevenue) : '—'}</span>
        </div>
        <div className="stat-row"><span className="label">Annual permit price</span><span className="num">${state.price}</span></div>
        <div className="stat-row"><span className="label">Program commitments / yr</span><span className="num">{money(programCost)}</span></div>
        <div className="stat-row"><span className="label">Debt service / yr</span><span className="num">{money(debt)}</span></div>
      </section>

      <section className="panel" aria-labelledby="dash-park">
        <h2 className="panel-title" id="dash-park"><SquareParking size={16} aria-hidden /> Parking</h2>
        <div className="stat-row"><span className="label">Capacity</span><span className="num">{cap.toLocaleString()} spaces{prev && cap !== prev.capacity && <span className={`delta ${cap > prev.capacity ? 'up' : 'down'}`}>{signed(cap - prev.capacity)}</span>}</span></div>
        <div className="stat-row">
          <span className="label">Demand <Info text="Cars seeking parking. Rises with enrollment and automobile dependence; falls with higher prices, transit quality and TDM programs. Spare capacity slowly induces new demand." /></span>
          <span className="num">{demand.toLocaleString()} cars</span>
        </div>
        <div className="occ-bar" aria-hidden="true" style={{ margin: '6px 0' }}>
          <div style={{ width: `${(cap > 0 ? Math.min(1, occupied / Math.max(cap, demand)) : 0) * 100}%`, background: 'var(--navy)' }} />
          {vacant > 0 && <div style={{ width: `${(vacant / cap) * 100}%`, background: 'repeating-linear-gradient(45deg, #ccc 0 4px, #e8e2d2 4px 8px)' }} />}
          {shortage > 0 && <div style={{ width: `${(shortage / demand) * 100}%`, background: 'var(--brick)' }} />}
        </div>
        <div className="stat-row small">
          <span className="label">Occupancy {Math.round(occPct * 100)}%</span>
          {shortage > 0 ? <span className="down num">{shortage.toLocaleString()} short</span> : <span className="num muted">{vacant.toLocaleString()} empty</span>}
        </div>
      </section>

      <section className="panel" aria-labelledby="dash-stake">
        <h2 className="panel-title" id="dash-stake"><Users size={16} aria-hidden /> Stakeholders</h2>
        <Meter label="Faculty" value={state.ind.faculty} prev={prev?.faculty} tip="Dislike prices (especially when car-dependent), shortages and losing spaces. Love privileges." />
        <Meter label="Students" value={state.ind.students} prev={prev?.students} tip="Value transit, bikes, shuttles, green space, and fairness. Dislike reserved-space privileges." />
        <Meter label="Neighborhood" value={state.ind.neighborhood} prev={prev?.neighborhood} tip="Damaged by spillover parking, garage traffic and campus expansion. Improved by shuttles, shared parking and green space." />
      </section>

      <section className="panel" aria-labelledby="dash-sys">
        <h2 className="panel-title" id="dash-sys"><Gauge size={16} aria-hidden /> Campus Systems</h2>
        <Meter label="Sustainability" icon={<Leaf size={13} aria-hidden />} value={state.ind.sustainability} prev={prev?.sustainability} tip="Environmental performance. Drifts toward a target set by car dependence, paved land, green space and TDM programs." />
        <Meter label="Automobile dependence" icon={<SquareParking size={13} aria-hidden />} value={state.ind.autoDependence} prev={prev?.autoDependence} invert tip="Share of affiliates who expect to drive. Abundant, cheap parking raises it; scarcity, pricing and alternatives lower it. Changes slowly." />
        <Meter label="Institutional inertia" icon={<Lock size={13} aria-hidden />} value={state.ind.inertia} prev={prev?.inertia} invert tip="Path dependence. Garages, lots and entitlements raise it; it makes conversions, price hikes and revocations costlier. Decays slowly, faster with TDM programs." />
      </section>

      <section className="panel" aria-labelledby="dash-land">
        <h2 className="panel-title" id="dash-land"><Building2 size={16} aria-hidden /> Land</h2>
        <div className="stat-row">
          <span className="label">Land for academic development <Info text="Vacant land units. The university builds on vacant land as it grows; when none is left it paves over greens, then runs a shortfall." /></span>
          <span className="num">{academicLand(state)} / 100</span>
        </div>
        {shortfall > 0 && <div className="stat-row small down">Academic shortfall: {shortfall} parcel{shortfall > 1 ? 's' : ''}</div>}
      </section>

      <section className="panel" aria-labelledby="dash-commit">
        <h2 className="panel-title" id="dash-commit"><Landmark size={16} aria-hidden /> Policy Commitments</h2>
        {state.commitments.length === 0 && state.debts.length === 0 ? (
          <p className="small muted">No standing commitments. Yet.</p>
        ) : (
          <ul className="commit-list">
            {state.commitments.map((c) => (
              <li key={c.id}>
                <span>{COMMITMENT_LABELS[c.id]} <span className="muted small">since {c.since}</span></span>
                <span className="num small">{commitmentAnnualCost(state, c.id) ? `${money(commitmentAnnualCost(state, c.id))}/yr` : '—'}</span>
              </li>
            ))}
            {state.debts.map((d, i) => (
              <li key={`d${i}`}>
                <span>{d.label} <span className="muted small">{d.turnsRemaining * 5} yrs left</span></span>
                <span className="num small">{money(d.annualPayment)}/yr</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
