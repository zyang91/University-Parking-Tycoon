import type { GameState } from '../engine';
import { useI18n } from '../i18n/I18nContext';
import LineChart from './LineChart';

export default function StatsView({ state }: { state: GameState }) {
  const { t, money } = useI18n();
  const st = state.stats;
  const years = st.map((s) => s.year);
  const col = <K extends keyof (typeof st)[number]>(k: K) => st.map((s) => s[k] as number);
  return (
    <div className="page">
      <div className="page-inner">
        <h2>{t('stats.title')}</h2>
        <p className="muted">{t('stats.intro')} {st.length <= 1 && t('stats.empty')}</p>
        <div className="charts">
          <LineChart title={t('stats.supply')} years={years} series={[
            { label: t('stats.capacity'), color: '#1f2a44', values: col('capacity') },
            { label: t('stats.demand'), color: '#a5483a', values: col('demand') },
            { label: t('stats.occupied'), color: '#d9a43a', values: col('occupied'), dashed: true },
          ]} />
          <LineChart title={t('stats.cash')} years={years} fmt={money} series={[{ label: t('stats.cashSeries'), color: '#4d7a46', values: col('cash') }]} />
          <LineChart title={t('stats.satisfaction')} years={years} min={0} max={100} series={[
            { label: t('ind.faculty'), color: '#1f2a44', values: col('faculty') },
            { label: t('ind.students'), color: '#d9a43a', values: col('students') },
            { label: t('ind.neighborhood'), color: '#a5483a', values: col('neighborhood') },
          ]} />
          <LineChart title={t('stats.path')} years={years} min={0} max={100} series={[
            { label: t('ind.autoDependence'), color: '#2d2d2d', values: col('autoDependence') },
            { label: t('stats.inertia'), color: '#7e3329', values: col('inertia'), dashed: true },
            { label: t('ind.sustainability'), color: '#4d7a46', values: col('sustainability') },
          ]} />
          <LineChart title={t('stats.price')} years={years} fmt={(n) => `$${Math.round(n)}`} series={[{ label: t('stats.priceSeries'), color: '#d9a43a', values: col('price') }]} />
          <LineChart title={t('stats.net')} years={years} fmt={money} series={[{ label: t('stats.netSeries'), color: '#1f2a44', values: col('netRevenue') }]} />
        </div>
      </div>
    </div>
  );
}
