import { CircleHelp, Play, Settings, Shuffle, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createInitialState, randomSeed, type LoadResult } from '../engine';
import { useI18n } from '../i18n/I18nContext';
import type { StringKey } from '../i18n/strings';
import CampusMap from './CampusMap';

interface Props {
  save: LoadResult;
  onNew: (seed: string) => void;
  onContinue: () => void;
  onDiscard: () => void;
  onHelp: () => void;
  onSettings: () => void;
}

const SAVE_ERRORS: Record<string, StringKey> = {
  corrupt: 'save.corrupt',
  incompatible: 'save.incompatible',
};

export default function TitleScreen({ save, onNew, onContinue, onDiscard, onHelp, onSettings }: Props) {
  const { t } = useI18n();
  const [seed, setSeed] = useState(() => String(randomSeed()));
  const preview = useMemo(() => createInitialState(1), []);

  return (
    <main className="title-screen">
      <div className="title-card">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span className="stamp">{t('title.stamp')}</span>
            <button type="button" className="btn btn-sm" onClick={onSettings}>
              <Settings size={14} aria-hidden /> {t('app.settings')}
            </button>
          </div>
          <h1 style={{ marginTop: 12 }}>{t('app.title')}</h1>
          <p className="tagline">{t('title.tagline')}</p>
          <p className="lede">{t('title.lede')}</p>

          {save.ok && (
            <div style={{ margin: '14px 0' }}>
              <button type="button" className="btn btn-primary btn-lg" onClick={onContinue}>
                <Play size={18} aria-hidden />{' '}
                {t('title.continue', { when: save.state.phase === 'ended' ? t('title.continueFinal') : save.state.year })}
              </button>
              <span className="small muted" style={{ marginLeft: 10 }}>{t('title.seedLabel', { seed: save.state.seed })}</span>
            </div>
          )}
          {!save.ok && save.reason !== 'none' && (
            <div className="warning" role="alert">
              <TriangleAlert size={16} aria-hidden /> {t(SAVE_ERRORS[save.reason] ?? 'save.corrupt')}
              <button type="button" className="btn btn-sm" onClick={onDiscard}>{t('title.discard')}</button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onNew(seed.trim() || String(randomSeed()));
            }}
          >
            <div className="seed-row">
              <label htmlFor="seed-input" className="small"><strong>{t('title.seed')}</strong></label>
              <input id="seed-input" value={seed} onChange={(e) => setSeed(e.target.value)} aria-describedby="seed-help" />
              <button type="button" className="btn btn-sm" onClick={() => setSeed(String(randomSeed()))} aria-label={t('title.randomize')}>
                <Shuffle size={14} aria-hidden /> {t('title.random')}
              </button>
            </div>
            <p id="seed-help" className="small muted">{t('title.seedHelp')}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-gold btn-lg">
                <Play size={18} aria-hidden /> {save.ok ? t('title.newAdmin') : t('title.begin')}
              </button>
              <button type="button" className="btn btn-lg" onClick={onHelp}>
                <CircleHelp size={18} aria-hidden /> {t('title.howTo')}
              </button>
            </div>
            {save.ok && <p className="small muted" style={{ marginTop: 6 }}>{t('title.replaces')}</p>}
          </form>
        </div>
        <div>
          <CampusMap state={preview} interactive={false} />
          <p className="small muted" style={{ marginTop: 8 }}>{t('title.fiction')}</p>
        </div>
      </div>
    </main>
  );
}
