import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LOCALE, LOCALES, detectLocale, localeByCode } from './locales'
import { MESSAGES } from './messages'
import { I18nContext } from './context'
import { loadLocale, saveLocale } from '../core/storage'

/**
 * Language, and everything that follows from it.
 *
 * Formatting is not a separate concern from translation. A reader who switches
 * to Japanese and still sees "14 Sep" has been given a half-translated app, so
 * the dates, the clock and the numerals all move with the words — which is why
 * the Intl formatters are built here, beside the dictionary, rather than being
 * imported loose wherever a date happens to need printing.
 *
 * The formatters are memoised per locale because constructing an Intl object is
 * genuinely expensive, and the hourly chart formats seventy-two of them.
 */
/** Walks a dotted key through the nested dictionary. */
function lookup(tree, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), tree)
}

/** Substitutes {name} placeholders. An unknown name is left visible rather than
 *  replaced with "undefined" — a missing value should look like a bug to us,
 *  not like a sentence to the reader. */
function fill(template, vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole)
}

function buildFormatters(tag) {
  const dtf = (opts) => new Intl.DateTimeFormat(tag, opts)

  const full = dtf({ year: 'numeric', month: 'short', day: 'numeric' })
  const dayMonth = dtf({ month: 'short', day: 'numeric' })
  const weekdayLong = dtf({ weekday: 'long' })
  const weekdayShort = dtf({ weekday: 'short' })
  // Narrow, for the daily axis: "Thứ 2" is five characters and fourteen of them
  // collide on a phone. The day number sits directly underneath, so a run of
  // M T W T F S S is read as a calendar week rather than as seven riddles.
  const weekdayNarrow = dtf({ weekday: 'narrow' })
  // A bare numeral, NOT dtf({day:'numeric'}): Japanese formats a day of the
  // month as "7日", and fourteen of those collide under the weekday row. The
  // column already sits under a weekday name, so the suffix carries nothing.
  const dayNum = new Intl.NumberFormat(tag, { useGrouping: false })
  const hour = dtf({ hour: '2-digit', minute: '2-digit' })
  // A zero-padded hour, not dtf({hour:'numeric'}): Vietnamese renders that as
  // "00 giờ" and Japanese as "0時", and at seventy-two columns the unit word
  // costs more width than it earns. English already formats it exactly this
  // way, and the card heading and day dividers say these are hours.
  const hourOnly = new Intl.NumberFormat(tag, { minimumIntegerDigits: 2, useGrouping: false })
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })

  return {
    /** "14 Sep 2026" · "2026年9月14日" · "14 thg 9, 2026" */
    date: (d) => full.format(d),
    dayMonth: (d) => dayMonth.format(d),
    weekdayLong: (d) => weekdayLong.format(d),
    weekdayShort: (d) => weekdayShort.format(d),
    /** Two-line axis tick. Chart.js renders an array as stacked lines, which
     *  keeps fourteen day labels legible on a phone without rotating them. */
    dayTick: (d) => [weekdayNarrow.format(d), dayNum.format(d.getDate())],
    hour: (d) => hour.format(d),
    hourTick: (d) => hourOnly.format(d.getHours()),
    /** Long form for a tooltip title: "Sunday, 14 September". */
    dayFull: (d) => dtf({ weekday: 'long', day: 'numeric', month: 'long' }).format(d),
    hourFull: (d) => dtf({ weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(d),
    number: (n, opts) => new Intl.NumberFormat(tag, opts).format(n),
    relative: (value, unit) => rtf.format(value, unit),
  }
}

export function I18nProvider({ children }) {
  // A stored choice always wins over the browser's: someone who has switched
  // the app to Vietnamese on a Japanese phone meant it.
  const [locale, setLocaleState] = useState(() => {
    const stored = loadLocale()
    if (stored && MESSAGES[stored]) return stored
    return detectLocale()
  })

  const meta = localeByCode(locale)

  // Assistive technology reads the page in whatever `lang` claims it is; left
  // at "en" a Japanese screen reader pronounces 気温 through an English voice.
  useEffect(() => {
    document.documentElement.lang = meta.code
  }, [meta.code])

  const setLocale = useCallback((code) => {
    if (!MESSAGES[code]) return
    setLocaleState(code)
    saveLocale(code)
  }, [])

  const fmt = useMemo(() => buildFormatters(meta.tag), [meta.tag])

  const t = useCallback((key, vars) => {
    const hit = lookup(MESSAGES[meta.code], key) ?? lookup(MESSAGES[DEFAULT_LOCALE], key)
    if (typeof hit !== 'string') return key   // visible, and greppable
    return fill(hit, vars)
  }, [meta.code])

  /**
   * "Updated 5 minutes ago", in the reader's language and word order.
   *
   * RelativeTimeFormat supplies the "5 minutes ago" half; the template around
   * it comes from the dictionary, because the verb does not sit in the same
   * place in all three languages.
   */
  const timeAgo = useCallback((timestamp, now = Date.now()) => {
    if (!timestamp) return null
    const mins = Math.round((now - timestamp) / 60000)
    if (mins < 1) return t('time.justNow')
    if (mins < 60) return t('time.updated', { rel: fmt.relative(-mins, 'minute') })
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return t('time.updated', { rel: fmt.relative(-hrs, 'hour') })
    return t('time.updated', { rel: fmt.relative(-Math.round(hrs / 24), 'day') })
  }, [t, fmt])

  /** "Today" / "Tomorrow" / the weekday — never a bare date, which makes the
   *  reader do arithmetic to find out whether a day is soon. */
  const dayLabel = useCallback((date, today = new Date()) => {
    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
    const diff = Math.round((startOf(new Date(date)) - startOf(today)) / 86400000)
    if (diff === 0) return t('chart.today')
    if (diff === 1) return t('chart.tomorrow')
    return fmt.weekdayLong(new Date(date))
  }, [t, fmt])

  const value = useMemo(
    () => ({ locale: meta.code, localeMeta: meta, locales: LOCALES, setLocale, t, fmt, timeAgo, dayLabel }),
    [meta, setLocale, t, fmt, timeAgo, dayLabel],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
