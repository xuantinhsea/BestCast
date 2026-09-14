/**
 * Unit handling.
 *
 * The whole app speaks one of two systems, chosen once and remembered. There is
 * no per-variable unit picker: a reader who has to remember that temperature is
 * in Celsius but rain is in inches has already been failed by the interface.
 *
 * Data is always FETCHED in metric and converted here at display time. That
 * keeps every threshold in `plainLanguage.js` written once, in millimetres and
 * degrees Celsius, instead of being duplicated and drifting per system.
 */

export const SYSTEMS = {
  metric: {
    id: 'metric',
    label: 'Celsius and millimetres',
    short: '°C · mm',
    tempSymbol: '°C',
    rainSymbol: 'mm',
    windSymbol: 'km/h',
  },
  imperial: {
    id: 'imperial',
    label: 'Fahrenheit and inches',
    short: '°F · in',
    tempSymbol: '°F',
    rainSymbol: 'in',
    windSymbol: 'mph',
  },
}

export function getSystem(id) {
  return SYSTEMS[id] ?? SYSTEMS.metric
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** Celsius -> the active system's temperature unit. */
export function toTemp(celsius, system) {
  if (!isNum(celsius)) return null
  return system.id === 'imperial' ? celsius * 9 / 5 + 32 : celsius
}

/** Millimetres -> the active system's depth unit. */
export function toRain(mm, system) {
  if (!isNum(mm)) return null
  return system.id === 'imperial' ? mm / 25.4 : mm
}

/** km/h -> the active system's speed unit. */
export function toWind(kmh, system) {
  if (!isNum(kmh)) return null
  return system.id === 'imperial' ? kmh / 1.609344 : kmh
}

/** Temperatures are always whole numbers — a tenth of a degree is noise here. */
export function formatTemp(celsius, system) {
  const v = toTemp(celsius, system)
  return v == null ? '—' : Math.round(v).toString()
}

/** Rain depths in inches need decimals that millimetres do not. */
export function formatRain(mm, system) {
  const v = toRain(mm, system)
  if (v == null) return '—'
  if (v === 0) return '0'
  if (system.id === 'imperial') return v < 0.1 ? v.toFixed(2) : v.toFixed(1)
  return v < 1 ? v.toFixed(1) : Math.round(v).toString()
}

export function formatWind(kmh, system) {
  const v = toWind(kmh, system)
  return v == null ? '—' : Math.round(v).toString()
}

/**
 * The same three conversions, reached by the name a parameter carries.
 *
 * Charts have to plot CONVERTED numbers — an axis labelled °F with Celsius
 * values on it is worse than no unit at all — so every series passes through
 * here on its way to the canvas, and the axis, the bar labels and the table all
 * read from the same converted array.
 *
 * Percentages are deliberately identity: a chance of rain is the one quantity
 * here that does not belong to either system.
 */
const CONVERT = {
  temp: toTemp,
  rain: toRain,
  wind: toWind,
  percent: (v) => (isNum(v) ? v : null),
}

export function convert(value, unit, system) {
  return (CONVERT[unit] ?? CONVERT.percent)(value, system)
}

/** Converts a whole series, preserving the nulls that mean "no reading". */
export function convertAll(values, unit, system) {
  return (values ?? []).map((v) => convert(v, unit, system))
}

export function unitSymbol(unit, system) {
  switch (unit) {
    case 'temp': return system.tempSymbol
    case 'rain': return system.rainSymbol
    case 'wind': return system.windSymbol
    default: return '%'
  }
}

/**
 * Prints an ALREADY-CONVERTED number for a chart label or a table cell.
 *
 * Kept separate from the format* helpers above, which take raw metric and
 * convert on the way. Charts convert once for the whole series and would
 * otherwise be converting twice — turning 25°C into 77°F and then into 171°F.
 */
export function formatConverted(value, unit, system, { locale } = {}) {
  if (!isNum(value)) return '—'
  let digits = 0
  if (unit === 'rain') {
    if (system.id === 'imperial') digits = value < 0.1 ? 2 : 1
    else if (value > 0 && value < 1) digits = 1
  }
  const n = new Intl.NumberFormat(locale ?? undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
  return n
}
