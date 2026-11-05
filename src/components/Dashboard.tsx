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
import { signed } from '../format';
import { useI18n } from '../i18n/I18nContext';

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
  const { t, tx, money } = useI18n();
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
        <h2 className="panel-title" id="dash-fin"><Coins size={16} aria-hidden /> {t('dash.finance')}</h2>
        <div className="stat-row">
          <span className="label">{t('dash.cash')} <Info text={t('dash.cashTip')} /></span>
        </div>
        <div className={`big-number${state.cash < 0 ? ' neg' : ''}`}>{money(state.cash)}</div>
        <div className="stat-row">
          <span className="label">{t('dash.net')} <Info text={t('dash.netTip')} /></span>
          <span className={`num ${state.lastNetRevenue < 0 ? 'down' : ''}`}>{fin ? money(state.lastNetRevenue) : '—'}</span>
        </div>
        <div className="stat-row"><span className="label">{t('dash.price')}</span><span className="num">${state.price}</span></div>
        <div className="stat-row"><span className="label">{t('dash.programs')}</span><span className="num">{money(programCost)}</span></div>
        <div className="stat-row"><span className="label">{t('dash.debt')}</span><span className="num">{money(debt)}</span></div>
      </section>

      <section className="panel" aria-labelledby="dash-park">
        <h2 className="panel-title" id="dash-park"><SquareParking size={16} aria-hidden /> {t('dash.parking')}</h2>
        <div className="stat-row">
          <span className="label">{t('dash.capacity')}</span>
          <span className="num">
            {t('dash.spaces', { n: cap.toLocaleString() })}
            {prev && cap !== prev.capacity && <span className={`delta ${cap > prev.capacity ? 'up' : 'down'}`}>{signed(cap - prev.capacity)}</span>}
          </span>
        </div>
        <div className="stat-row">
          <span className="label">{t('dash.demand')} <Info text={t('dash.demandTip')} /></span>
          <span className="num">{t('dash.cars', { n: demand.toLocaleString() })}</span>
        </div>
        <div className="occ-bar" aria-hidden="true" style={{ margin: '6px 0' }}>
          <div style={{ width: `${(cap > 0 ? Math.min(1, occupied / Math.max(cap, demand)) : 0) * 100}%`, background: 'var(--navy)' }} />
          {vacant > 0 && <div style={{ width: `${(vacant / cap) * 100}%`, background: 'repeating-linear-gradient(45deg, #ccc 0 4px, #e8e2d2 4px 8px)' }} />}
          {shortage > 0 && <div style={{ width: `${(shortage / demand) * 100}%`, background: 'var(--brick)' }} />}
        </div>
        <div className="stat-row small">
          <span className="label">{t('dash.occupancy', { pct: Math.round(occPct * 100) })}</span>
          {shortage > 0 ? (
            <span className="down num">{t('dash.short', { n: shortage.toLocaleString() })}</span>
          ) : (
            <span className="num muted">{t('dash.empty', { n: vacant.toLocaleString() })}</span>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="dash-stake">
        <h2 className="panel-title" id="dash-stake"><Users size={16} aria-hidden /> {t('dash.stakeholders')}</h2>
        <Meter label={t('ind.faculty')} value={state.ind.faculty} prev={prev?.faculty} tip={t('dash.facultyTip')} />
        <Meter label={t('ind.students')} value={state.ind.students} prev={prev?.students} tip={t('dash.studentsTip')} />
        <Meter label={t('ind.neighborhood')} value={state.ind.neighborhood} prev={prev?.neighborhood} tip={t('dash.neighborhoodTip')} />
      </section>

      <section className="panel" aria-labelledby="dash-sys">
        <h2 className="panel-title" id="dash-sys"><Gauge size={16} aria-hidden /> {t('dash.systems')}</h2>
        <Meter label={t('ind.sustainability')} icon={<Leaf size={13} aria-hidden />} value={state.ind.sustainability} prev={prev?.sustainability} tip={t('dash.sustainabilityTip')} />
        <Meter label={t('ind.autoDependence')} icon={<SquareParking size={13} aria-hidden />} value={state.ind.autoDependence} prev={prev?.autoDependence} invert tip={t('dash.autoTip')} />
        <Meter label={t('ind.inertia')} icon={<Lock size={13} aria-hidden />} value={state.ind.inertia} prev={prev?.inertia} invert tip={t('dash.inertiaTip')} />
      </section>

      <section className="panel" aria-labelledby="dash-land">
        <h2 className="panel-title" id="dash-land"><Building2 size={16} aria-hidden /> {t('dash.land')}</h2>
        <div className="stat-row">
          <span className="label">{t('dash.landAvail')} <Info text={t('dash.landTip')} /></span>
          <span className="num">{academicLand(state)} / 100</span>
        </div>
        {shortfall > 0 && <div className="stat-row small down">{t('dash.shortfall', { n: shortfall })}</div>}
      </section>

      <section className="panel" aria-labelledby="dash-commit">
        <h2 className="panel-title" id="dash-commit"><Landmark size={16} aria-hidden /> {t('dash.commitments')}</h2>
        {state.commitments.length === 0 && state.debts.length === 0 ? (
          <p className="small muted">{t('dash.none')}</p>
        ) : (
          <ul className="commit-list">
            {state.commitments.map((c) => {
              const cost = commitmentAnnualCost(state, c.id);
              return (
                <li key={c.id}>
                  <span>{tx(COMMITMENT_LABELS[c.id])} <span className="muted small">{t('dash.since', { year: c.since })}</span></span>
                  <span className="num small">{cost ? t('desk.perYear', { amount: money(cost) }) : '—'}</span>
                </li>
              );
            })}
            {state.debts.map((d, i) => {
              return (
                <li key={`d${i}`}>
                  <span>{tx(d.label)} <span className="muted small">{t('dash.yearsLeft', { n: d.turnsRemaining * 5 })}</span></span>
                  <span className="num small">{t('desk.perYear', { amount: money(d.annualPayment) })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
