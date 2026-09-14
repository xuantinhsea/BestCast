import { useEffect, useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { baseOptions, axes, labelsFit } from './chartBase'
import { useChartTheme } from '../../hooks/useChartTheme'

/**
 * One bar per day or per hour: the forecast.
 *
 * One mark carries the encoding — the solid bar is the single number the reader
 * came for. The spread across the underlying services is still computed (it is
 * what supplies the middle value when there is no blended pick) but it is no
 * longer drawn: the chart says what the forecast is, and says it once.
 *
 * Every bar carries its value as text above it, because reading a height off an
 * axis is a skill, and the number is the thing being communicated. When the
 * labels cannot all fit they thin out on a fixed stride rather than dropping
 * the ones that happen to collide — a chart that labels days 1, 2, 5 and 6
 * looks like those days are special.
 */
export function RangeBarChart({
  labels,
  /** number[] for a bar from the baseline, or [low, high][] for a floating one. */
  values,
  /** The number written above each bar. Already converted and in display units. */
  peaks,
  format,
  /** Token name for this parameter's hue — 'rain', 'prob', 'temp', 'wind'. */
  colorKey,
  yMin,
  yMax,
  unitSuffix = '',
  /** Value the solid bars grow from. Temperature does not start at zero. */
  barBase,
  markerIndex = -1,
  markerLabel,
  /** [{ from, to, label }] — a divider before `from` and a label centred in the span. */
  groups = [],
  height = '15rem',
  /** Minimum width per column. Above this the chart scrolls sideways. */
  columnPx = 0,
  showYAxis = true,
  showGrid = true,
  ariaLabel,
  tooltipText,
}) {
  const theme = useChartTheme()
  const chartRef = useRef(null)
  const scrollRef = useRef(null)
  const openedAt = useRef(false)
  const px = theme.rootPx
  // A canvas cannot resolve `var(--color-rain)`; it needs the computed value,
  // which is what the theme hook reads out of the stylesheet for us.
  const color = theme.colors[colorKey] ?? theme.colors.rain

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'likely',
        data: values,
        base: barBase,
        backgroundColor: color.solid,
        borderWidth: 0,
        borderRadius: px * 0.16,
        barPercentage: 0.72,
        categoryPercentage: 0.82,
      },
    ],
  }), [labels, values, color, px, barBase])

  const options = useMemo(() => {
    const base = baseOptions(theme)
    const built = axes(theme, { min: yMin, max: yMax, unit: unitSuffix })
    return {
      ...base,
      // Room above the tallest bar for the value written over it, and for the
      // day names on the hourly chart.
      layout: { padding: { ...base.layout.padding, top: px * (groups.length > 1 ? 2.9 : 1.9) } },
      animation: false,
      // A week of hours is a canvas several thousand CSS pixels wide, and at a
      // retina ratio the backing store crosses what mobile Safari will allocate
      // — past its limit the canvas silently comes back blank. Capping the
      // ratio for the scrolling charts costs a little sharpness on a strip that
      // is being swiped past anyway, and keeps four of them affordable.
      ...(columnPx ? { devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5) } : {}),
      scales: {
        x: {
          ...built.x,
          grid: { display: false },
          ticks: {
            ...built.x.ticks,
            autoSkip: false,
            // Smaller than the shared default. Fourteen columns on a phone
            // leave about 22px each, and Vietnamese weekdays ("T2".."CN") ran
            // into one another at the standard tick size.
            font: { ...built.x.ticks.font, size: px * 0.72 },
          },
        },
        y: {
          ...built.y,
          display: showYAxis,
          grid: { ...built.y.grid, display: showGrid, drawTicks: false },
        },
      },
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            title: (items) => tooltipText?.title?.(items[0].dataIndex) ?? '',
            label: (item) => tooltipText?.body?.(item.dataIndex) ?? '',
          },
        },
      },
    }
  }, [theme, yMin, yMax, unitSuffix, px, showYAxis, showGrid, groups.length, tooltipText, columnPx])

  /**
   * The three things Chart.js has no concept of: the value over each bar, the
   * rule at today or now, and the day boundaries on the hourly chart.
   */
  const plugins = useMemo(() => [{
    id: 'rangeBarMarks',

    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart
      const barMeta = chart.getDatasetMeta(0)
      if (!barMeta?.data?.length) return

      // --- day bands and dividers, behind everything else it draws ---------
      ctx.save()
      for (const g of groups) {
        if (g.from > 0) {
          const x = scales.x.getPixelForValue(g.from) - columnWidth(barMeta) / 2
          ctx.strokeStyle = theme.axis
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x, chartArea.top - px * 1.5)
          ctx.lineTo(x, chartArea.bottom)
          ctx.stroke()
        }
        // Left-aligned at the day's first column rather than centred in it.
        // A span of twenty-four hours is over a thousand pixels wide and only a
        // few hundred of them are on screen, so a centred label sits outside
        // the visible window — "today" was invisible until you scrolled into
        // the middle of today.
        ctx.font = `700 ${px * 0.85}px ${theme.fontFamily}`
        ctx.fillStyle = theme.ink2
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const start = scales.x.getPixelForValue(g.from) - columnWidth(barMeta) / 2
        ctx.fillText(g.label, start + px * 0.3, chartArea.top - px * 2.6)
      }
      ctx.restore()

      // --- the value over each bar ----------------------------------------
      ctx.save()
      ctx.font = `700 ${px * 0.8}px ${theme.fontFamily}`
      ctx.fillStyle = theme.ink
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'

      /**
       * Daily rainfall is violently skewed — one service forecasting 200 mm
       * against a week sitting under 10 mm is ordinary, not rare, and scaling
       * the axis to it would flatten every readable column. The axis is set
       * from a percentile instead, and a column whose range runs off the top is
       * labelled with a caret and its REAL figure.
       *
       * "It could be 200 mm" is the most important sentence this chart can say
       * to someone with equipment in a floodplain, so an overflow label is
       * never thinned away and never replaced by the headline number.
       */
      const entries = []
      for (let i = 0; i < peaks.length; i++) {
        const top = Array.isArray(values[i]) ? values[i][1] : values[i]
        if (!Number.isFinite(top)) continue
        if (yMax != null && top > yMax) entries.push({ i, text: `▲ ${format(top)}`, top, over: true })
        else if (peaks[i] != null) entries.push({ i, text: format(peaks[i]), top, over: false })
      }

      // Thin the ordinary labels on a fixed stride, so the survivors are evenly
      // spaced and no day reads as singled out by an accident of collision.
      const ordinary = entries.filter((e) => !e.over).map((e) => e.text)
      let stride = 1
      if (ordinary.length && !labelsFit(ctx, chart, ordinary, px * 0.5)) {
        const widest = Math.max(...ordinary.map((t) => ctx.measureText(t).width))
        stride = Math.max(2, Math.ceil((widest + px * 0.5) / columnWidth(barMeta)))
      }

      for (const e of entries) {
        if (!e.over && e.i % stride !== 0) continue
        const at = yMax != null ? Math.min(e.top, yMax) : e.top
        const y = Math.max(chartArea.top + px * 0.7, scales.y.getPixelForValue(at) - px * 0.3)
        ctx.fillText(e.text, barMeta.data[e.i].x, y)
      }
      ctx.restore()

      // --- the rule at today, or at the hour we are in ---------------------
      if (markerIndex == null || markerIndex < 0 || !markerLabel) return
      ctx.save()
      const x = scales.x.getPixelForValue(markerIndex)
      ctx.strokeStyle = theme.ink2
      ctx.lineWidth = 1.5
      ctx.setLineDash([px * 0.25, px * 0.25])
      ctx.beginPath()
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.stroke()
      ctx.setLineDash([])

      // Labelled in the padding ABOVE the plot, not along the bottom. The
      // bottom is where a zero-valued bar puts its own label — "0mm" and
      // "today" were landing on top of each other on every dry day — and the
      // value labels are clamped inside the plot area, so this strip is the one
      // piece of the chart nothing else can reach.
      ctx.font = `700 ${px * 0.78}px ${theme.fontFamily}`
      ctx.fillStyle = theme.ink2
      ctx.textBaseline = 'bottom'
      const nearRight = x > chartArea.left + chartArea.width * 0.75
      ctx.textAlign = nearRight ? 'right' : 'left'
      ctx.fillText(markerLabel, x + (nearRight ? -px * 0.25 : px * 0.25), chartArea.top - px * 0.25)
      ctx.restore()
    },
  }], [theme, px, peaks, format, values, yMax, markerIndex, markerLabel, groups])

  /**
   * A week-long strip opens at the hour we are in, not at last midnight.
   *
   * Scrolled to the start, the first thing a reader meets is a day that has
   * already happened — and on a dry morning, an apparently empty chart. The
   * current hour is placed a little in from the left so there is visible
   * context behind it.
   *
   * Once only: re-running this on every render would drag the strip back under
   * a reader who had scrolled it somewhere else.
   */
  useEffect(() => {
    const box = scrollRef.current
    if (!box || openedAt.current || !columnPx || markerIndex == null || markerIndex < 0) return
    openedAt.current = true
    box.scrollLeft = Math.max(0, (markerIndex - 1.5) * columnPx)
  }, [columnPx, markerIndex])

  // A chart wider than its container scrolls sideways rather than compressing
  // a week of hours into a phone's width, where neither the bars nor their
  // labels would survive.
  const width = columnPx ? `${Math.max(labels.length * columnPx, 320)}px` : '100%'

  const canvas = (
    <div style={{ height, width, minWidth: '100%' }}>
      <Bar ref={chartRef} data={data} options={options} plugins={plugins}
           aria-label={ariaLabel} role="img" />
    </div>
  )

  if (!columnPx) return canvas
  return (
    <div ref={scrollRef}
         className="max-w-full overflow-x-auto overscroll-x-contain no-scrollbar -mx-1 px-1">
      {canvas}
    </div>
  )
}

/** Category width, measured from the laid-out bars rather than assumed. */
function columnWidth(meta) {
  if (meta.data.length < 2) return meta.data[0]?.width ?? 1
  return Math.abs(meta.data[1].x - meta.data[0].x)
}
