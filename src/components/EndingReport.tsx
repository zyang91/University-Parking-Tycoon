import { Award, RotateCcw, Shuffle } from 'lucide-react';
import { useMemo } from 'react';
import { capacity, countParcels, evaluate, getPolicy, type GameState } from '../engine';
import { useI18n } from '../i18n/I18nContext';
import CampusMap from './CampusMap';
import LineChart from './LineChart';

interface Props {
  state: GameState;
  onReplaySame: () => void;
  onNewSeed: () => void;
  onTitle: () => void;
}

export default function EndingReport({ state, onReplaySame, onNewSeed, onTitle }: Props) {
  const { t, tx, money } = useI18n();
  const ev = useMemo(() => evaluate(state), [state]);
  const years = state.stats.map((s) => s.year);
  const keyMoments = state.history.filter((h) => h.actions.length > 0 || h.event);

  return (
    <div className="page">
      <div className="page-inner">
        <section className="ending-hero" aria-labelledby="ending-title">
          <div className="phase-label" style={{ color: 'var(--gold-soft)' }}>{t('end.header', { seed: state.seed })}</div>
          <h2 id="ending-title"><Award size={30} aria-hidden style={{ verticalAlign: '-4px', marginRight: 8 }} />{tx(ev.ending.title)}</h2>
          <p className="summary">{tx(ev.ending.summary)}</p>
          <p className="small" style={{ opacity: 0.85 }}>{t('end.why', { text: tx(ev.ending.explanation) })}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" className="btn btn-gold" onClick={onReplaySame}><RotateCcw size={16} aria-hidden /> {t('end.replay')}</button>
            <button type="button" className="btn btn-gold" onClick={onNewSeed}><Shuffle size={16} aria-hidden /> {t('end.newSeed')}</button>
            <button type="button" className="btn" style={{ background: 'transparent', color: '#f3ead6', borderColor: '#f3ead6' }} onClick={onTitle}>{t('end.title')}</button>
          </div>
        </section>

        <div className="two-col">
          <section>
            <h3 className="panel-title">{t('end.evaluation', { grade: ev.overallGrade, score: ev.overall })}</h3>
            <div className="grade-grid">
              {ev.grades.map((g) => (
                <div key={g.label.en} className="grade-card">
                  <div className="grade-letter">{g.grade}</div>
                  <strong className="small">{tx(g.label)}</strong>
                  <div className="small muted">{tx(g.note)}</div>
                </div>
              ))}
            </div>
            <h3 className="panel-title" style={{ marginTop: 16 }}>{t('end.influences')}</h3>
            <ul className="notes" style={{ fontSize: 14 }}>
              {ev.influences.map((text, i) => <li key={i}>{tx(text)}</li>)}
            </ul>
            <h3 className="panel-title" style={{ marginTop: 16 }}>{t('end.campus2025')}</h3>
            <p className="small">
              {t('end.summary', {
                a: countParcels(state, 'academic'),
                l: countParcels(state, 'lot'),
                g: countParcels(state, 'garage'),
                gr: countParcels(state, 'green'),
                cap: capacity(state).toLocaleString(),
                dem: state.demand.toLocaleString(),
                price: `$${state.price}`,
                cash: money(state.cash),
              })}
            </p>
          </section>
          <section>
            <CampusMap state={state} interactive={false} />
            <div style={{ marginTop: 12 }}>
              <LineChart title={t('end.chart')} years={years} series={[
                { label: t('stats.capacity'), color: '#1f2a44', values: state.stats.map((s) => s.capacity) },
                { label: t('stats.demand'), color: '#a5483a', values: state.stats.map((s) => s.demand) },
              ]} />
            </div>
          </section>
        </div>

        <h3 className="panel-title" style={{ marginTop: 20 }}>{t('end.timeline')}</h3>
        <ol className="timeline">
          {keyMoments.map((h) => (
            <li key={h.year}>
              <strong className="num">{h.year}–{h.endYear}</strong>
              <div className="chips">
                {h.actions.map((id) => {
                  const p = getPolicy(id);
                  return <span key={id} className="chip">{p ? tx(p.name) : id}</span>;
                })}
                {h.event && <span className="chip event">{tx(h.event.title)}</span>}
              </div>
              <p className="small" style={{ margin: '4px 0 0', fontFamily: 'var(--serif)' }}>{tx(h.text)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
