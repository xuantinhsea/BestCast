import { lazy, Suspense } from 'react'
import { SkySpinner } from '../components/SkySpinner'
import { useI18n } from '../i18n/context'

const Charts = lazy(() => import('./Charts'))

/**
 * The app's original view — every forecast service's figures, a fortnight
 * day by day and a week hour by hour, with how far apart they are — kept one
 * tap away under the everyday screen. The choice to show it is remembered, so
 * a reader who always wants the charts gets them without asking twice.
 */
export function ChartsSection({ open, onToggle, data, system, todayIdx, nowIdx }) {
  const { t } = useI18n()

  return (
    <section aria-labelledby="charts-title" className="flex flex-col gap-4">
      <div className="glass p-4">
        <h2 id="charts-title" className="text-xl font-bold">{t('charts.title')}</h2>
        <p className="mt-1 text-base leading-snug">{t('charts.hint')}</p>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="mt-3 w-full min-h-[3.4rem] px-5 rounded-xl bg-white text-[#0b2a4a]
                     text-lg font-semibold active:bg-white/85"
        >
          {open ? t('charts.hide') : t('charts.show')}
        </button>
      </div>
      {open && (
        <Suspense fallback={<SkySpinner label={t('states.loading')} />}>
          <Charts data={data} system={system} todayIdx={todayIdx} nowIdx={nowIdx} />
        </Suspense>
      )}
    </section>
  )
}
