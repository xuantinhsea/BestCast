import { useCallback, useEffect, useState } from 'react'

/**
 * Chart.js wants numbers and hex strings, not CSS variables, so the tokens have
 * to be read out of the stylesheet and handed over explicitly.
 *
 * Two things invalidate them: the reader switching light/dark, and the
 * text-size control changing the root font size. Every chart dimension is
 * derived from `rootPx` so the charts grow with the rest of the app — a chart
 * that stays 11px while the labels around it grow to 24px is the failure this
 * hook exists to prevent.
 */
const TOKENS = {
  ink: '--color-ink',
  ink2: '--color-ink-2',
  muted: '--color-muted',
  grid: '--color-hairline',
  axis: '--color-line',
  surface: '--color-surface',
  selected: '--color-selected',
  // One solid and one band tint per parameter. The chart is handed the pair by
  // name — `theme.colors[parameter.color]` — so adding a parameter is a token
  // pair and a roster entry, not a change to the chart.
  rain: '--color-rain',
  rainBand: '--color-rain-band',
  prob: '--color-prob',
  probBand: '--color-prob-band',
  temp: '--color-temp',
  tempBand: '--color-temp-band',
  wind: '--color-wind',
  windBand: '--color-wind-band',
}

function readTheme() {
  const styles = getComputedStyle(document.documentElement)
  const out = {
    rootPx: parseFloat(styles.fontSize) || 18,
    // Taken from the stylesheet rather than repeated as a literal in every
    // ctx.font string, so the charts follow a font change with the rest of the
    // app instead of quietly staying on system-ui.
    fontFamily: styles.getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif',
  }
  for (const [key, prop] of Object.entries(TOKENS)) {
    out[key] = styles.getPropertyValue(prop).trim()
  }
  // Grouped by parameter so a chart can ask for its own pair without knowing
  // which token names happen to spell it.
  out.colors = {
    rain: { solid: out.rain, band: out.rainBand },
    prob: { solid: out.prob, band: out.probBand },
    temp: { solid: out.temp, band: out.tempBand },
    wind: { solid: out.wind, band: out.windBand },
  }
  return out
}

export function useChartTheme() {
  const [theme, setTheme] = useState(readTheme)
  const refresh = useCallback(() => setTheme(readTheme()), [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', refresh)

    // The text-size control writes --text-scale onto <html>; watching the style
    // attribute catches it without the settings hook having to know that charts
    // exist at all.
    const observer = new MutationObserver(refresh)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] })

    return () => {
      media.removeEventListener('change', refresh)
      observer.disconnect()
    }
  }, [refresh])

  return theme
}
