/**
 * What the sky is doing, in words a weather app uses.
 *
 * The forecast service describes each hour with a WMO weather code. This
 * module turns a code into three things the screen needs: a translation key
 * for the sentence ("Light rain"), an icon, and a sky — the background colour
 * family the whole screen takes on. No React here, so it runs from Node.
 *
 * When a code is missing (a forecast cached before codes were fetched, or an
 * hour the service left empty) the condition is inferred from the rain figures
 * instead, so the screen degrades to a plainer description rather than a blank.
 */

/** code -> [translation key, icon, sky] */
const WMO = {
  0: ['clear', 'clear', 'clear'],
  1: ['mainlyClear', 'clear', 'clear'],
  2: ['partlyCloudy', 'partly', 'clear'],
  3: ['overcast', 'cloud', 'cloud'],
  45: ['fog', 'fog', 'fog'],
  48: ['rimeFog', 'fog', 'fog'],
  51: ['drizzleLight', 'drizzle', 'rain'],
  53: ['drizzle', 'drizzle', 'rain'],
  55: ['drizzleDense', 'drizzle', 'rain'],
  56: ['freezingDrizzle', 'sleet', 'rain'],
  57: ['freezingDrizzle', 'sleet', 'rain'],
  61: ['rainLight', 'rain', 'rain'],
  63: ['rain', 'rain', 'rain'],
  65: ['rainHeavy', 'heavy', 'rain'],
  66: ['freezingRain', 'sleet', 'rain'],
  67: ['freezingRain', 'sleet', 'rain'],
  71: ['snowLight', 'snow', 'snow'],
  73: ['snow', 'snow', 'snow'],
  75: ['snowHeavy', 'snow', 'snow'],
  77: ['snowGrains', 'snow', 'snow'],
  80: ['showersLight', 'rain', 'rain'],
  81: ['showers', 'rain', 'rain'],
  82: ['showersViolent', 'heavy', 'storm'],
  85: ['snowShowers', 'snow', 'snow'],
  86: ['snowShowers', 'snow', 'snow'],
  95: ['thunderstorm', 'thunder', 'storm'],
  96: ['thunderHail', 'thunder', 'storm'],
  99: ['thunderHail', 'thunder', 'storm'],
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** True for codes that mean snow is falling or forecast. */
export const isSnowCode = (code) => [71, 73, 75, 77, 85, 86].includes(code)

/** A rough condition from rain alone, for when no code is available. */
function fromRain(mm, chance) {
  if (isNum(mm) && mm >= 4) return WMO[65]
  if (isNum(mm) && mm >= 0.5) return WMO[63]
  if (isNum(mm) && mm >= 0.1) return WMO[51]
  if (isNum(chance) && chance >= 60) return WMO[61]
  return null
}

/**
 * @param code    WMO weather code, or null
 * @param isDay   whether the sun is up (affects icon and sky only)
 * @param rain    { mm, chance } used only when the code is missing
 * @returns {{ key: string|null, icon: string, sky: string }}
 *   key is null when nothing at all is known — the screen then shows no
 *   sentence rather than inventing one.
 */
export function describe(code, isDay = true, rain = {}) {
  const hit = WMO[code] ?? fromRain(rain.mm, rain.chance)
  if (!hit) return { key: null, icon: isDay ? 'partly' : 'partly-night', sky: isDay ? 'cloud-day' : 'night' }
  const [key, icon, sky] = hit
  // A clear sky is "sunny" while the sun is up and "clear" after dark, as
  // every phone weather app words it.
  const dayKey = { clear: 'sunny', mainlyClear: 'mostlySunny' }
  return {
    key: isDay ? (dayKey[key] ?? key) : key,
    icon: !isDay && (icon === 'clear' || icon === 'partly') ? `${icon}-night` : icon,
    sky: isDay ? `${sky}-day` : (sky === 'clear' ? 'night' : `${sky === 'storm' ? 'storm' : 'cloud'}-night`),
  }
}

/**
 * The sky palettes: top and bottom of the background gradient.
 *
 * Every pair keeps white body text at or above 4.5:1 against both ends, so the
 * hero and the translucent cards stay readable in full sun. The top colour
 * also becomes the browser's theme colour, so the status bar matches.
 */
export const SKIES = {
  'clear-day': ['#1b5fae', '#2a72c2'],
  'cloud-day': ['#3d5a78', '#55708c'],
  'rain-day': ['#34495e', '#4d6276'],
  'storm-day': ['#2a3442', '#424e5e'],
  'snow-day': ['#3f5d7c', '#58728d'],
  'fog-day': ['#4f5c6a', '#65717e'],
  night: ['#0a1630', '#1c2f57'],
  'cloud-night': ['#151d2b', '#2b3647'],
  'storm-night': ['#10141c', '#262c38'],
}

export const skyColors = (sky) => SKIES[sky] ?? SKIES['cloud-day']

/** UV index bands, as published by the WHO. */
export function uvLevel(uv) {
  if (!isNum(uv)) return null
  if (uv < 3) return 'low'
  if (uv < 6) return 'moderate'
  if (uv < 8) return 'high'
  if (uv < 11) return 'veryHigh'
  return 'extreme'
}

/** Eight compass points, as translation keys. Degrees are where the wind
 *  comes FROM, which is how every forecast and every weather app reports it. */
const POINTS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
export function compassPoint(degrees) {
  if (!isNum(degrees)) return null
  return POINTS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]
}

