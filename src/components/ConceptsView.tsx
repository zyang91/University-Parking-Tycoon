import { CONCEPTS, FURTHER_READING, HISTORICAL_SOURCES } from '../content/concepts';

export default function ConceptsView() {
  return (
    <div className="page">
      <div className="page-inner">
        <h2>Planning History &amp; Concepts</h2>
        <p className="muted prose">
          University Parking Tycoon is a playful companion to research on the history of university parking planning.
          This page separates three kinds of content, labeled throughout:
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '6px 0 18px' }}>
          <span className="kind verified">Verified historical reference</span>
          <span className="kind pending">Historical reference — verification pending</span>
          <span className="kind concept">General planning concept</span>
          <span className="kind fiction">Fictional simulation</span>
        </div>

        <h3 style={{ fontSize: 22, color: 'var(--navy)', margin: '8px 0 10px' }}>Planning Concepts in the Simulation</h3>
        <div className="concepts">
          {CONCEPTS.map((c) => (
            <article key={c.id} className="panel">
              <span className="kind concept">General planning concept</span>
              <h4 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 6 }}>{c.title}</h4>
              <p className="small">{c.body}</p>
              <p className="small" style={{ margin: 0 }}><strong>In the game:</strong> {c.inGame}</p>
            </article>
          ))}
        </div>

        <h3 style={{ fontSize: 22, color: 'var(--navy)', margin: '24px 0 10px' }}>Historical Inspiration</h3>
        <div className="prose">
          {HISTORICAL_SOURCES.map((src) => (
            <article key={src.id} className="panel" style={{ marginBottom: 12 }}>
              <span className={`kind ${src.status === 'verified' ? 'verified' : 'pending'}`}>
                {src.status === 'verified' ? 'Verified historical reference' : 'Historical reference — verification pending'}
              </span>
              <h4 style={{ fontSize: 17, color: 'var(--navy)' }}>{src.title}</h4>
              <p className="small muted">{src.institution}, {src.year}</p>
              <p className="small">{src.summary}</p>
              {src.citation && <p className="small"><strong>Citation:</strong> {src.citation}</p>}
              {src.archive && <p className="small"><strong>Archive:</strong> {src.archive}</p>}
              {src.excerpts?.map((e, i) => (
                <blockquote key={i} className="history-entry small">{e.text}{e.page && <span className="muted"> ({e.page})</span>}</blockquote>
              ))}
            </article>
          ))}
        </div>

        <article className="panel prose" style={{ marginTop: 12 }}>
          <span className="kind fiction">Fictional simulation</span>
          <h4 style={{ fontSize: 17, color: 'var(--navy)' }}>About Westbridge University</h4>
          <p className="small">
            Westbridge University, its presidents, buildings, donors, committees, events and outcomes are entirely fictional.
            The setting is loosely inspired by the general development of urban American research universities. Nothing in the
            game describes what happened at the University of Pennsylvania or any other real institution. Numerical values are
            illustrative gameplay parameters, not historical data.
          </p>
        </article>

        <h3 style={{ fontSize: 22, color: 'var(--navy)', margin: '24px 0 10px' }}>Further Reading</h3>
        <ul className="prose small">
          {FURTHER_READING.map((r) => (
            <li key={r.citation}>{r.citation} <span className="muted">— {r.note}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
