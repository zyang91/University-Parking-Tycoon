import { academicShortfall, academicTarget, capacity, countParcels, eraFor, type GameState } from '../engine';
import { useI18n } from '../i18n/I18nContext';
import type { StringKey } from '../i18n/strings';
import CampusMap from './CampusMap';
import Dashboard from './Dashboard';

export default function CampusView({ state }: { state: GameState }) {
  const { t, tx, lang } = useI18n();
  const rows: [StringKey, number, string][] = [
    ['campus.academic', countParcels(state, 'academic'), t('campus.academicNote', { n: academicTarget(state) })],
    ['campus.lots', countParcels(state, 'lot'), t('campus.lotsNote')],
    ['campus.garages', countParcels(state, 'garage'), t('campus.garagesNote')],
    ['campus.greens', countParcels(state, 'green'), t('campus.greensNote')],
    ['campus.vacant', countParcels(state, 'vacant'), t('campus.vacantNote')],
  ];
  const garages = state.parcels
    .filter((p) => p.type === 'garage')
    .map((p) => `${p.name ? tx(p.name) : t('map.parkingGarage')} (${Math.round(p.condition)}%)`)
    .join(lang === 'zh' ? '、' : ', ');
  const shortfall = academicShortfall(state);
  return (
    <div className="page">
      <div className="page-inner">
        <h2>{t('campus.title')}</h2>
        <p className="muted">
          {t('campus.meta', { year: state.year, era: tx(eraFor(state.year).name), pop: state.popIndex.toFixed(2), tq: Math.round(state.transitQuality) })}
        </p>
        <div className="two-col" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
          <div>
            <CampusMap state={state} />
            <section className="panel" style={{ marginTop: 12 }}>
              <h3 className="panel-title">{t('campus.inventory')}</h3>
              <table className="delta-table">
                <tbody>
                  {rows.map(([label, n, note]) => (
                    <tr key={label}>
                      <td>{t(label)}<div className="small muted">{note}</div></td>
                      <td className="num">{n}</td>
                      <td className="num">{t('campus.units', { n: n * 5 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shortfall > 0 && <p className="small down" style={{ marginTop: 8 }}>{t('campus.needs', { n: shortfall })}</p>}
              <p className="small muted" style={{ marginTop: 8 }}>
                {t('campus.garageList', { list: garages || t('campus.none') })}
                {state.flags.annexLot && t('campus.annex')}
                {t('campus.effective', { n: capacity(state).toLocaleString() })}
              </p>
            </section>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Dashboard state={state} />
          </div>
        </div>
      </div>
    </div>
  );
}
