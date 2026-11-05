import { Bus, Check, ChevronRight, Coins, Gavel, Landmark, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import {
  CATEGORY_LABELS,
  getBriefing,
  getPolicy,
  isEraAvailable,
  isReversal,
  MAX_ACTIONS_PER_TURN,
  policyBlocker,
  POLICIES,
  turnLength,
  type GameState,
  type PolicyCategory,
} from '../engine';
import { money } from '../format';

const CAT_ICONS: Record<PolicyCategory, JSX.Element> = {
  pricing: <Coins size={14} aria-hidden />,
  infrastructure: <Landmark size={14} aria-hidden />,
  tdm: <Bus size={14} aria-hidden />,
  administrative: <Gavel size={14} aria-hidden />,
};

export function BriefingCard({ state }: { state: GameState }) {
  const b = getBriefing(state);
  return (
    <section className="panel panel-dark" aria-labelledby="briefing-title">
      <div className="phase-label" style={{ color: 'var(--gold-soft)' }}>Phase A — Presidential Briefing</div>
      <div className="briefing-head">
        <div>
          <h2 id="briefing-title" className="sr-only">Briefing for {b.year}</h2>
          <div className="briefing-year">{b.year}</div>
        </div>
        <div className="briefing-era">
          <strong>{b.eraName}</strong>
          <div>{b.eraTheme}</div>
          <div className="num" style={{ opacity: 0.7 }}>Review period: {b.year}–{b.year + turnLength(b.year)}</div>
        </div>
      </div>
      <p className="quote">“{b.message}”</p>
      <div className="quote-attrib">— {b.president}</div>
      <div className={`crisis ${b.crisis.severity}`} role="status">
        <TriangleAlert size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>{b.crisis.title}</strong>
          <p>{b.crisis.text}</p>
        </div>
      </div>
    </section>
  );
}

interface Props {
  state: GameState;
  selected: string[];
  onToggle: (id: string) => void;
  onSubmit: () => void;
}

export default function PolicyDesk({ state, selected, onToggle, onSubmit }: Props) {
  const [cat, setCat] = useState<PolicyCategory>('pricing');
  const cats: PolicyCategory[] = ['pricing', 'infrastructure', 'tdm', 'administrative'];
  const visible = (category: PolicyCategory) =>
    POLICIES.filter((p) => p.category === category && (!isReversal(p) || !p.unavailable?.(state)));
  const totalCost = selected.reduce((s, id) => s + (getPolicy(id)?.cost(state) ?? 0), 0);

  return (
    <>
      <BriefingCard state={state} />
      <section className="panel" aria-labelledby="desk-title" style={{ paddingBottom: 0 }}>
        <div className="phase-label">Phase B — Policy Decisions</div>
        <h2 className="panel-title" id="desk-title" style={{ marginTop: 2 }}>The Policy Desk <span className="muted small" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--sans)' }}>· choose up to {MAX_ACTIONS_PER_TURN} actions</span></h2>
        <div className="cat-tabs" role="tablist" aria-label="Policy categories">
          {cats.map((c) => {
            const n = selected.filter((id) => getPolicy(id)?.category === c).length;
            return (
              <button key={c} role="tab" id={`tab-${c}`} aria-controls={`panel-${c}`} aria-selected={cat === c} className="cat-tab" onClick={() => setCat(c)}>
                {CAT_ICONS[c]} {CATEGORY_LABELS[c]} {n > 0 && <span className="count">{n}</span>}
              </button>
            );
          })}
        </div>
        <div className="policy-grid" role="tabpanel" id={`panel-${cat}`} aria-labelledby={`tab-${cat}`}>
          {cat === 'pricing' && (
            <div className="policy-card" style={{ background: 'var(--paper-2)' }}>
              <h4>Maintain Current Prices</h4>
              <div className="desc">Current permit price: <strong className="num">${state.price}/yr</strong>. Prices stay put unless you choose a pricing action. Costs no action.</div>
              <div className="flavor">The most popular parking policy in history.</div>
            </div>
          )}
          {visible(cat).map((p) => {
            const isSel = selected.includes(p.id);
            const blocker = isSel ? null : policyBlocker(state, p, selected);
            const locked = !isEraAvailable(p, state.year);
            const cost = p.cost(state);
            const rec = p.recurring?.(state);
            return (
              <button
                key={p.id}
                type="button"
                className={`policy-card${isSel ? ' selected' : ''}`}
                disabled={!!blocker}
                aria-pressed={isSel}
                onClick={() => onToggle(p.id)}
              >
                <span className="check" aria-hidden>{isSel && <Check size={12} />}</span>
                <h4>{p.name}</h4>
                {!locked && <div className="desc">{p.description}</div>}
                <div className="tags">
                  {p.tags.map((t) => <span key={t.label} className={`tag ${t.tone}`}>{t.label}</span>)}
                </div>
                {!locked && <div className="flavor">{p.flavor}</div>}
                <div className="costline">
                  <span>Upfront: <strong>{cost > 0 ? money(cost) : 'free'}</strong></span>
                  {rec ? <span>Recurring: <strong>{money(rec)}/yr</strong></span> : null}
                </div>
                {blocker && <div className="blocker">{blocker}</div>}
              </button>
            );
          })}
        </div>
        <div className="tray" style={{ margin: '12px -14px 0', borderRadius: '0 0 4px 4px' }}>
          <div className="slots" aria-label="Selected actions">
            {Array.from({ length: MAX_ACTIONS_PER_TURN }).map((_, i) => {
              const id = selected[i];
              const p = id ? getPolicy(id) : undefined;
              return (
                <div key={i} className={`slot${p ? ' filled' : ''}`}>
                  {p ? (
                    <>
                      <span>{p.name}</span>
                      <button type="button" onClick={() => onToggle(p.id)} aria-label={`Remove ${p.name}`}><X size={14} /></button>
                    </>
                  ) : (
                    <span style={{ opacity: 0.6 }}>Action {i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
          <span className="total">Upfront {money(totalCost)}</span>
          <button type="button" className="btn btn-gold" onClick={onSubmit}>
            {selected.length === 0 ? 'Take no action' : 'Submit to the Board'} <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </section>
    </>
  );
}
