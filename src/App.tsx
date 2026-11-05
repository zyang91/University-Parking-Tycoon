import { BookOpen, ChartLine, CircleHelp, ClipboardList, Map, Save, ScrollText, Settings } from 'lucide-react';
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
import SettingsDialog from './components/SettingsDialog';
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
import { useI18n } from './i18n/I18nContext';
import type { StringKey } from './i18n/strings';

type Tab = 'desk' | 'campus' | 'history' | 'stats' | 'concepts' | 'help';

const TABS: { id: Tab; label: StringKey; icon: JSX.Element }[] = [
  { id: 'desk', label: 'tab.desk', icon: <ClipboardList size={16} aria-hidden /> },
  { id: 'campus', label: 'tab.campus', icon: <Map size={16} aria-hidden /> },
  { id: 'history', label: 'tab.history', icon: <ScrollText size={16} aria-hidden /> },
  { id: 'stats', label: 'tab.stats', icon: <ChartLine size={16} aria-hidden /> },
  { id: 'concepts', label: 'tab.concepts', icon: <BookOpen size={16} aria-hidden /> },
  { id: 'help', label: 'tab.help', icon: <CircleHelp size={16} aria-hidden /> },
];

const NO_SAVE: LoadResult = { ok: false, reason: 'none', message: '' };

function readSave(): LoadResult {
  const storage = browserStorage();
  return storage ? loadGame(storage) : NO_SAVE;
}

export default function App() {
  const { t, tx } = useI18n();
  const [game, setGame] = useState<GameState | null>(null);
  const [save, setSave] = useState<LoadResult>(() => readSave());
  const [tab, setTab] = useState<Tab>('desk');
  const [selected, setSelected] = useState<string[]>([]);
  const [helpFromTitle, setHelpFromTitle] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // Autosave after every state transition.
  useEffect(() => {
    if (!game) return;
    const storage = browserStorage();
    if (storage && !saveGame(storage, game)) flash(t('app.saveFailed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const startGame = (seed: string | number) => {
    setGame(createInitialState(seed));
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

  const choose = useCallback((i: number) => {
    setGame((g) => {
      if (!g || g.phase !== 'event') return g;
      const ev = g.pendingEventId ? getEvent(g.pendingEventId) : undefined;
      if (ev && (i >= ev.choices.length || ev.choices[i].unavailable?.(g))) return g;
      return resolveEvent(g, i);
    });
  }, []);

  const advance = () => game && setGame(nextTurn(game));

  // Keyboard: 1–3 answer events while on the desk.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game || tab !== 'desk' || game.phase !== 'event' || settingsOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 3) choose(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, tab, choose, settingsOpen]);

  const settings = settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />;
  const settingsButton = (
    <button type="button" className="btn btn-sm" onClick={() => setSettingsOpen(true)} aria-label={t('app.settings')} title={t('app.settings')}>
      <Settings size={14} aria-hidden /> <span className="btn-label">{t('app.settings')}</span>
    </button>
  );

  if (!game) {
    if (helpFromTitle) {
      return (
        <div className="app">
          <header className="topbar">
            <div className="brand"><div className="brand-mark" aria-hidden>P</div><h1>{t('app.title')}</h1></div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {settingsButton}
              <button type="button" className="btn btn-sm" onClick={() => setHelpFromTitle(false)}>{t('app.back')}</button>
            </div>
          </header>
          <div className="main"><HowToPlay /></div>
          {settings}
        </div>
      );
    }
    return (
      <>
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
          onSettings={() => setSettingsOpen(true)}
        />
        {settings}
      </>
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
      const last = game.history[game.history.length - 1];
      content = (
        <div className="desk-grid">
          <aside className="col" aria-label={t('app.campusMap')}>
            <section className="panel">
              <h2 className="panel-title"><Map size={16} aria-hidden /> {t('app.westbridgeCampus')}</h2>
              <CampusMap state={game} />
            </section>
            {last && (
              <section className="panel">
                <h2 className="panel-title"><ScrollText size={16} aria-hidden /> {t('app.latestRecord')}</h2>
                <p className="small" style={{ fontFamily: 'var(--serif)', margin: 0 }}>{tx(last.text)}</p>
              </section>
            )}
          </aside>
          <main className="col" aria-label={t('app.policyDesk')}>
            {game.phase === 'briefing' && <PolicyDesk state={game} selected={selected.filter((id) => getPolicy(id))} onToggle={toggle} onSubmit={submit} />}
            {game.phase === 'event' && <EventCard state={game} onChoose={choose} />}
            {game.phase === 'report' && <TurnReport state={game} onNext={advance} />}
          </main>
          <aside className="col" aria-label={t('app.dashboard')}>
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
        <button type="button" className="brand" onClick={toTitle} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} aria-label={t('app.backToTitle')}>
          <div className="brand-mark" aria-hidden>P</div>
          <div>
            <h1>{t('app.title')}</h1>
            <div className="sub">{t('app.subtitle', { seed: game.seed })}</div>
          </div>
        </button>
        <div className="year-chip" aria-live="polite">
          <span className="year">{game.year}</span>
          <span className="era">{game.phase === 'ended' ? t('app.finalReport') : t('app.turn', { era: tx(era.name), n: turnNo, total: totalTurns() })}</span>
        </div>
        <nav className="tabs" role="tablist" aria-label={t('app.views')}>
          {TABS.map((tb) => (
            <button key={tb.id} role="tab" aria-selected={tab === tb.id} className="tab" onClick={() => setTab(tb.id)} title={t(tb.label)}>
              {tb.icon}<span>{tb.id === 'desk' && game.phase === 'ended' ? t('tab.final') : t(tb.label)}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            const storage = browserStorage();
            flash(storage && saveGame(storage, game) ? t('app.saved') : t('app.saveFailed'));
          }}
        >
          <Save size={14} aria-hidden /> <span className="btn-label">{t('app.save')}</span>
        </button>
        {settingsButton}
      </header>
      <div className="main">{content}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
      {settings}
    </div>
  );
}
