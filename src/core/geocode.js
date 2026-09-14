/**
 * Place lookup, both directions, in the reader's language.
 *
 * Both calls take a locale, and both honour it: searching for "Tokyo" in
 * Japanese returns 東京都, and reverse-geocoding a pin dropped on Hanoi returns
 * Hà Nội in Vietnamese and ハノイ in Japanese. A place name is part of the
 * interface, not data passing through it — an app that translates its buttons
 * and then labels the map "Viet Nam" has only half switched language.
 */

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search'

// Reverse geocoding is a genuinely different service: the search endpoint above
// has no reverse mode, and asking it for coordinates returns nothing at all.
// This one needs no key, answers CORS, and takes the same language codes.
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

export async function searchPlaces(query, { count = 6, language = 'en', signal } = {}) {
  const q = query?.trim()
  if (!q || q.length < 2) return []

  const params = new URLSearchParams({ name: q, count: String(count), language, format: 'json' })
  const res = await fetch(`${SEARCH_URL}?${params}`, { signal })
  if (!res.ok) throw new Error('Could not search for places just now.')
  const data = await res.json()

  return (data.results ?? []).map((r) => ({
    id: `g${r.id}`,
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }))
}

/**
 * Names an arbitrary point — after a map tap, or a GPS fix.
 *
 * "10.78, 106.70" tells a reader nothing about whether they have picked the
 * right place, and the map alone cannot confirm it for somewhere they have not
 * seen from above before. So the pin always carries a name.
 *
 * `fallbackName` is passed in already translated rather than hard-coded here,
 * because this module has no business holding an English string: when the
 * lookup fails the reader should still be told, in their own language, that
 * this is a point they chose rather than a place anyone has named.
 */
export async function describePoint(lat, lon, { language = 'en', fallbackName, signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    localityLanguage: language,
  })
  try {
    const res = await fetch(`${REVERSE_URL}?${params}`, { signal })
    if (res.ok) {
      const d = await res.json()
      // city is the useful grain — locality can be a single neighbourhood, and
      // principalSubdivision alone can be an entire province.
      const name = d.city || d.locality || d.principalSubdivision
      if (name) {
        const detail = [
          d.principalSubdivision && d.principalSubdivision !== name ? d.principalSubdivision : null,
          d.countryName,
        ].filter(Boolean).join(', ')
        return { name, detail }
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // Fall through — an unnamed point still gives a perfectly good forecast,
    // and an ocean tap genuinely has no name to find.
  }
  return { name: fallbackName ?? 'Selected point', detail: formatCoords(lat, lon) }
}

/** "10.78°N, 106.70°E" — compass letters instead of minus signs. */
export function formatCoords(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`
}

/**
 * Clamps a latitude and wraps a longitude back into range. A world map can be
 * dragged past its own edge, which hands us a longitude of 400 and an API error
 * the reader cannot possibly explain.
 */
export function normalizeCoords(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180
  return {
    lat: Math.max(-90, Math.min(90, Number(lat.toFixed(4)))),
    lon: Number(wrapped.toFixed(4)),
  }
}
