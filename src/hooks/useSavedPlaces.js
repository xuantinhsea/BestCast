import { useCallback, useState } from 'react'
import { loadPlaces, savePlaces, MAX_SAVED_PLACES } from '../core/storage'

/** Two entries closer than about a kilometre are the same place. */
export const sameSpot = (a, b) => a.lat.toFixed(2) === b.lat.toFixed(2) && a.lon.toFixed(2) === b.lon.toFixed(2)

/**
 * The places a reader has looked at, newest first — the list in the
 * Locations sheet, so going back to the town you checked yesterday is one tap
 * rather than another search.
 *
 * Remembering is done from the event that changed the place, never from an
 * effect watching it, so a place is listed once it has a real name and not
 * while it still says "Finding the name…".
 */
export function useSavedPlaces() {
  const [places, setPlaces] = useState(loadPlaces)

  const remember = useCallback((place) => {
    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return
    setPlaces((prev) => {
      const entry = { lat: place.lat, lon: place.lon, name: place.name, detail: place.detail ?? null, namedIn: place.namedIn }
      const next = [entry, ...prev.filter((p) => !sameSpot(p, entry))].slice(0, MAX_SAVED_PLACES)
      savePlaces(next)
      return next
    })
  }, [])

  const forget = useCallback((place) => {
    setPlaces((prev) => {
      const next = prev.filter((p) => !sameSpot(p, place))
      savePlaces(next)
      return next
    })
  }, [])

  return { places, remember, forget }
}
