/**
 * Everything the app remembers between visits: the chosen place, the unit
 * system, the text size, and the last forecast we successfully fetched.
 *
 * The cached forecast is the point of the whole module. During a storm the
 * network is the first thing to go, and an app that shows a spinner at exactly
 * that moment is worse than useless. Every read is wrapped because storage
 * throws outright in a locked-down browser rather than returning null.
 */

// The 'wr.' prefix predates the app's rename and stays put on purpose:
// changing it would silently discard the saved place and settings of anyone
// who already has the app installed.
const KEYS = {
  place: 'wr.place',
  settings: 'wr.settings',
  forecast: 'wr.forecast',
  locale: 'wr.locale',
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Private mode, or the quota is full. The app keeps working; it just
    // forgets. Nothing here is worth interrupting the reader over.
    return false
  }
}

export const loadPlace = () => read(KEYS.place, null)
export const savePlace = (place) => write(KEYS.place, place)

/** The chosen language, remembered across sessions. Stored on its own rather
 *  than inside settings so it can be read before React mounts, without pulling
 *  the rest of the settings shape along with it. */
export const loadLocale = () => read(KEYS.locale, null)
export const saveLocale = (code) => write(KEYS.locale, code)

export const DEFAULT_SETTINGS = { units: 'metric', textScale: 1 }
export function loadSettings() {
  const stored = read(KEYS.settings, {})
  return { ...DEFAULT_SETTINGS, ...stored }
}
export const saveSettings = (settings) => write(KEYS.settings, settings)

/** The cache is keyed by rounded coordinates — a forecast fetched for a point
 *  200 m away is the same forecast, but one for the next valley is not. */
const cacheKey = (lat, lon) => `${lat.toFixed(2)},${lon.toFixed(2)}`

/** How long a cached forecast is considered current enough to show without
 *  going back to the network. Model runs land every few hours, so a quarter of
 *  an hour costs the reader nothing and saves a request on every revisit. */
export const CACHE_FRESH_MS = 15 * 60 * 1000

export function loadCachedForecast(lat, lon) {
  const entry = read(KEYS.forecast, null)
  if (!entry || entry.key !== cacheKey(lat, lon)) return null
  const data = entry.data
  // Shape guard, and it has to name the CURRENT shape. While this still tested
  // for `series` — the key the daily block was called before the four-parameter
  // rewrite — every stored forecast read back as null while the freshness check
  // beside it still said "fresh", so a returning reader inside the cache window
  // got an error page instead of the forecast sitting in their own storage.
  if (!Array.isArray(data?.days) || !data.daily) return null   // an older shape
  // Dates do not survive JSON, so rebuild every one the screens rely on.
  // Missing `hours` here is what blanked the app on the second visit: the
  // hourly card calls toLocaleTimeString on these, and a revived string has
  // no such method, so the whole tree threw on render.
  return {
    ...data,
    days: data.days.map((d) => new Date(d)),
    hours: Array.isArray(data.hours) ? data.hours.map((h) => new Date(h)) : [],
  }
}

/** True when the stored forecast for this point is young enough to reuse as-is.
 *  Read separately from the forecast itself so a caller can decide whether to
 *  refetch without first paying to revive every Date in it. */
export function isCachedForecastFresh(lat, lon, now = Date.now()) {
  const entry = read(KEYS.forecast, null)
  if (!entry || entry.key !== cacheKey(lat, lon)) return false
  // Same shape guard as the loader. These two must agree: "fresh" here and
  // null there is the combination that shows an error over a good forecast.
  if (!Array.isArray(entry.data?.days) || !entry.data.daily) return false
  const at = entry.data?.fetchedAt
  return typeof at === 'number' && now - at < CACHE_FRESH_MS
}

export function saveCachedForecast(lat, lon, data) {
  return write(KEYS.forecast, { key: cacheKey(lat, lon), data })
}
