import { useState } from 'react'
import { ConditionIcon } from '../components/ConditionIcon'
import { formatRain, formatTemp, formatWind } from '../core/units'
import { tempColor, uvLevel } from '../core/conditions'
import { useI18n } from '../i18n/context'

/**
 * The coming week, one row a day, in the layout every phone weather app has
 * taught its readers: day, sky, low, a bar for the range, high.
 *
 * The bars share one scale across the week, so a cold day sits visibly to the
 * left of a warm one. Behind each bar a fainter band runs from the coldest low
 * to the warmest high that any of the forecast services gives — the app's own
 * addition to the familiar layout. A wide band is a day the services disagree
 * about; a band hugging the bar is one they agree on.
 *
 * Tapping a day opens the rest of what is known about it, in words.
 */
export function DailyList({ view, system, nowTemp }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(null)
  if (!view?.days?.length) return null

  return (
    <section className="glass px-3.5 py-4" aria-labelledby="daily-title">
      <h2 id="daily-title" className="glass-label">{t('daily.title', { count: view.days.length })}</h2>
      <ul className="daily-list mt-2">
        {view.days.map((day) => (
          <DayRow
            key={day.index}
            day={day}
            system={system}
            range={view.weekRange}
            nowTemp={day.isToday ? nowTemp : null}
            open={open === day.index}
            onToggle={() => setOpen(open === day.index ? null : day.index)}
          />
        ))}
      </ul>
      <p className="glass-dim mt-3 text-base leading-snug">{t('daily.spreadNote')}</p>
    </section>
  )
}

function DayRow({ day, system, range, nowTemp, open, onToggle }) {
  const { t, fmt } = useI18n()
  const label = day.isToday ? t('chart.today') : fmt.weekdayShort(day.date)
  const chance = day.chance != null && day.chance >= 20 ? Math.round(day.chance / 10) * 10 : null
  const panelId = `day-${day.index}`

  return (
    <li className="border-t border-white/15 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="day-row w-full min-h-[3.6rem] py-1.5 text-left active:bg-white/5"
      >
        <span className="day-name text-lg font-semibold truncate">{label}</span>
        <span className="day-icon flex flex-col items-center leading-none">
          <ConditionIcon name={day.condition.icon} size="1.9rem" />
          {chance != null && <span className="chance-text text-xs font-bold mt-0.5">{t('hourly.chance', { chance })}</span>}
        </span>
        <span className="day-low glass-dim text-lg font-semibold text-right">
          <span className="sr-only">{t('chart.low')} </span>{formatTemp(day.low, system)}°
        </span>
        <span className="day-range"><RangeBar day={day} range={range} nowTemp={nowTemp} /></span>
        <span className="day-high text-lg font-semibold text-right">
          <span className="sr-only">{t('chart.high')} </span>{formatTemp(day.high, system)}°
        </span>
      </button>

      {open && (
        <dl id={panelId} className="pb-3 pt-1 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {day.condition.key && (
            <div className="col-span-2 flex items-center gap-2">
              <dt className="sr-only">{t('daily.sky')}</dt>
              <dd className="text-lg font-semibold">{t(`sky.${day.condition.key}`)}</dd>
            </div>
          )}
          <Fact term={t('params.precipitation.name')} value={`${formatRain(day.rain, system)} ${system.rainSymbol}`} />
          <Fact term={t('params.precipitationProbability.name')} value={day.chance == null ? '—' : `${Math.round(day.chance)}%`} />
          <Fact term={t('daily.windMax')} value={`${formatWind(day.wind, system)} ${system.windSymbol}`} />
          {day.uvMax != null && (
            <Fact term={t('tiles.uv')} value={`${Math.round(day.uvMax)} · ${t(`uv.${uvLevel(Math.round(day.uvMax))}`)}`} />
          )}
          {day.sunrise && <Fact term={t('hourly.sunrise')} value={fmt.hour(day.sunrise)} />}
          {day.sunset && <Fact term={t('hourly.sunset')} value={fmt.hour(day.sunset)} />}
          {day.spreadLow != null && day.spreadHigh != null && (
            <div className="col-span-2">
              <dt className="glass-dim text-base">{t('daily.spreadTerm')}</dt>
              <dd className="text-lg font-semibold">
                {t('daily.spreadValue', {
                  low: `${formatTemp(day.spreadLow, system)}°`,
                  high: `${formatTemp(day.spreadHigh, system)}°`,
                })}
              </dd>
            </div>
          )}
        </dl>
      )}
    </li>
  )
}

function Fact({ term, value }) {
  return (
    <div>
      <dt className="glass-dim text-base">{term}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  )
}

/** Positions are worked out in Celsius, whatever the reader's units: only the
 *  printed numbers change with the unit system, not the geometry. */
function RangeBar({ day, range, nowTemp }) {
  if (!range || day.low == null || day.high == null) return null
  const [min, max] = range
  const span = Math.max(1, max - min)
  const pos = (c) => `${(((c - min) / span) * 100).toFixed(2)}%`
  const width = (a, b) => `${(((b - a) / span) * 100).toFixed(2)}%`
  const hasSpread = day.spreadLow != null && day.spreadHigh != null

  return (
    <span className="relative block h-[0.8rem]" aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[0.38rem] rounded-full bg-black/25" />
      {hasSpread && (
        <span
          className="absolute top-0 h-full rounded-full bg-white/22"
          style={{ left: pos(day.spreadLow), width: width(day.spreadLow, day.spreadHigh) }}
        />
      )}
      <span
        className="absolute top-1/2 -translate-y-1/2 h-[0.38rem] rounded-full"
        style={{
          left: pos(day.low),
          width: width(day.low, day.high),
          background: `linear-gradient(90deg, ${tempColor(day.low)}, ${tempColor(day.high)})`,
        }}
      />
      {nowTemp != null && nowTemp >= min && nowTemp <= max && (
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-[0.62rem] w-[0.62rem]
                     rounded-full bg-white ring-2 ring-black/35"
          style={{ left: pos(nowTemp) }}
        />
      )}
    </span>
  )
}
