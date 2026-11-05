import { CircleHelp, Play, Shuffle, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createInitialState, randomSeed, type LoadResult } from '../engine';
import CampusMap from './CampusMap';

interface Props {
  save: LoadResult;
  onNew: (seed: string) => void;
  onContinue: () => void;
  onDiscard: () => void;
  onHelp: () => void;
}

export default function TitleScreen({ save, onNew, onContinue, onDiscard, onHelp }: Props) {
  const [seed, setSeed] = useState(() => String(randomSeed()));
  const preview = useMemo(() => createInitialState(1), []);

  return (
    <main className="title-screen">
      <div className="title-card">
        <div>
          <span className="stamp">Office of the President · Confidential</span>
          <h1 style={{ marginTop: 12 }}>University Parking Tycoon</h1>
          <p className="tagline">Eighty Years of Parking Problems. Zero Satisfied Stakeholders.</p>
          <p className="lede">
            Westbridge University, 1948. You have been appointed Vice President for Parking, Transportation, and Strategic
            Complaints. Over the next eight decades you will price, pave, subsidize, convene, and occasionally apologize —
            and every parking solution will create another parking problem.
          </p>

          {save.ok && (
            <div style={{ margin: '14px 0' }}>
              <button type="button" className="btn btn-primary btn-lg" onClick={onContinue}>
                <Play size={18} aria-hidden /> Continue — {save.state.phase === 'ended' ? 'final report' : save.state.year}
              </button>
              <span className="small muted" style={{ marginLeft: 10 }}>Seed {save.state.seed}</span>
            </div>
          )}
          {!save.ok && save.reason !== 'none' && (
            <div className="warning" role="alert">
              <TriangleAlert size={16} aria-hidden /> {save.message}
              <button type="button" className="btn btn-sm" onClick={onDiscard}>Discard save</button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onNew(seed.trim() || String(randomSeed()));
            }}
          >
            <div className="seed-row">
              <label htmlFor="seed-input" className="small"><strong>Seed</strong></label>
              <input id="seed-input" value={seed} onChange={(e) => setSeed(e.target.value)} aria-describedby="seed-help" />
              <button type="button" className="btn btn-sm" onClick={() => setSeed(String(randomSeed()))} aria-label="Randomize seed">
                <Shuffle size={14} aria-hidden /> Random
              </button>
            </div>
            <p id="seed-help" className="small muted">Same seed + same decisions = same history. Share a seed to compare strategies.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-gold btn-lg">
                <Play size={18} aria-hidden /> {save.ok ? 'New Administration' : 'Begin in 1948'}
              </button>
              <button type="button" className="btn btn-lg" onClick={onHelp}>
                <CircleHelp size={18} aria-hidden /> How to play
              </button>
            </div>
            {save.ok && <p className="small muted" style={{ marginTop: 6 }}>Starting a new game replaces your saved game.</p>}
          </form>
        </div>
        <div>
          <CampusMap state={preview} interactive={false} />
          <p className="small muted" style={{ marginTop: 8 }}>
            Westbridge University and all events in this game are fictional. See <em>Concepts</em> for the planning ideas behind the mechanics.
          </p>
        </div>
      </div>
    </main>
  );
}
