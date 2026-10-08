/**
 * Asking several independent weather services the same question at once, and
 * turning their disagreement into one readable number plus an honest range.
 *
 * Nothing here averages the disagreement away. The reader is shown the most
 * likely value AND how far the services differ about it, because a forecast
 * presented as a single confident number is the one thing that gets someone
 * caught out. What the reader is never shown is WHOSE forecast any of it is:
 * service names, ids and reaches stay inside this module.
 */
import { MODELS, MODEL_IDS, BEST_MATCH } from './models.js'

const URL = 'https://api.open-meteo.com/v1/forecast'

/**
 * An error the interface can say out loud.
 *
 * The message stays in English for the console and for any logging; `key`
 * is what the screen renders, so the reader is told what went wrong in their
 * own language. A module this far from the UI has no business holding a
 * sentence anyone is meant to read.
 */
function reportable(key, message) {
  const err = new Error(message)
  err.key = key
  return err
}

/** A week behind for context, a week ahead for planning. */
export const PAST_DAYS = 7
export const FUTURE_DAYS = 7
/** The hourly view, hour by hour. Matched to the forecast half of the daily
 *  chart so the two tell the same story at different resolutions. Sixteen
 *  services over four variables for this span is about 42 KB. */
export const HOURLY_DAYS = 7

/**
 * The four things the app shows, and nothing else.
 *
 * `messageKey` points into the translation dictionary rather than carrying an
 * English label, so a parameter cannot be rendered untranslated by accident.
 * `unit` names a formatter in units.js, which converts and prints it.
 */
export const PARAMETERS = [
  {
    id: 'precipitation',
    messageKey: 'precipitation',
    kind: 'rain',
    unit: 'rain',
    color: 'rain',
    daily: 'precipitation_sum',
    hourly: 'precipitation',
  },
  {
    id: 'precipitationProbability',
    messageKey: 'precipitationProbability',
    kind: 'percent',
    unit: 'percent',
    color: 'prob',
    daily: 'precipitation_probability_max',
    hourly: 'precipitation_probability',
  },
  {
    id: 'temperature',
    messageKey: 'temperature',
    kind: 'temp',
    unit: 'temp',
    color: 'temp',
    daily: 'temperature_2m_max',
    // Daily temperature is the one parameter with two ends worth drawing: the
    // bar spans the overnight low to the daytime high rather than rising from
    // an arbitrary baseline, so its height means something.
    dailyLow: 'temperature_2m_min',
    hourly: 'temperature_2m',
  },
  {
    id: 'wind',
    messageKey: 'wind',
    kind: 'wind',
    unit: 'wind',
    color: 'wind',
    daily: 'wind_speed_10m_max',
    hourly: 'wind_speed_10m',
  },
]

export const parameterById = (id) => PARAMETERS.find((p) => p.id === id) ?? PARAMETERS[0]

const DAILY_VARS = [...new Set(PARAMETERS.flatMap((p) => [p.daily, p.dailyLow].filter(Boolean)))]
const HOURLY_VARS = [...new Set(PARAMETERS.map((p) => p.hourly))]

/**
 * What the phone screen needs beyond the four reconciled parameters: the kind
 * of weather, how it feels, and the sky.
 *
 * These ride along on the two blended requests that are made anyway, rather
 * than being asked of all sixteen services — a weather code or a UV index is a
 * description, not a figure whose disagreement the reader needs to see, and
 * asking sixteen services for ten more variables would multiply the payload
 * for nothing. So they cost no extra request.
 */
const DETAIL_DAILY_VARS = ['weather_code', 'sunrise', 'sunset', 'uv_index_max']
const DETAIL_HOURLY_VARS = [
  'weather_code', 'is_day', 'apparent_temperature', 'relative_humidity_2m', 'dew_point_2m',
  'uv_index', 'visibility', 'pressure_msl', 'wind_direction_10m', 'wind_gusts_10m',
]
const CURRENT_VARS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'is_day', 'weather_code',
  'precipitation', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'pressure_msl',
]

/**
 * Open-Meteo can answer 200 with a body containing bare `nan` tokens, which is
 * not valid JSON — it happens for regional services asked about a point outside
 * their domain. res.json() throws on it, so the body is parsed by hand and a
 * failure is reported as "this service has nothing here" rather than a crash.
 */
