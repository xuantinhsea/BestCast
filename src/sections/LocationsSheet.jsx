import { lazy, Suspense, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { Button, Notice, Spinner } from '../components/ui'
import { PlaceSearch } from '../components/PlaceSearch'
import { formatCoords } from '../core/geocode'
import { sameSpot } from '../hooks/useSavedPlaces'
import { useI18n } from '../i18n/context'

// The map library is the heaviest thing in the app and most visits never
// open it, so it is fetched only when someone asks to choose on the map.
const PlaceMap = lazy(() => import('../components/PlaceMap').then((m) => ({ default: m.PlaceMap })))

/**
 * Everywhere the reader might want the forecast for: their own position, the
 * places they have looked at before, a search, and — for a spot with no name
 * worth searching for — the map.
 *
 * Picking any of them closes the sheet straight onto that place's forecast.
 */
export function LocationsSheet({
  open, onClose, place, saved, onForget,
  onPickCoords, onSelectFound, onSelectSaved,
  onLocate, locating, gpsError, gpsSupported, onClearGpsError,
}) {
  const { t } = useI18n()
  const [showMap, setShowMap] = useState(false)
  const pick = (fn) => (...args) => { fn(...args); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title={t('places.title')}>
      {gpsSupported && (
        <div className="flex flex-col gap-3">
          <Button variant="primary" full onClick={onLocate} disabled={locating}>
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '1.3rem', height: '1.3rem' }}>
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"
                    fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            </svg>
            {locating ? t('location.finding') : t('location.useMyLocation')}
          </Button>
          {gpsError && (
            <Notice
              title={t('location.errorTitle')}
              action={<Button onClick={onClearGpsError}>{t('location.close')}</Button>}
            >
              {gpsError}
            </Notice>
          )}
        </div>
      )}

      {saved.length > 0 && (
        <section aria-labelledby="saved-title">
          <h3 id="saved-title" className="text-lg font-semibold text-ink mb-2">{t('places.saved')}</h3>
          <ul className="rounded-2xl border-2 border-line overflow-hidden bg-surface">
            {saved.map((p, i) => {
              const current = place && sameSpot(p, place)
              return (
                <li key={`${p.lat},${p.lon}`} className={`flex items-stretch ${i > 0 ? 'border-t-2 border-hairline' : ''}`}>
                  <button
                    type="button"
                    onClick={pick(() => onSelectSaved(p))}
                    aria-current={current ? 'location' : undefined}
                    className="flex-1 min-w-0 text-left px-4 py-3 min-h-[3.4rem] active:bg-sunken"
                  >
                    <span className="block text-xl font-bold text-ink truncate">{p.name}</span>
                    <span className="block text-base text-muted truncate">
                      {current ? t('places.current') : (p.detail || formatCoords(p.lat, p.lon))}
                    </span>
                  </button>
                  {!current && (
                    <button
                      type="button"
                      onClick={() => onForget(p)}
                      aria-label={t('places.removeAria', { name: p.name })}
                      className="shrink-0 px-4 min-h-[3.4rem] text-base font-semibold text-ink-2
                                 border-l-2 border-hairline active:bg-sunken"
                    >
                      {t('places.remove')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <PlaceSearch onSelect={pick(onSelectFound)} />

      <div>
        {!showMap ? (
          <Button full onClick={() => setShowMap(true)}>{t('places.onMap')}</Button>
        ) : (
          <>
            <Suspense fallback={<div className="h-[16rem] rounded-2xl border-2 border-line bg-sunken"><Spinner label={t('states.loading')} /></div>}>
              {place && <PlaceMap lat={place.lat} lon={place.lon} onPick={pick(onPickCoords)} height="16rem" />}
            </Suspense>
            <p className="text-base text-muted mt-2">{t('places.mapHint')}</p>
          </>
        )}
      </div>
    </Sheet>
  )
}
