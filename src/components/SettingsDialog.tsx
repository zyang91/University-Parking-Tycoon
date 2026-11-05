import { Languages, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { LANGUAGES, useI18n } from '../i18n/I18nContext';

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { lang, setLang, t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="settings-title">{t('settings.title')}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t('settings.close')}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <fieldset className="lang-options">
          <legend>
            <Languages size={16} aria-hidden /> {t('settings.language')} / Language
          </legend>
          {LANGUAGES.map((opt) => (
            <label key={opt.id} className={`lang-option${lang === opt.id ? ' active' : ''}`}>
              <input
                type="radio"
                name="lang"
                value={opt.id}
                checked={lang === opt.id}
                onChange={() => setLang(opt.id)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>
        <p className="small muted">{t('settings.note')}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t('settings.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
