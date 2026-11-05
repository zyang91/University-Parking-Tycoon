import { useEffect, useRef } from 'react';
import { eraFor, getEvent, getPolicy, type GameState } from '../engine';

interface Props {
  state: GameState;
  onChoose: (index: number) => void;
}

export default function EventCard({ state, onChoose }: Props) {
  const ev = state.pendingEventId ? getEvent(state.pendingEventId) : undefined;
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), [state.pendingEventId]);

  return (
    <section className="panel" aria-labelledby="event-title">
      <div className="phase-label">Phase C — Incoming Memorandum</div>
      {state.turnLog.length > 0 && (
        <p className="small muted" style={{ marginTop: 4 }}>
          Approved this period: {state.pendingActions.map((id) => getPolicy(id)?.name).join(' · ')}
        </p>
      )}
      {state.turnNotes.length > 0 && (
        <ul className="notes" style={{ marginBottom: 8 }}>{state.turnNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      )}
      {ev ? (
        <div className="memo" key={ev.id}>
          <div className="memo-head">
            <span>TO:</span><span>Vice President for Parking, Transportation &amp; Strategic Complaints</span>
            <span>FROM:</span><span>Office of the President</span>
            <span>RE:</span><span>{ev.title} ({state.year}, {eraFor(state.year).name})</span>
          </div>
          <h3 id="event-title" ref={ref} tabIndex={-1}>{ev.title}</h3>
          <p className="body">{ev.description(state)}</p>
          <div className="choices" role="group" aria-label="Responses">
            {ev.choices.map((c, i) => {
              const reason = c.unavailable?.(state);
              return (
                <button key={i} type="button" className="choice" disabled={!!reason} onClick={() => onChoose(i)}>
                  <span className="key" aria-hidden>{i + 1}</span>
                  <span>
                    <strong>{c.label}</strong>
                    <span className="detail">{reason ? `Unavailable: ${reason}` : c.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Tip: press <kbd>1</kbd>–<kbd>{ev.choices.length}</kbd> to respond.</p>
        </div>
      ) : (
        <div className="memo">
          <h3 id="event-title">A Quiet Period</h3>
          <p className="body">No crises reached the President’s desk. The Board finds this suspicious.</p>
          <button type="button" className="btn btn-primary" onClick={() => onChoose(0)}>Continue</button>
        </div>
      )}
    </section>
  );
}
