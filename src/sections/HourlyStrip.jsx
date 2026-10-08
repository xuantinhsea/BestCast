import { ConditionIcon } from '../components/ConditionIcon'
import { formatTemp } from '../core/units'
import { useI18n } from '../i18n/context'

/**
 * The next twenty-four hours as a sideways strip, with the one sentence that
 * matters most above it: when the rain starts or stops.
 *
 * A chance of rain is printed under an hour's icon only from 20 % up. Below
 * that every hour would carry a number, and the hours that matter would stop
 * standing out from the ones that do not.
 */
const SHOW_CHANCE_FROM = 20

export function HourlyStrip({ view, system }) {
  const { t, fmt } = useI18n()
  if (!view?.hours?.length) return null

  return (
    <section className="glass px-3.5 py-4" aria-labelledby="hourly-title">
      <h2 id="hourly-title" className="glass-label">{t('hourly.title')}</h2>
      {view.outlook && (
        <p className="mt-1.5 text-lg font-semibold leading-snug">{outlookSentence(view.outlook, t, fmt)}</p>
      )}

      <ol className="no-scrollbar relative mt-3 -mx-3.5 px-1.5 flex overflow-x-auto border-t border-white/15 pt-3">
        {view.hours.map((h) => (h.kind === 'hour'
          ? <HourCell key={h.time.getTime()} hour={h} system={system} />
          : <SunCell key={`${h.kind}-${h.time.getTime()}`} event={h} />))}
      </ol>
    </section>
  )
}

function HourCell({ hour, system }) {
  const { t, fmt } = useI18n()
  const chance = hour.chance != null && hour.chance >= SHOW_CHANCE_FROM ? Math.round(hour.chance / 10) * 10 : null
  return (
    <li className="shrink-0 min-w-[3.7rem] px-1 flex flex-col items-center gap-1">
      <span className="text-base font-semibold">{hour.isNow ? t('hourly.now') : fmt.hourTick(hour.time)}</span>
      <ConditionIcon name={hour.condition.icon} size="2.1rem" />
      {hour.condition.key && <span className="sr-only">{t(`sky.${hour.condition.key}`)}</span>}
      <span className="chance-text text-sm font-bold min-h-[1.3rem]">
        {chance != null && t('hourly.chance', { chance })}
      </span>
      <span className="text-xl font-semibold">{formatTemp(hour.temp, system)}°</span>
    </li>
  )
}

function SunCell({ event }) {
  const { t, fmt } = useI18n()
  return (
    <li className="shrink-0 min-w-[3.7rem] px-1 flex flex-col items-center gap-1">
      <span className="text-base font-semibold">{fmt.hour(event.time)}</span>
      <ConditionIcon name={event.kind} size="2.1rem" />
      <span className="min-h-[1.3rem]" />
      <span className="text-sm font-semibold leading-tight text-center">{t(`hourly.${event.kind}`)}</span>
    </li>
  )
}

/** The outlook kinds from core/conditions.js, each a whole sentence per
 *  language with the hour slotted in. */
function outlookSentence(outlook, t, fmt) {
  const what = outlook.snow ? 'snow' : 'rain'
  const time = outlook.time ? fmt.hour(outlook.time) : ''
  return t(`outlook.${what}.${outlook.kind}`, { time })
}
