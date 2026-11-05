import { CONCEPTS, FURTHER_READING, HISTORICAL_SOURCES } from '../content/concepts';
import { useI18n } from '../i18n/I18nContext';

export default function ConceptsView() {
  const { t, tx } = useI18n();
  return (
    <div className="page">
      <div className="page-inner">
        <h2>{t('concepts.title')}</h2>
        <p className="muted prose">{t('concepts.intro')}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '6px 0 18px' }}>
          <span className="kind verified">{t('kind.verified')}</span>
          <span className="kind pending">{t('kind.pending')}</span>
          <span className="kind concept">{t('kind.concept')}</span>
          <span className="kind fiction">{t('kind.fiction')}</span>
        </div>

        <h3 style={{ fontSize: 22, color: 'var(--navy)', margin: '8px 0 10px' }}>{t('concepts.inSim')}</h3>
        <div className="concepts">
          {CONCEPTS.map((c) => (
            <article key={c.id} className="panel">
              <span className="kind concept">{t('kind.concept')}</span>
              <h4 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 6 }}>{tx(c.title)}</h4>
              <p className="small">{tx(c.body)}</p>
              <p className="small" style={{ margin: 0 }}><strong>{t('concepts.inGame')}</strong> {tx(c.inGame)}</p>
            </article>
          ))}
        </div>

        <h3 style={{ fontSize: 22, color: 'var(--navy)', margin: '24px 0 10px' }}>{t('concepts.inspiration')}</h3>
        <div className="prose">
          {HISTORICAL_SOURCES.map((src) => (
            <article key={src.id} className="panel" style={{ marginBottom: 12 }}>
              <span className={`kind ${src.status === 'verified' ? 'verified' : 'pending'}`}>
                {src.status === 'verified' ? t('kind.verified') : t('kind.pending')}
              </span>
              <h4 style={{ fontSize: 17, color: 'var(--navy)' }}>{tx(src.title)}</h4>
              <p className="small muted">{tx(src.institution)}, {src.year}</p>
              <p className="small">{tx(src.summary)}</p>
              {src.citation && <p className="small"><strong>{t('concepts.citation')}</strong> {src.citation}</p>}
              {src.archive && <p className="small"><strong>{t('concepts.archive')}</strong> {src.archive}</p>}
              {src.excerpts?.map((e, i) => (
                <blockquote key={i} className="history-entry small">{e.text}{e.page && <span className="muted"> ({e.page})</span>}</blockquote>
              ))}
            </article>
          ))}
        </div>

        <article className="panel prose" style={{ marginTop: 12 }}>
          <span className="kind fiction">{t('kind.fiction')}</span>
          <h4 style={{ fontSize: 17, color: 'var(--navy)' }}>{t('concepts.westbridge')}</h4>
          <p className="small">{t('concepts.westbridgeBody')}</p>
        </article>

        <h3 style={{ fontSize: 22, color: 'var(--navy)', margin: '24px 0 10px' }}>{t('concepts.reading')}</h3>
        <ul className="prose small">
          {FURTHER_READING.map((r) => (
            <li key={r.citation}>{r.citation} <span className="muted">— {tx(r.note)}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
