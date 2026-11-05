import { BookOpen, ChartLine, CircleHelp, ClipboardList, Map, Save, ScrollText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import CampusMap from './components/CampusMap';
import CampusView from './components/CampusView';
import ConceptsView from './components/ConceptsView';
import Dashboard from './components/Dashboard';
import EndingReport from './components/EndingReport';
import EventCard from './components/EventCard';
import HistoryView from './components/HistoryView';
import HowToPlay from './components/HowToPlay';
import PolicyDesk from './components/PolicyDesk';
import StatsView from './components/StatsView';
import TitleScreen from './components/TitleScreen';
import TurnReport from './components/TurnReport';
import {
  browserStorage,
  clearSave,
  createInitialState,
  eraFor,
  getEvent,
  getPolicy,
  loadGame,
  nextTurn,
  randomSeed,
  resolveEvent,
  saveGame,
  submitPolicies,
  totalTurns,
  type GameState,
  type LoadResult,
} from './engine';

type Tab = 'desk' | 'campus' | 'history' | 'stats' | 'concepts' | 'help';

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'desk', label: 'Policy Desk', icon: <ClipboardList size={16} aria-hidden /> },
  { id: 'campus', label: 'Campus', icon: <Map size={16} aria-hidden /> },
  { id: 'history', label: 'History', icon: <ScrollText size={16} aria-hidden /> },
  { id: 'stats', label: 'Statistics', icon: <ChartLine size={16} aria-hidden /> },
  { id: 'concepts', label: 'Concepts', icon: <BookOpen size={16} aria-hidden /> },
  { id: 'help', label: 'How to Play', icon: <CircleHelp size={16} aria-hidden /> },
];

const NO_SAVE: LoadResult = { ok: false, reason: 'none', message: '' };

function readSave(): LoadResult {
  const storage = browserStorage();
  return storage ? loadGame(storage) : NO_SAVE;
}

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [save, setSave] = useState<LoadResult>(() => readSave());
  const [tab, setTab] = useState<Tab>('desk');
  const [selected, setSelected] = useState<string[]>([]);
  const [helpFromTitle, setHelpFromTitle] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // Autosave after every state transition.
  useEffect(() => {
    if (!game) return;
    const storage = browserStorage();
    if (storage && !saveGame(storage, game)) flash('Could not save: browser storage unavailable.');
  }, [game, flash]);

  const startGame = (seed: string | number) => {
    const s = createInitialState(seed);
    setGame(s);
    setSelected([]);
    setTab('desk');
  };

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = () => {
    if (!game) return;
    setGame(submitPolicies(game, selected));
    setSelected([]);
    setTab('desk');
  };

  const choose = useCallback(
    (i: number) => {
      setGame((g) => {
        if (!g || g.phase !== 'event') return g;
        const ev = g.pendingEventId ? getEvent(g.pendingEventId) : undefined;
        if (ev && (i >= ev.choices.length || ev.choices[i].unavailable?.(g))) return g;
        return resolveEvent(g, i);
      });
    },
    [],
  );

  const advance = () => game && setGame(nextTurn(game));

  // Keyboard: 1–3 answer events while on the desk.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game || tab !== 'desk' || game.phase !== 'event') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 3) choose(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, tab, choose]);

  if (!game) {
    if (helpFromTitle) {
      return (
        <div className="app">
          <header className="topbar">
            <div className="brand"><div className="brand-mark" aria-hidden>P</div><h1>University Parking Tycoon</h1></div>
            <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setHelpFromTitle(false)}>Back</button>
          </header>
          <div className="main"><HowToPlay /></div>
        </div>
      );
    }
    return (
      <TitleScreen
        save={save}
        onNew={(seed) => startGame(/^\d+$/.test(seed) ? Number(seed) : seed)}
        onContinue={() => {
          if (save.ok) {
            setGame(save.state);
            setTab('desk');
          }
        }}
        onDiscard={() => {
          const storage = browserStorage();
          if (storage) clearSave(storage);
          setSave(readSave());
        }}
        onHelp={() => setHelpFromTitle(true)}
      />
    );
  }

  const era = eraFor(Math.min(game.year, 2025));
  const turnNo = Math.min(game.turn + 1, totalTurns());

  const toTitle = () => {
    setSave(readSave());
    setGame(null);
  };

  let content: JSX.Element;
  if (tab === 'desk') {
    if (game.phase === 'ended') {
      content = (
        <EndingReport
          state={game}
          onReplaySame={() => startGame(game.seed)}
          onNewSeed={() => startGame(randomSeed())}
          onTitle={toTitle}
        />
      );
    } else {
      content = (
        <div className="desk-grid">
          <aside className="col" aria-label="Campus map">
            <section className="panel">
              <h2 className="panel-title"><Map size={16} aria-hidden /> Westbridge Campus</h2>
              <CampusMap state={game} />
            </section>
            {game.history.length > 0 && (
              <section className="panel">
                <h2 className="panel-title"><ScrollText size={16} aria-hidden /> Latest Record</h2>
                <p className="small" style={{ fontFamily: 'var(--serif)', margin: 0 }}>{game.history[game.history.length - 1].text}</p>
              </section>
            )}
          </aside>
          <main className="col" aria-label="Policy desk">
            {game.phase === 'briefing' && <PolicyDesk state={game} selected={selected.filter((id) => getPolicy(id))} onToggle={toggle} onSubmit={submit} />}
            {game.phase === 'event' && <EventCard state={game} onChoose={choose} />}
            {game.phase === 'report' && <TurnReport state={game} onNext={advance} />}
          </main>
          <aside className="col" aria-label="University dashboard">
            <Dashboard state={game} />
          </aside>
        </div>
      );
    }
  } else if (tab === 'campus') content = <CampusView state={game} />;
  else if (tab === 'history') content = <HistoryView state={game} />;
  else if (tab === 'stats') content = <StatsView state={game} />;
  else if (tab === 'concepts') content = <ConceptsView />;
  else content = <HowToPlay />;

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={toTitle} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} aria-label="Return to title screen">
          <div className="brand-mark" aria-hidden>P</div>
          <div>
            <h1>University Parking Tycoon</h1>
            <div className="sub">Westbridge University · Seed {game.seed}</div>
          </div>
        </button>
        <div className="year-chip" aria-live="polite">
          <span className="year">{game.year}</span>
          <span className="era">{game.phase === 'ended' ? 'Final report' : `${era.name} · Turn ${turnNo}/${totalTurns()}`}</span>
        </div>
        <nav className="tabs" role="tablist" aria-label="Views">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)} title={t.label}>
              {t.icon}<span>{t.id === 'desk' && game.phase === 'ended' ? 'Final Report' : t.label}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            const storage = browserStorage();
            flash(storage && saveGame(storage, game) ? 'Game saved to this browser.' : 'Could not save: browser storage unavailable.');
          }}
        >
          <Save size={14} aria-hidden /> Save
        </button>
      </header>
      <div className="main">{content}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
