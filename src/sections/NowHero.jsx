import { ConditionIcon } from '../components/ConditionIcon'
import { formatTemp } from '../core/units'
import { useI18n } from '../i18n/context'

/**
 * The top of the screen: where, how warm, and what the sky is doing.
 *
 * This is what most people open a weather app for and close it again after,
 * so it is the largest thing on the screen and needs nothing else to be read.
 * The place name doubles as the way to change place — it is the first thing
 * anyone taps when the forecast is for the wrong town.
 *
 * Everything here sits directly on the sky colour, and every word is pure
 * white: the dimmed white used inside the cards does not reach 4.5:1 on the
 * brightest skies without a card behind it.
 */
export function NowHero({ place, view, system, onOpenPlaces, refreshing, onRefresh, updatedLabel }) {
  const { t } = useI18n()
  const now = view?.now
  const deg = (c) => `${formatTemp(c, system)}°`

  return (
    <section className="text-center text-white pt-2 pb-6 px-2" aria-labelledby="place-name">
      <h1 id="place-name" className="m-0">
        <button
          type="button"
          onClick={onOpenPlaces}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-2 max-w-full min-h-[3.4rem] px-4 rounded-full
                     text-[1.75rem] font-semibold leading-tight active:bg-black/15"
        >
          <span className="truncate">{place ? place.name : t('header.choosePlace')}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '1.3rem', height: '1.3rem' }} className="shrink-0">
            <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only">{t('places.change')}</span>
        </button>
      </h1>
      {place?.detail && <p className="text-base font-medium -mt-1 truncate">{place.detail}</p>}

      {now && now.temp != null && (
        <>
          <p className="now-temp mt-1 font-extralight leading-none tracking-tight" aria-hidden="true">
            {formatTemp(now.temp, system)}<span className="align-top">°</span>
          </p>
          <p className="sr-only">{t('now.tempSr', { temp: formatTemp(now.temp, system), unit: system.tempSymbol })}</p>

          {now.condition?.key && (
            <p className="mt-1 inline-flex items-center justify-center gap-2 text-2xl font-semibold">
              <ConditionIcon name={now.condition.icon} size="2rem" />
              <span>{t(`sky.${now.condition.key}`)}</span>
            </p>
          )}

          <p className="mt-1 text-xl font-semibold">
            {t('now.highLow', { high: deg(now.high), low: deg(now.low) })}
          </p>
          {now.feelsLike != null && (
            <p className="text-lg">{t('now.feelsLike', { temp: deg(now.feelsLike) })}</p>
          )}
        </>
      )}

      {updatedLabel && (
        <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
          <p className="text-base">{updatedLabel}</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 min-h-[3.4rem] px-5 rounded-full
                       bg-black/20 border border-white/40 text-base font-semibold
                       active:bg-black/30 disabled:opacity-80"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '1.15rem', height: '1.15rem' }}
                 className={refreshing ? 'animate-spin' : ''}>
              <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5" fill="none" stroke="currentColor"
                    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {refreshing ? t('header.updating') : t('header.update')}
          </button>
        </div>
      )}
    </section>
  )
}
