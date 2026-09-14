import { useMemo, useState } from 'react'
import { Card, CardTitle } from '../components/ui'
import { RangeBarChart } from '../components/charts/RangeBarChart'
import { niceBounds } from '../components/charts/chartBase'
import { HOURLY_DAYS, robustCeiling } from '../core/ensemble'
import { convertAll, formatConverted, unitSymbol } from '../core/units'
import { useI18n } from '../i18n/context'

/**
 * One parameter, twice: a fortnight day by day, then a week hour by hour.
 *
 * The daily and hourly views live in the same card rather than in two separate
 * sections of the page, so the colour, the units and the wording a reader has
 * just learned still apply when they look at the second chart. Splitting them
 * would make the reader relearn the encoding four times over.
 */
export function ParameterCard({ parameter, data, system, todayIdx, nowIdx }) {
  const { t, fmt, localeMeta } = useI18n()
  const [asTable, setAsTable] = useState(false)

  const unit = unitSymbol(parameter.unit, system)
  const name = t(`params.${parameter.messageKey}.name`)

  const num = (v, { withUnit = false } = {}) => {
    if (v == null) return '—'
    const text = formatConverted(v, parameter.unit, system, { locale: localeMeta.tag })
    return withUnit ? `${text}${unit}` : text
  }

  // --- daily ---------------------------------------------------------------
  const daily = useMemo(() => {
    const high = data.daily[parameter.daily]
    const low = parameter.dailyLow ? data.daily[parameter.dailyLow] : null
    if (!high) return null

    const highLikely = convertAll(high.likely, parameter.unit, system)
    const lowLikely = low ? convertAll(low.likely, parameter.unit, system) : null

    // Temperature is the one parameter drawn as a floating bar: the column runs
    // from the overnight low to the daytime high, so its height is the swing
    // over the day rather than a distance from an arbitrary zero.
    const values = lowLikely
      ? highLikely.map((v, i) => (v == null || lowLikely[i] == null ? null : [lowLikely[i], v]))
      : highLikely

    return { values, peaks: highLikely, lowLikely, highLikely }
  }, [data, parameter, system])

  // --- hourly --------------------------------------------------------------
  const hourly = useMemo(() => {
    const s = data.hourly?.[parameter.hourly]
    if (!s || !data.hours?.length) return null
    const likely = convertAll(s.likely, parameter.unit, system)
    return { values: likely, peaks: likely }
  }, [data, parameter, system])

  if (!daily) return null

  const dailyBounds = boundsFor(parameter, daily.values, system)
  const hourlyBounds = hourly ? boundsFor(parameter, hourly.values, system) : null

  const dayLabels = data.days.map(fmt.dayTick)
  const hourLabels = hourly ? data.hours.map(fmt.hourTick) : []

  // One label per day, so a long run of hours reads as a week rather than as
  // one undifferentiated strip. Built from the series itself rather than from a
  // fixed list, so changing how many days are fetched needs no change here.
  // The first two are named by position, not by comparing dates to the reader's
  // clock: the series begins at the forecast location's own midnight, which is
  // not always the same calendar day as the reader's.
  // Taken from the series rather than the constant, so a short reply from the
  // API is described honestly instead of promising days it did not send.
  const hourlyDays = hourly ? Math.ceil(data.hours.length / 24) : HOURLY_DAYS
  const groups = []
  if (hourly) {
    for (let i = 0; i < data.hours.length; i += 24) {
      const label = i === 0 ? t('chart.today')
        : i === 24 ? t('chart.tomorrow')
        : fmt.weekdayLong(data.hours[i])
      groups.push({ from: i, to: Math.min(i + 24, data.hours.length), label })
    }
  }

  return (
    // min-w-0 is load-bearing: a grid item defaults to min-width:auto, so the
    // 3300px hourly strip inside would set the width of the whole column and
    // push the daily chart off the side of the screen. It has to be told it may
    // be narrower than its widest child.
    <Card className="min-w-0">
      <CardTitle hint={t(`params.${parameter.messageKey}.daily`)}>
        {name} <span className="text-muted font-semibold">({unit})</span>
      </CardTitle>

      {asTable ? (
        <DataTable
          parameter={parameter}
          rows={data.days.map((d, i) => ({
            // Day and month only: the year wraps the column onto two lines and
            // a fortnight of forecast is never ambiguous about which one it is.
            when: fmt.dayMonth(d),
            likely: daily.lowLikely
              ? `${num(daily.lowLikely[i])} – ${num(daily.highLikely[i], { withUnit: true })}`
              : num(daily.highLikely[i], { withUnit: true }),
          }))}
          whenLabel={t('table.date')}
        />
      ) : (
        <RangeBarChart
          labels={dayLabels}
          values={daily.values}
          peaks={daily.peaks}
          format={(v) => num(v, { withUnit: true })}
          colorKey={parameter.color}
          yMin={dailyBounds.min}
          yMax={dailyBounds.max}
          unitSuffix={unit}
          barBase={parameter.kind === 'temp' ? dailyBounds.min : undefined}
          markerIndex={todayIdx}
          markerLabel={t('chart.todayMark')}
          height="14rem"
          ariaLabel={t('chart.ariaDaily', { param: name, summary: summarise(daily.peaks, num, unit) })}
          tooltipText={{
            title: (i) => fmt.dayFull(data.days[i]),
            body: (i) => num(daily.peaks[i], { withUnit: true }),
          }}
        />
      )}

      {/* --- hour by hour ---------------------------------------------- */}
      {hourly && !asTable && (
        <div className="mt-5 pt-4 border-t border-hairline">
          <p className="text-lg font-bold text-ink">{t('chart.hourly')}</p>
          <p className="text-base text-muted mb-2">{t('chart.hourlyHint', { days: hourlyDays })}</p>
          <RangeBarChart
            labels={hourLabels}
            values={hourly.values}
            peaks={hourly.peaks}
            format={(v) => num(v)}
            colorKey={parameter.color}
            yMin={hourlyBounds.min}
            yMax={hourlyBounds.max}
            unitSuffix={unit}
            barBase={parameter.kind === 'temp' ? hourlyBounds.min : undefined}
            markerIndex={nowIdx}
            markerLabel={t('chart.nowMark')}
            groups={groups}
            height="13rem"
            // Wide enough that every hour keeps a legible bar, narrow enough
            // that a week of them stays a canvas a phone will actually
            // allocate. The strip scrolls rather than compressing a hundred
            // and sixty-eight columns into a phone's width.
            columnPx={38}
            // The axis would scroll away from its own numbers, and with every
            // bar labelled directly it has nothing left to say.
            showYAxis={false}
            ariaLabel={t('chart.ariaHourly', { param: name, days: hourlyDays, summary: summarise(hourly.peaks, num, unit) })}
            tooltipText={{
              title: (i) => fmt.hourFull(data.hours[i]),
              body: (i) => num(hourly.peaks[i], { withUnit: true }),
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setAsTable((v) => !v)}
        className="mt-4 min-h-[2.8rem] px-3 rounded-lg border-2 border-line
                   text-base font-semibold text-ink-2 active:bg-sunken"
      >
        {asTable ? t('table.hide') : t('table.show')}
      </button>
    </Card>
  )
}

/**
 * The same numbers as a table.
 *
 * Offered to everyone, not hidden behind a screen-reader-only class. Some
 * readers would simply rather have the figures — that is not a disability
 * accommodation, it is a preference the interface should just honour.
 */
function DataTable({ rows, whenLabel }) {
  const { t } = useI18n()
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="text-left">
            <th scope="col" className="py-2 pr-3 font-bold text-ink border-b-2 border-line">{whenLabel}</th>
            <th scope="col" className="py-2 font-bold text-ink border-b-2 border-line">{t('table.likely')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.when}>
              <th scope="row" className="py-2 pr-3 font-semibold text-ink-2 border-b border-hairline text-left">{r.when}</th>
              <td className="py-2 font-bold text-ink border-b border-hairline tabular-nums">{r.likely}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Axis bounds per parameter.
 *
 * An amount starts at zero — a rainfall axis beginning at 4 mm makes a wet day
 * look dry. A level does not: a temperature axis forced to zero spends most of
 * its height on air nobody asked about.
 */
function boundsFor(parameter, values, system) {
  const all = []
  for (const v of values) {
    if (Array.isArray(v)) { if (v[0] != null) all.push(v[0], v[1]) } else if (v != null) all.push(v)
  }
  if (!all.length) return { min: 0, max: 1 }

  if (parameter.kind === 'percent') return { min: 0, max: 100 }

  if (parameter.kind === 'temp') {
    return niceBounds(Math.min(...all) - 1, Math.max(...all) + 1)
  }

  // Rain and wind both start at zero.
  if (parameter.kind === 'rain') {
    // The floor only exists to give a completely dry chart an axis to draw; it
    // must not set the scale for a chart that merely has small numbers on it.
    // At 10 mm a Hanoi day of 0.2 mm drizzle drew every bar as a flat smear
    // along the bottom, with nine tenths of the plot empty above it.
    // Rain is violently skewed at both resolutions — one day of 122 mm against
    // a week under 10 mm, or one 30 mm hour against a week of drizzle — so the
    // ceiling comes from a percentile rather than the peak, and the columns
    // that overshoot are labelled with a caret and their real figure.
    //
    // This matters more now the hourly chart covers a week than it did at three
    // days: scaled to its single wettest hour, every ordinary hour flattened
    // into an invisible smear along the axis.
    const floor = system.id === 'imperial' ? 0.02 : 0.5
    const top = robustCeiling(all.map((v) => ({ max: v, median: v })), { floor })
    return { min: 0, max: niceBounds(0, top).max }
  }

  return { min: 0, max: niceBounds(0, Math.max(...all)).max }
}

/** A one-line spoken summary, so a screen reader gets the shape of the chart
 *  rather than "graphic". */
function summarise(values, num, unit) {
  const present = values.filter((v) => v != null)
  if (!present.length) return ''
  return `${num(Math.min(...present))}–${num(Math.max(...present))}${unit}`
}