/**
 * The colour a temperature is drawn in on the daily range bars: blue through
 * green and amber to red. Celsius in, CSS colour out.
 */
const TEMP_STOPS = [
  [-10, [96, 165, 250]],
  [5, [56, 189, 248]],
  [15, [74, 222, 128]],
  [22, [250, 204, 21]],
  [28, [251, 146, 60]],
  [35, [239, 68, 68]],
]
export function tempColor(celsius) {
  if (!isNum(celsius)) return 'rgb(255,255,255)'
  if (celsius <= TEMP_STOPS[0][0]) return `rgb(${TEMP_STOPS[0][1].join(',')})`
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const [t1, c1] = TEMP_STOPS[i]
    if (celsius <= t1) {
      const [t0, c0] = TEMP_STOPS[i - 1]
      const f = (celsius - t0) / (t1 - t0)
      return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * f)).join(',')})`
    }
  }
  return `rgb(${TEMP_STOPS[TEMP_STOPS.length - 1][1].join(',')})`
}

/**
 * The one-sentence outlook for the next twelve hours — the line a weather
 * app puts above its hourly strip.
 *
 * An hour counts as wet when the most likely figure reaches 0.3 mm or the
 * chance reaches 60 %. Returns a kind and, where it applies, the index of the
 * hour the change happens, so the screen can print that hour in the reader's
 * own clock format. "snow" replaces "rain" when the wet hours are snow.
 */
export function precipitationOutlook({ mm = [], chance = [], codes = null, start, span = 12, nowWet = false }) {
  if (start == null || start < 0 || start >= mm.length) return null
  const end = Math.min(mm.length, start + span + 1)
  const wet = (i) => (isNum(mm[i]) && mm[i] >= 0.3) || (isNum(chance[i]) && chance[i] >= 60)
  const snowy = (from, to) => {
    if (!codes) return false
    for (let i = from; i < to; i++) if (wet(i) && isSnowCode(codes[i])) return true
    return false
  }

  if (wet(start) || nowWet) {
    for (let i = start + 1; i < end; i++) {
      if (!wet(i)) return { kind: 'nowEasing', at: i, snow: snowy(start, i) }
    }
    return { kind: 'nowContinuing', at: null, snow: snowy(start, end) }
  }
  for (let i = start + 1; i < end; i++) {
    if (wet(i)) return { kind: 'later', at: i, snow: snowy(i, i + 1) }
  }
  return { kind: 'dry', at: null, snow: false }
}