async function getJson(params, signal) {
  let res
  try {
    res = await fetch(`${URL}?${params}`, { signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw reportable('errors.offline', 'No internet connection.')
  }
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch { /* handled below */ }

  if (!res.ok) throw reportable('errors.service', body?.reason || `The weather service returned error ${res.status}.`)
  if (!body) throw reportable('errors.unreadable', 'The weather service sent a reply we could not read.')

  // The Date header is attached here rather than read at the call site because
  // offline the service worker replays a stored response: the request succeeds,
  // and Date.now() would report a day-old forecast as "just now". The header
  // travels with the cached copy and is CORS-safelisted, so it stays readable.
  const stamped = Date.parse(res.headers.get('date') ?? '')
  body.__receivedAt = Number.isNaN(stamped) ? Date.now() : stamped
  return body
}

/**
 * Four requests, run together.
 *
 * The blended "most likely" forecast cannot ride along with the individual
 * services — passing it alongside them makes the API reject the entire call —
 * so it is always its own request. Daily and hourly are separate calls because
 * they want different spans.
 */
export async function fetchEnsemble({ lat, lon, signal }) {
  const dailyParams = () => ({
    latitude: String(lat), longitude: String(lon), timezone: 'auto',
    past_days: String(PAST_DAYS), forecast_days: String(FUTURE_DAYS),
    daily: DAILY_VARS.join(','),
  })
  const hourlyParams = () => ({
    latitude: String(lat), longitude: String(lon), timezone: 'auto',
    forecast_days: String(HOURLY_DAYS), hourly: HOURLY_VARS.join(','),
  })

  const [batch, best, hourlyBatch, hourlyBest] = await Promise.all([
    getJson(new URLSearchParams({ ...dailyParams(), models: MODEL_IDS.join(',') }), signal),
    getJson(new URLSearchParams({
      ...dailyParams(), models: BEST_MATCH,
      daily: [...DAILY_VARS, ...DETAIL_DAILY_VARS].join(','),
    }), signal).catch(() => null),
    // The hourly pair is best-effort: the daily view is the backbone of the
    // page, and a failure here must not take it down with it.
    getJson(new URLSearchParams({ ...hourlyParams(), models: MODEL_IDS.join(',') }), signal).catch(() => null),
    getJson(new URLSearchParams({
      ...hourlyParams(), models: BEST_MATCH,
      hourly: [...HOURLY_VARS, ...DETAIL_HOURLY_VARS].join(','),
      current: CURRENT_VARS.join(','),
    }), signal).catch(() => null),
  ])

  const days = batch?.daily?.time ?? []
  if (!days.length) throw reportable('states.noData', 'No forecast is available for this place.')

  // Which services are really the same service here is decided once, from one
  // signature variable, and applied to every variable — see duplicateGroups.
  const dailyGroups = duplicateGroups(batch, 'daily', 'temperature_2m_max')

  return {
    fetchedAt: batch?.__receivedAt ?? Date.now(),
    latitude: batch.latitude,
    longitude: batch.longitude,
    timezone: batch.timezone,
    // Carried so the "today" and "now" marks can be placed in the timezone the
    // series is actually in. Looking at Tokyo from Hanoi, the browser's clock
    // is the wrong clock: every label on these axes is Tokyo local time.
    utcOffsetSeconds: batch.utc_offset_seconds ?? null,
    days: days.map(localDate),
    dayKeys: days,
    daily: Object.fromEntries(DAILY_VARS.map((v) => [
      v, buildSeries(batch, best, v, days.length, 'daily', dailyGroups),
    ])),
    ...buildHourly(hourlyBatch, hourlyBest),
    details: buildDetails(days, best, hourlyBatch, hourlyBest),
  }
}

/** A week of hours, in the same shape as the daily series so one chart
 *  component can render both. If the sixteen-service request failed but the
 *  blended one answered, the blended hours still make a usable strip. */
function buildHourly(batch, best) {
  const times = batch?.hourly?.time ?? best?.hourly?.time ?? []
  if (!times.length) return { hours: [], hourlyKeys: [], hourly: null }
  const groups = duplicateGroups(batch, 'hourly', 'temperature_2m')
  return {
    hours: times.map((t) => new Date(t)),
    hourlyKeys: times,
    hourly: Object.fromEntries(HOURLY_VARS.map((v) => [
      v, buildSeries(batch, best, v, times.length, 'hourly', groups),
    ])),
  }
}

/**
 * The descriptive extras, lined up with the series they belong to.
 *
 * Each block is re-indexed by its own time keys rather than assumed to share
 * the main series' order, so a reply that starts an hour later or ends a day
 * early leaves gaps instead of shifting every icon onto the wrong hour.
 * Every part may be missing — a forecast cached before these existed has none
 * of them, and the screen falls back to what the four parameters can say.
 */
function buildDetails(dayKeys, best, hourlyBatch, hourlyBest) {
  const hourKeys = hourlyBatch?.hourly?.time ?? hourlyBest?.hourly?.time ?? []
  const current = hourlyBest?.current
  return {
    current: current && typeof current === 'object'
      ? Object.fromEntries(['time', ...CURRENT_VARS].map((v) => [v, current[v] ?? null]))
      : null,
    daily: alignBlock(best?.daily, dayKeys, DETAIL_DAILY_VARS),
    hourly: alignBlock(hourlyBest?.hourly, hourKeys, DETAIL_HOURLY_VARS),
  }
}

function alignBlock(block, keys, vars) {
  if (!block?.time?.length || !keys.length) return null
  const at = new Map(block.time.map((k, i) => [k, i]))
  const out = {}
  for (const v of vars) {
    const values = block[v]
    out[v] = keys.map((k) => {
      const i = at.get(k)
      return i == null || !Array.isArray(values) ? null : values[i] ?? null
    })
  }
  return out
}

function localDate(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Which services are actually the same service here.
 *
 * Duplication is a property of the pair at this location — outside its region a
 * regional service falls back to a global one, and several fall back to the
 * SAME one — so it is decided once and applied to every variable.
 *
 * Deciding it per-variable was wrong in a way that mattered: over a single day
 * several services forecast zero rain for all 24 hours, producing identical
 * precipitation series. Those services genuinely and independently agree that
 * it will not rain, and collapsing them understated the agreement. Temperature
 * is the signature because it is continuous and effectively never identical
 * between two genuinely different services.
 */
function duplicateGroups(batch, block, signatureVar) {
  const bySignature = new Map()
  for (const model of MODELS) {
    const values = batch?.[block]?.[`${signatureVar}_${model.id}`]
    if (!Array.isArray(values) || !values.some((v) => v != null)) continue
    const key = values.map((v) => (v == null ? '' : v)).join('|')
    if (bySignature.has(key)) bySignature.get(key).push(model.id)
    else bySignature.set(key, [model.id])
  }
  const groupOf = new Map()
  for (const ids of bySignature.values()) {
    for (const id of ids) groupOf.set(id, ids)
  }
  return groupOf
}

/**
 * Collects each service's series for one variable, drops the ones that returned
 * nothing, folds together the ones the signature says are the same, and reduces
 * the survivors to a distribution.
 *
 * Only the count and the distribution leave this function. The per-service
 * values are deliberately not carried out: counting a regional fallback as a
 * separate opinion would manufacture confidence that does not exist, and
 * carrying the names out would make it possible to render one.
 */
function buildSeries(batch, best, variable, count, block, groupOf) {
  const has = (id) => {
    const v = batch?.[block]?.[`${variable}_${id}`]
    return Array.isArray(v) && v.some((x) => x != null)
  }

  const members = []
  const claimed = new Set()
  for (const model of MODELS) {
    if (claimed.has(model.id) || !has(model.id)) continue
    for (const id of (groupOf.get(model.id) ?? [model.id]).filter(has)) claimed.add(id)
    members.push(batch[block][`${variable}_${model.id}`])
  }

  const bestValues = best?.[block]?.[variable] ?? null
  const stats = computeStats(members, count)

  return {
    variable,
    sources: members.length,
    // The blended pick when there is one; otherwise the middle of the pack,
    // which is the same promise to the reader made from what we have.
    likely: Array.isArray(bestValues) && bestValues.some((v) => v != null)
      ? bestValues
      : stats.map((s) => s.median),
    stats,
  }
}

/**
 * Per-point distribution across the surviving services.
 *
 * The band is the full min-max, because with a dozen members the extremes are
 * the decision-relevant part — "it could be 90 mm" is the sentence that
 * matters, and a percentile band is designed to hide it.
 */
function computeStats(members, count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const values = members.map((m) => m[i]).filter((v) => v != null && !Number.isNaN(v))
    if (!values.length) {
      out.push({ count: 0, min: null, max: null, median: null, spread: null })
      continue
    }
    const sorted = [...values].sort((a, b) => a - b)
    out.push({
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: quantile(sorted, 0.5),
      spread: sorted[sorted.length - 1] - sorted[0],
    })
  }
  return out
}

/** Linear-interpolated quantile of an already-sorted array. */
function quantile(sorted, p) {
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * "Now", as the clock reads at the place being forecast.
 *
 * Every timestamp the API returns is local to that place and carries no zone,
 * so the marks have to be placed on the same clock. Using the browser's instead
 * put the "now" rule a day into the future when a reader in Asia looked at a
 * point in the Pacific — the axis said 14:00 and the rule stood at hour 38.
 * Falling back to the browser clock is only for a revived cache written before
 * the offset was stored.
 *
 * `nowMs` lets a caller pass the clock it already holds (useNow), so the marks
 * move on as the minutes tick rather than staying where they were at fetch time.
 */
function placeNow(utcOffsetSeconds, nowMs = Date.now()) {
  if (utcOffsetSeconds == null) {
    const n = new Date(nowMs)
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), h: n.getHours() }
  }
  const shifted = new Date(nowMs + utcOffsetSeconds * 1000)
  return {
    y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(), h: shifted.getUTCHours(),
  }
}

/** The index of today within the daily series — the past/future divider. */
export function todayIndex(dayKeys, utcOffsetSeconds = null, nowMs = undefined) {
  if (!dayKeys?.length) return 0
  const { y, m, d } = placeNow(utcOffsetSeconds, nowMs)
  const exact = dayKeys.indexOf(`${y}-${pad(m)}-${pad(d)}`)
  // The fallback is not a guess: past_days is what we asked for, so index
  // PAST_DAYS is today by construction whenever the lookup cannot confirm it.
  return exact >= 0 ? exact : Math.min(PAST_DAYS, dayKeys.length - 1)
}

/** Index of the hour we are currently inside, for the "now" rule on the hourly
 *  chart. Returns -1 when that hour is not in the series. */
export function nowIndex(hourKeys, utcOffsetSeconds = null, nowMs = undefined) {
  if (!hourKeys?.length) return -1
  const { y, m, d, h } = placeNow(utcOffsetSeconds, nowMs)
  return hourKeys.indexOf(`${y}-${pad(m)}-${pad(d)}T${pad(h)}:00`)
}

/**
 * A y-axis ceiling that survives outliers.
 *
 * Daily rainfall is violently skewed: at Hanoi in September one service can
 * forecast 330 mm for a single day while the rest sit under 10 mm. Scaling the
 * axis to that peak squashes the readable week into the bottom tenth of the
 * chart — the outlier destroys the very comparison the chart exists for.
 *
 * Clipping it away would be worse. "It could be 330 mm" is the single most
 * important sentence this app can say to someone with equipment in a
 * floodplain. So the axis is set from a high percentile instead of the maximum,
 * and the columns that overshoot are marked WITH their value, so the outlier is
 * stated rather than either hidden or allowed to flatten everything else.
 */
export function robustCeiling(stats, { percentile = 0.85, headroom = 1.2, floor = 10 } = {}) {
  const tops = stats.map((s) => s.max).filter((v) => v != null).sort((a, b) => a - b)
  if (!tops.length) return floor
  const p = tops[Math.min(tops.length - 1, Math.floor((tops.length - 1) * percentile))]
  const medians = stats.map((s) => s.median).filter((v) => v != null)
  const medianTop = medians.length ? Math.max(...medians) : 0
  return Math.max(p * headroom, medianTop * 1.15, floor)
}
