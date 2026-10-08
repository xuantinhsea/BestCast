/**
 * The forecast, arranged the way a phone weather app reads it.
 *
 * One pure function from the fetched data to everything the main screen
 * shows: the conditions now, the next 24 hours, the coming week and the
 * detail tiles. Units are NOT applied here — values stay in Celsius,
 * millimetres, km/h, hPa and metres, and the components format them in the
 * reader's system — so this runs from Node against a saved reply.
 *
 * Every number the four reconciled parameters provide comes from their
 * "most likely" series, the same one the detailed charts draw, so the big
 * temperature at the top and the charts further down never disagree.
 */
import { describe, precipitationOutlook } from './conditions.js'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const at = (arr, i) => (Array.isArray(arr) && i >= 0 && i < arr.length ? arr[i] ?? null : null)

/** "2026-10-08T05:58" is a time at the forecast place; parsed as local time it
 *  prints the same clock reading the place sees, like every other time here. */
const parseLocal = (s) => (typeof s === 'string' ? new Date(s) : null)

/** The wall-clock time at the forecast place, as a local Date that prints the
 *  place's reading — the same convention as every parsed timestamp here. */
function placeClock(nowMs, offsetSeconds) {
  const s = new Date(nowMs + offsetSeconds * 1000)
  return new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), s.getUTCHours(), s.getUTCMinutes())
}

