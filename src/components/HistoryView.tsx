import { ERAS, getPolicy, type GameState } from '../engine';
import { useI18n } from '../i18n/I18nContext';

export default function HistoryView({ state }: { state: GameState }) {
  const { t, tx } = useI18n();
  return (
    <div className="page">
      <div className="page-inner prose" style={{ maxWidth: 860 }}>
        <h2>{t('history.title')}</h2>
        <p className="muted">
          {t('history.intro')}
          <span className="stamp" style={{ marginLeft: 10 }}>{t('history.fictional')}</span>
        </p>
        {state.history.length === 0 ? (
          <p>{t('history.empty')}</p>
        ) : (
          <ol className="timeline">
            {ERAS.map((era) => {
              const entries = state.history.filter((h) => h.era === era.id);
              if (entries.length === 0) return null;
              return [
                <li key={era.id} className="era-head">{tx(era.name)} <span className="muted small">({era.start}–{era.end})</span></li>,
                ...entries.map((h) => (
                  <li key={h.year}>
                    <p style={{ fontFamily: 'var(--serif)', margin: 0 }}>{tx(h.text)}</p>
                    <div className="chips">
                      {h.actions.map((id) => {
                        const p = getPolicy(id);
                        return <span key={id} className="chip">{p ? tx(p.name) : id}</span>;
                      })}
                      {h.event && <span className="chip event">{tx(h.event.title)}</span>}
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
