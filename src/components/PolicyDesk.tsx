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
import { useI18n } from '../i18n/I18nContext';

const CAT_ICONS: Record<PolicyCategory, JSX.Element> = {
  pricing: <Coins size={14} aria-hidden />,
  infrastructure: <Landmark size={14} aria-hidden />,
  tdm: <Bus size={14} aria-hidden />,
  administrative: <Gavel size={14} aria-hidden />,
};

export function BriefingCard({ state }: { state: GameState }) {
  const { t, tx } = useI18n();
  const b = getBriefing(state);
  return (
    <section className="panel panel-dark" aria-labelledby="briefing-title">
      <div className="phase-label" style={{ color: 'var(--gold-soft)' }}>{t('phase.a')}</div>
      <div className="briefing-head">
        <div>
          <h2 id="briefing-title" className="sr-only">{t('briefing.for', { year: b.year })}</h2>
          <div className="briefing-year">{b.year}</div>
        </div>
        <div className="briefing-era">
          <strong>{tx(b.eraName)}</strong>
          <div>{tx(b.eraTheme)}</div>
          <div className="num" style={{ opacity: 0.7 }}>{t('briefing.period', { from: b.year, to: b.year + turnLength(b.year) })}</div>
        </div>
      </div>
      <p className="quote">“{tx(b.message)}”</p>
      <div className="quote-attrib">— {tx(b.president)}</div>
      <div className={`crisis ${b.crisis.severity}`} role="status">
        <TriangleAlert size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>{tx(b.crisis.title)}</strong>
          <p>{tx(b.crisis.text)}</p>
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
  const { t, tx, money } = useI18n();
  const [cat, setCat] = useState<PolicyCategory>('pricing');
  const cats: PolicyCategory[] = ['pricing', 'infrastructure', 'tdm', 'administrative'];
  const visible = (category: PolicyCategory) =>
    POLICIES.filter((p) => p.category === category && (!isReversal(p) || !p.unavailable?.(state)));
  const totalCost = selected.reduce((s, id) => s + (getPolicy(id)?.cost(state) ?? 0), 0);

  return (
    <>
      <BriefingCard state={state} />
      <section className="panel" aria-labelledby="desk-title" style={{ paddingBottom: 0 }}>
        <div className="phase-label">{t('phase.b')}</div>
        <h2 className="panel-title" id="desk-title" style={{ marginTop: 2 }}>
          {t('desk.title')}{' '}
          <span className="muted small" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--sans)' }}>
            {t('desk.upTo', { n: MAX_ACTIONS_PER_TURN })}
          </span>
        </h2>
        <div className="cat-tabs" role="tablist" aria-label={t('desk.categories')}>
          {cats.map((c) => {
            const n = selected.filter((id) => getPolicy(id)?.category === c).length;
            return (
              <button key={c} role="tab" id={`tab-${c}`} aria-controls={`panel-${c}`} aria-selected={cat === c} className="cat-tab" onClick={() => setCat(c)}>
                {CAT_ICONS[c]} {tx(CATEGORY_LABELS[c])} {n > 0 && <span className="count">{n}</span>}
              </button>
            );
          })}
        </div>
        <div className="policy-grid" role="tabpanel" id={`panel-${cat}`} aria-labelledby={`tab-${cat}`}>
          {cat === 'pricing' && (
            <div className="policy-card" style={{ background: 'var(--paper-2)' }}>
              <h4>{t('desk.maintain')}</h4>
              <div className="desc">{t('desk.maintainDesc', { price: `$${state.price}` })}</div>
              <div className="flavor">{t('desk.maintainFlavor')}</div>
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
                <h4>{tx(p.name)}</h4>
                {!locked && <div className="desc">{tx(p.description)}</div>}
                <div className="tags">
                  {p.tags.map((tag) => <span key={tag.label.en} className={`tag ${tag.tone}`}>{tx(tag.label)}</span>)}
                </div>
                {!locked && <div className="flavor">{tx(p.flavor)}</div>}
                <div className="costline">
                  <span>{t('desk.upfront')} <strong>{cost > 0 ? money(cost) : t('desk.free')}</strong></span>
                  {rec ? <span>{t('desk.recurring')} <strong>{t('desk.perYear', { amount: money(rec) })}</strong></span> : null}
                </div>
                {blocker && <div className="blocker">{tx(blocker)}</div>}
              </button>
            );
          })}
        </div>
        <div className="tray" style={{ margin: '12px -14px 0', borderRadius: '0 0 4px 4px' }}>
          <div className="slots" aria-label={t('desk.selected')}>
            {Array.from({ length: MAX_ACTIONS_PER_TURN }).map((_, i) => {
              const id = selected[i];
              const p = id ? getPolicy(id) : undefined;
              return (
                <div key={i} className={`slot${p ? ' filled' : ''}`}>
                  {p ? (
                    <>
                      <span>{tx(p.name)}</span>
                      <button type="button" onClick={() => onToggle(p.id)} aria-label={t('desk.remove', { name: tx(p.name) })}><X size={14} /></button>
                    </>
                  ) : (
                    <span style={{ opacity: 0.6 }}>{t('desk.action', { n: i + 1 })}</span>
                  )}
                </div>
              );
            })}
          </div>
          <span className="total">{t('desk.upfrontTotal', { amount: money(totalCost) })}</span>
          <button type="button" className="btn btn-gold" onClick={onSubmit}>
            {selected.length === 0 ? t('desk.noAction') : t('desk.submit')} <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </section>
    </>
  );
}
