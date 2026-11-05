import { useEffect, useRef } from 'react';
import { eraFor, getEvent, getPolicy, type GameState } from '../engine';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  state: GameState;
  onChoose: (index: number) => void;
}

export default function EventCard({ state, onChoose }: Props) {
  const { t, tx, lang } = useI18n();
  const ev = state.pendingEventId ? getEvent(state.pendingEventId) : undefined;
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), [state.pendingEventId]);
  const approved = state.pendingActions.map((id) => {
    const p = getPolicy(id);
    return p ? tx(p.name) : id;
  });

  return (
    <section className="panel" aria-labelledby="event-title">
      <div className="phase-label">{t('phase.c')}</div>
      {approved.length > 0 && (
        <p className="small muted" style={{ marginTop: 4 }}>
          {t('event.approved', { list: approved.join(lang === 'zh' ? '、' : ' · ') })}
        </p>
      )}
      {state.turnNotes.length > 0 && (
        <ul className="notes" style={{ marginBottom: 8 }}>{state.turnNotes.map((n, i) => <li key={i}>{tx(n)}</li>)}</ul>
      )}
      {ev ? (
        <div className="memo" key={ev.id}>
          <div className="memo-head">
            <span>{t('event.to')}</span><span>{t('event.toValue')}</span>
            <span>{t('event.from')}</span><span>{t('event.fromValue')}</span>
            <span>{t('event.re')}</span><span>{tx(ev.title)} ({state.year}, {tx(eraFor(state.year).name)})</span>
          </div>
          <h3 id="event-title" ref={ref} tabIndex={-1}>{tx(ev.title)}</h3>
          <p className="body">{tx(ev.description(state))}</p>
          <div className="choices" role="group" aria-label={t('event.responses')}>
            {ev.choices.map((c, i) => {
              const reason = c.unavailable?.(state);
              return (
                <button key={i} type="button" className="choice" disabled={!!reason} onClick={() => onChoose(i)}>
                  <span className="key" aria-hidden>{i + 1}</span>
                  <span>
                    <strong>{tx(c.label)}</strong>
                    <span className="detail">{reason ? t('event.unavailable', { reason: tx(reason) }) : tx(c.detail)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>{t('event.tip', { keys: `1–${ev.choices.length}` })}</p>
        </div>
      ) : (
        <div className="memo">
          <h3 id="event-title">{t('event.quietTitle')}</h3>
          <p className="body">{t('event.quietBody')}</p>
          <button type="button" className="btn btn-primary" onClick={() => onChoose(0)}>{t('event.continue')}</button>
        </div>
      )}
    </section>
  );
}
