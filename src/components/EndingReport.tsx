import { Award, RotateCcw, Shuffle } from 'lucide-react';
import { useMemo } from 'react';
import { capacity, countParcels, evaluate, type GameState } from '../engine';
import { money } from '../format';
import CampusMap from './CampusMap';
import LineChart from './LineChart';

interface Props {
  state: GameState;
  onReplaySame: () => void;
  onNewSeed: () => void;
  onTitle: () => void;
}

export default function EndingReport({ state, onReplaySame, onNewSeed, onTitle }: Props) {
  const ev = useMemo(() => evaluate(state), [state]);
  const years = state.stats.map((s) => s.year);
  const keyMoments = state.history.filter((h) => h.actions.length > 0 || h.event);

  return (
    <div className="page">
      <div className="page-inner">
        <section className="ending-hero" aria-labelledby="ending-title">
          <div className="phase-label" style={{ color: 'var(--gold-soft)' }}>Final Administrative Evaluation · 1948–2025 · Seed {state.seed}</div>
          <h2 id="ending-title"><Award size={30} aria-hidden style={{ verticalAlign: '-4px', marginRight: 8 }} />{ev.ending.title}</h2>
          <p className="summary">{ev.ending.summary}</p>
          <p className="small" style={{ opacity: 0.85 }}>Why: {ev.ending.explanation}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" className="btn btn-gold" onClick={onReplaySame}><RotateCcw size={16} aria-hidden /> Replay same seed</button>
            <button type="button" className="btn btn-gold" onClick={onNewSeed}><Shuffle size={16} aria-hidden /> New game, new seed</button>
            <button type="button" className="btn" style={{ background: 'transparent', color: '#f3ead6', borderColor: '#f3ead6' }} onClick={onTitle}>Title screen</button>
          </div>
        </section>

        <div className="two-col">
          <section>
            <h3 className="panel-title">Performance Evaluation — Overall {ev.overallGrade} ({ev.overall})</h3>
            <div className="grade-grid">
              {ev.grades.map((g) => (
                <div key={g.label} className="grade-card">
                  <div className="grade-letter">{g.grade}</div>
                  <strong className="small">{g.label}</strong>
                  <div className="small muted">{g.note}</div>
                </div>
              ))}
            </div>
            <h3 className="panel-title" style={{ marginTop: 16 }}>How Early Decisions Shaped 2025</h3>
            <ul className="notes" style={{ fontSize: 14 }}>
              {ev.influences.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
            <h3 className="panel-title" style={{ marginTop: 16 }}>The Campus in 2025</h3>
            <p className="small">
              {countParcels(state, 'academic')} academic buildings · {countParcels(state, 'lot')} surface lots · {countParcels(state, 'garage')} garages ·{' '}
              {countParcels(state, 'green')} greens · {capacity(state).toLocaleString()} spaces for {state.demand.toLocaleString()} cars · permits ${state.price}/yr · reserves {money(state.cash)}
            </p>
          </section>
          <section>
            <CampusMap state={state} interactive={false} />
            <div style={{ marginTop: 12 }}>
              <LineChart title="Eighty Years of Supply and Demand" years={years} series={[
                { label: 'Capacity', color: '#1f2a44', values: state.stats.map((s) => s.capacity) },
                { label: 'Demand', color: '#a5483a', values: state.stats.map((s) => s.demand) },
              ]} />
            </div>
          </section>
        </div>

        <h3 className="panel-title" style={{ marginTop: 20 }}>Timeline of Major Actions</h3>
        <ol className="timeline">
          {keyMoments.map((h) => (
            <li key={h.year}>
              <strong className="num">{h.year}–{h.endYear}</strong>
              <div className="chips">
                {h.actions.map((a) => <span key={a} className="chip">{a}</span>)}
                {h.event && <span className="chip event">{h.event.title}</span>}
              </div>
              <p className="small" style={{ margin: '4px 0 0', fontFamily: 'var(--serif)' }}>{h.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
