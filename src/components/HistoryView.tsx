import { ERAS, type GameState } from '../engine';

export default function HistoryView({ state }: { state: GameState }) {
  return (
    <div className="page">
      <div className="page-inner prose" style={{ maxWidth: 860 }}>
        <h2>Institutional History</h2>
        <p className="muted">
          The official record of Westbridge University’s parking administration, compiled automatically and reviewed by nobody.
          <span className="stamp" style={{ marginLeft: 10 }}>Fictional</span>
        </p>
        {state.history.length === 0 ? (
          <p>The archive is empty. History begins when you submit your first decisions.</p>
        ) : (
          <ol className="timeline">
            {ERAS.map((era) => {
              const entries = state.history.filter((h) => h.era === era.id);
              if (entries.length === 0) return null;
              return [
                <li key={era.id} className="era-head">{era.name} <span className="muted small">({era.start}–{era.end})</span></li>,
                ...entries.map((h) => (
                  <li key={h.year}>
                    <p style={{ fontFamily: 'var(--serif)', margin: 0 }}>{h.text}</p>
                    <div className="chips">
                      {h.actions.map((a) => <span key={a} className="chip">{a}</span>)}
                      {h.event && <span className="chip event">{h.event.title}</span>}
                    </div>
                  </li>
                )),
              ];
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
