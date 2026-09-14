import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeCoords } from '../core/geocode'

// Geolocation is refused outside a secure context. Both deployments are HTTPS
// and localhost counts as secure, so this really guards the case of someone
// serving the built files over plain http on a LAN address.
function available() {
  return typeof navigator !== 'undefined'
    && 'geolocation' in navigator
    && (window.isSecureContext ?? true)
}

/**
 * Browser error codes, mapped to translation keys rather than to sentences.
 *
 * The hook has no business holding English: it returns the key and the screen
 * translates it, so an error raised before a language switch is re-rendered in
 * the new language instead of being stuck in the old one.
 */
function explain(err) {
  switch (err?.code) {
    case 1: return 'location.gps.denied'
    case 2: return 'location.gps.unavailable'
    case 3: return 'location.gps.timeout'
    default: return 'location.gps.failed'
  }
}

/**
 * Wraps the browser geolocation API.
 *
 * `locate()` is the explicit, button-driven request. `requestOnOpen()` is the
 * one made on a first visit with nothing stored: it asks, and whichever way it
 * resolves it calls back so the caller can fall back to a default city rather
 * than leaving the reader on an empty page waiting for a decision they may have
 * already made.
 */
export function useGeolocation(onLocated) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState(null)
  const [supported] = useState(available)

  // Callers rebuild onLocated every render; hold it in a ref so `locate` stays
  // stable and effects don't re-fire on each parent render.
  const cb = useRef(onLocated)
  useEffect(() => { cb.current = onLocated }, [onLocated])

  const request = useCallback((opts = {}) => {
    if (!available()) {
      setError('location.unsupported')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const c = normalizeCoords(pos.coords.latitude, pos.coords.longitude)
        if (!c) {
          setError('location.gps.unreadable')
          opts.onSettled?.(false)
          return
        }
        cb.current?.(c)
        opts.onSettled?.(true)
      },
      (err) => {
        setLocating(false)
        // A silent request must never raise a message nobody asked for.
        if (!opts.silent) setError(explain(err))
        opts.onSettled?.(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
    )
  }, [])

  const locate = useCallback(() => request(), [request])

  /**
   * The opening request, made once when there is no stored place.
   *
   * Silent: a reader who declines gets the fallback city and a line inviting
   * them to search, not an error box explaining a dialog they just dismissed on
   * purpose. `onSettled` fires either way so the caller can fall back without
   * having to time it.
   */
  const requestOnOpen = useCallback((onSettled) => {
    if (!available()) { onSettled?.(false); return }
    request({ silent: true, onSettled })
  }, [request])

  return { locate, requestOnOpen, locating, error, supported, clearError: () => setError(null) }
}