export function buildView(data, { nowIdx, todayIdx, nowMs = null }) {
  if (!data?.daily) return null
  const details = data.details ?? {}
  const cur = details.current ?? null
  const dh = details.hourly ?? null
  const dd = details.daily ?? null

  const hourly = data.hourly ?? {}
  const tempH = hourly.temperature_2m?.likely ?? []
  const rainH = hourly.precipitation?.likely ?? []
  const chanceH = hourly.precipitation_probability?.likely ?? []
  const windH = hourly.wind_speed_10m?.likely ?? []

  const daily = data.daily
  const highD = daily.temperature_2m_max?.likely ?? []
  const lowD = daily.temperature_2m_min?.likely ?? []
  const rainD = daily.precipitation_sum?.likely ?? []
  const chanceD = daily.precipitation_probability_max?.likely ?? []
  const windD = daily.wind_speed_10m_max?.likely ?? []

  const hasNow = nowIdx != null && nowIdx >= 0
  const pick = (curKey, arr) => (isNum(cur?.[curKey]) ? cur[curKey] : hasNow ? at(arr, nowIdx) : null)

  // --- now --------------------------------------------------------------------
  const sunrise = parseLocal(at(dd?.sunrise, todayIdx))
  const sunset = parseLocal(at(dd?.sunset, todayIdx))
  const isDayNow = cur?.is_day != null ? cur.is_day === 1
    : hasNow && at(dh?.is_day, nowIdx) != null ? at(dh.is_day, nowIdx) === 1
      : true
  const codeNow = cur?.weather_code ?? (hasNow ? at(dh?.weather_code, nowIdx) : null)
  const condition = describe(codeNow, isDayNow, {
    mm: hasNow ? at(rainH, nowIdx) : null,
    chance: hasNow ? at(chanceH, nowIdx) : null,
  })

  const now = {
    temp: pick('temperature_2m', tempH),
    feelsLike: pick('apparent_temperature', dh?.apparent_temperature),
    humidity: pick('relative_humidity_2m', dh?.relative_humidity_2m),
    wind: pick('wind_speed_10m', windH),
    windDir: pick('wind_direction_10m', dh?.wind_direction_10m),
    gusts: pick('wind_gusts_10m', dh?.wind_gusts_10m),
    pressure: pick('pressure_msl', dh?.pressure_msl),
    dewPoint: hasNow ? at(dh?.dew_point_2m, nowIdx) : null,
    uv: hasNow ? at(dh?.uv_index, nowIdx) : null,
    visibility: hasNow ? at(dh?.visibility, nowIdx) : null,
    isDay: isDayNow,
    condition,
    high: at(highD, todayIdx),
    low: at(lowD, todayIdx),
  }

  // --- next 24 hours ------------------------------------------------------------
  const hours = []
  if (hasNow) {
    const end = Math.min(data.hours.length, nowIdx + 24)
    for (let i = nowIdx; i < end; i++) {
      const isDay = at(dh?.is_day, i) == null ? true : at(dh.is_day, i) === 1
      hours.push({
        kind: 'hour',
        index: i,
        time: data.hours[i],
        isNow: i === nowIdx,
        temp: i === nowIdx && isNum(now.temp) ? now.temp : at(tempH, i),
        chance: at(chanceH, i),
        condition: i === nowIdx ? condition : describe(at(dh?.weather_code, i), isDay, {
          mm: at(rainH, i), chance: at(chanceH, i),
        }),
      })
    }
    // Sunrise and sunset are slotted in among the hours, the way phone weather
    // apps do it, so the strip shows where the light changes. Only the ones
    // that fall inside the 24 hours shown.
    const first = hours[0]?.time
    const last = hours.length ? new Date(hours[hours.length - 1].time.getTime() + 3600000) : null
    const events = []
    for (const d of [todayIdx, todayIdx + 1]) {
      for (const [kind, list] of [['sunrise', dd?.sunrise], ['sunset', dd?.sunset]]) {
        const t = parseLocal(at(list, d))
        if (t && first && t > first && t < last) events.push({ kind, time: t })
      }
    }
    for (const e of events.sort((a, b) => b.time - a.time)) {
      const slot = hours.findIndex((h) => h.kind === 'hour' && h.time > e.time)
      hours.splice(slot < 0 ? hours.length : slot, 0, e)
    }
  }

  // --- the outlook line ----------------------------------------------------------
  const outlook = hasNow ? precipitationOutlook({
    mm: rainH, chance: chanceH, codes: dh?.weather_code ?? null, start: nowIdx,
    nowWet: isNum(cur?.precipitation) && cur.precipitation >= 0.1,
  }) : null
  const outlookAt = outlook?.at != null ? data.hours[outlook.at] : null

  // --- the week -------------------------------------------------------------------
  const days = []
  const from = Math.max(0, todayIdx)
  for (let i = from; i < data.days.length; i++) {
    const code = at(dd?.weather_code, i)
    days.push({
      index: i,
      date: data.days[i],
      isToday: i === todayIdx,
      high: at(highD, i),
      low: at(lowD, i),
      // The full spread across services: the coldest low any of them gives
      // and the warmest high. Drawn faintly behind the most likely range.
      spreadLow: daily.temperature_2m_min?.stats?.[i]?.min ?? null,
      spreadHigh: daily.temperature_2m_max?.stats?.[i]?.max ?? null,
      rain: at(rainD, i),
      chance: at(chanceD, i),
      wind: at(windD, i),
      uvMax: at(dd?.uv_index_max, i),
      sunrise: parseLocal(at(dd?.sunrise, i)),
      sunset: parseLocal(at(dd?.sunset, i)),
      condition: describe(code, true, { mm: at(rainD, i) == null ? null : at(rainD, i) / 6, chance: at(chanceD, i) }),
    })
  }
  const temps = days.flatMap((d) => [d.low, d.high, d.spreadLow, d.spreadHigh]).filter(isNum)
  const weekRange = temps.length ? [Math.min(...temps), Math.max(...temps)] : null

  // --- tiles ------------------------------------------------------------------------
  let rainSoFar = null
  let rainNext24 = null
  if (hasNow) {
    const dayStart = nowIdx - (nowIdx % 24)
    const sum = (a, b) => {
      const v = rainH.slice(a, b).filter(isNum)
      return v.length ? v.reduce((x, y) => x + y, 0) : null
    }
    rainSoFar = sum(dayStart, nowIdx + 1)
    rainNext24 = sum(nowIdx + 1, nowIdx + 25)
  }
  const uvMaxToday = at(dd?.uv_index_max, todayIdx)

  // The sun tile shows whichever of sunrise and sunset comes next, and where
  // the sun is between the two while it is up.
  const clock = nowMs != null && isNum(data.utcOffsetSeconds)
    ? placeClock(nowMs, data.utcOffsetSeconds)
    : (hasNow ? data.hours[nowIdx] : null)
  const tomorrowSunrise = parseLocal(at(dd?.sunrise, todayIdx + 1))
  let sun = null
  if (sunrise && sunset && clock) {
    if (clock < sunrise) sun = { next: 'sunrise', time: sunrise, other: sunset, progress: null }
    else if (clock < sunset) {
      sun = { next: 'sunset', time: sunset, other: sunrise, progress: (clock - sunrise) / (sunset - sunrise) }
    } else sun = { next: 'sunrise', time: tomorrowSunrise, other: sunset, progress: null }
    if (!sun.time) sun = null
  }
  const pressureLater = hasNow ? at(dh?.pressure_msl, nowIdx + 3) : null
  const pressureTrend = isNum(now.pressure) && isNum(pressureLater)
    ? (pressureLater - now.pressure > 1 ? 'rising' : now.pressure - pressureLater > 1 ? 'falling' : 'steady')
    : null

  return {
    now,
    hours,
    outlook: outlook ? { ...outlook, time: outlookAt } : null,
    days,
    weekRange,
    tiles: {
      rainSoFar,
      rainNext24,
      uvMaxToday,
      pressureTrend,
      sun,
    },
    hasDetails: Boolean(cur || dh || dd),
  }
}
