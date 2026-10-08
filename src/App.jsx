import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader, FreshnessBar } from './components/AppHeader'
import { Button } from './components/ui'
import { SkySpinner } from './components/SkySpinner'
import { NowHero } from './sections/NowHero'
import { HourlyStrip } from './sections/HourlyStrip'
import { DailyList } from './sections/DailyList'
import { DetailTiles } from './sections/DetailTiles'
import { ChartsSection } from './sections/ChartsSection'
import { LocationsSheet } from './sections/LocationsSheet'
import { SettingsSheet } from './sections/SettingsSheet'
import { I18nProvider } from './i18n/I18nProvider'
import { useI18n } from './i18n/context'
import { useEnsemble } from './hooks/useEnsemble'
import { useSettings } from './hooks/useSettings'
import { useOnline } from './hooks/useOnline'
import { useGeolocation } from './hooks/useGeolocation'
import { useNow } from './hooks/useNow'
import { useSavedPlaces } from './hooks/useSavedPlaces'
import { loadPlace, savePlace } from './core/storage'
import { describePoint } from './core/geocode'
import { fallbackPlace } from './core/defaults'
import { todayIndex, nowIndex } from './core/ensemble'
import { buildView } from './core/view'
import { skyColors } from './core/conditions'
import { getSystem } from './core/units'

/**
 * One screen, laid out the way a phone's own weather app is: the place and
 * the temperature at the top, then the next day hour by hour, the week, and
 * the details. The background takes the colour of the sky outside.
 *
 * There is no navigation because there is nowhere to go. The two things that
 * are not the forecast — choosing a place and the settings — slide up over it
 * as sheets and close straight back onto it. The app's original charts, with
 * every forecast service's figures, sit one tap away at the bottom.
 */
function Weather() {
  const { t, locale, timeAgo } = useI18n()
  const [place, setPlaceState] = useState(loadPlace)
  const [naming, setNaming] = useState(false)
  const [sheet, setSheet] = useState(null)   // null | 'places' | 'settings'

  const { settings, update: updateSettings } = useSettings()
  const online = useOnline()
  const { data, loading, error, refresh } = useEnsemble(place)
  const system = getSystem(settings.units)
  const now = useNow()
  const { places: saved, remember, forget } = useSavedPlaces()

  /** A place still waiting for its name is not listed among the saved ones;
   *  it is remembered when the name arrives. */
  const setPlace = useCallback((next) => {
    setPlaceState(next)
    savePlace(next)
    if (!next.pending) remember(next)
  }, [remember])

  /**
   * Takes a pair of coordinates and turns them into a named place.
   *
   * The forecast starts loading at once; the name catches up when the
   * geocoder answers. Waiting for the name first would hold the whole screen
   * on a lookup that is not needed to show a single number.
   */
  const adopt = useCallback(async (coords, known) => {
    if (known) {
      setPlace({ lat: coords.lat, lon: coords.lon, name: known.name, detail: known.detail ?? null, namedIn: known.namedIn ?? locale })
      return
    }
    setPlace({ ...coords, name: t('location.findingName'), detail: null, namedIn: locale, pending: true })
    setNaming(true)
    try {
      const described = await describePoint(coords.lat, coords.lon, {
        language: locale,
        fallbackName: t('location.unnamed'),
      })
      setPlace({ ...coords, ...described, namedIn: locale })
    } finally {
      setNaming(false)
    }
  }, [setPlace, locale, t])

  const { locate, requestOnOpen, locating, error: gpsErrorKey, supported, clearError } =
    useGeolocation((coords) => { adopt(coords); setSheet(null) })

  /**
   * The opening move, run once.
   *
   * With a place already stored there is nothing to ask about. With none, we
   * ask for the location and — whichever way that goes — land somewhere: a
   * reader who declines gets a sensible city and an invitation to search,
   * rather than an empty page waiting on a decision they have already made.
   */
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current || place) return
    opened.current = true
    requestOnOpen((gotIt) => {
      if (!gotIt) adopt(fallbackPlace(locale))
    })
  }, [place, requestOnOpen, adopt, locale])

  /**
   * A place named in one language should not stay that way after a switch.
   *
   * Only places we named ourselves are re-described, and only once per language
   * — `namedIn` is what stops this from firing on its own result.
   */
  useEffect(() => {
    if (!place || naming || place.namedIn === locale) return
    let cancelled = false
    describePoint(place.lat, place.lon, { language: locale, fallbackName: t('location.unnamed') })
      .then((described) => {
        if (!cancelled) setPlace({ lat: place.lat, lon: place.lon, ...described, namedIn: locale })
      })
      .catch(() => { /* the old name is still a name */ })
    return () => { cancelled = true }
  }, [locale, place, naming, setPlace, t])

  // Model runs land every few hours; anything older than fifteen minutes on
  // returning to the app is quietly refetched.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!data || Date.now() - data.fetchedAt > 15 * 60 * 1000) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [data, refresh])

  // Both marks are placed on the clock at the place being forecast, not on the
  // reader's — see placeNow in ensemble.js — and move on with the minute.
  const todayIdx = useMemo(
    () => (data ? todayIndex(data.dayKeys, data.utcOffsetSeconds, now) : -1), [data, now])
  const nowIdx = useMemo(
    () => (data ? nowIndex(data.hourlyKeys, data.utcOffsetSeconds, now) : -1), [data, now])
  const view = useMemo(
    () => (data ? buildView(data, { nowIdx, todayIdx, nowMs: now }) : null), [data, nowIdx, todayIdx, now])

  // The screen takes the colour of the sky now; the browser's own bar (the
  // status bar of an installed app) follows it so the two run together.
  const [skyTop, skyBottom] = skyColors(view?.now.condition.sky ?? 'clear-day')
  useEffect(() => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', skyTop))
  }, [skyTop])

  const closeSheet = useCallback(() => setSheet(null), [])
  const updatedLabel = data ? timeAgo(data.fetchedAt, now) : null

  return (
    <div
      className="app-shell sky flex flex-col"
      style={{ '--sky-top': skyTop, '--sky-bottom': skyBottom }}
    >
      <div className="flex-1 min-h-0 flex flex-col" inert={sheet != null}>
        <AppHeader onOpenSettings={() => setSheet('settings')} />

        <FreshnessBar online={online} error={error} fetchedAt={data?.fetchedAt} onRefresh={refresh} />

        {/* overscroll-contain stops a swipe past the end from dragging the whole
            page and bouncing the header away. `relative` makes this the box
            the visually hidden labels are positioned in: without it they are
            placed against the page, far below the fold, and the whole page —
            header and all — becomes scrollable behind the forecast. */}
        <main className="relative flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-2xl px-3.5 pb-6 flex flex-col gap-3.5">
            <NowHero
              place={place}
              view={view}
              system={system}
              onOpenPlaces={() => setSheet('places')}
              refreshing={loading}
              onRefresh={refresh}
              updatedLabel={updatedLabel}
            />

            {loading && !data && <SkySpinner label={t('states.loading')} />}

            {!loading && !data && place && (
              <div className="glass p-4" role="status">
                <p className="text-lg font-bold">{t('states.errorTitle')}</p>
                <p className="text-base mt-1">{t(error ?? 'states.errorBody')}</p>
                <Button variant="secondary" className="mt-3" onClick={refresh}>{t('states.retry')}</Button>
              </div>
            )}

            {view && (
              <>
                <HourlyStrip view={view} system={system} />
                <DailyList view={view} system={system} nowTemp={view.now.temp} />
                <DetailTiles view={view} system={system} />
                <ChartsSection
                  open={settings.showCharts}
                  onToggle={() => updateSettings({ showCharts: !settings.showCharts })}
                  data={data}
                  system={system}
                  todayIdx={todayIdx}
                  nowIdx={nowIdx}
                />
              </>
            )}

            <button
              type="button"
              onClick={() => setSheet('settings')}
              aria-haspopup="dialog"
              className="glass w-full min-h-[3.4rem] px-4 text-left text-lg font-semibold
                         flex items-center justify-between active:bg-black/30"
            >
              <span>{t('settings.title')}</span>
              <span className="text-base font-medium">{t('settings.summary')}</span>
            </button>

            <p className="text-center text-sm">{t('about.credits')}</p>
          </div>
        </main>
      </div>

      <LocationsSheet
        open={sheet === 'places'}
        onClose={closeSheet}
        place={place}
        saved={saved}
        onForget={forget}
        onPickCoords={(coords) => adopt(coords)}
        onSelectFound={(found) => adopt({ lat: found.lat, lon: found.lon }, found)}
        onSelectSaved={(p) => adopt({ lat: p.lat, lon: p.lon }, p)}
        onLocate={locate}
        locating={locating}
        gpsError={gpsErrorKey ? t(gpsErrorKey) : null}
        gpsSupported={supported}
        onClearGpsError={clearError}
      />
      <SettingsSheet open={sheet === 'settings'} onClose={closeSheet} settings={settings} onChange={updateSettings} />
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <Weather />
    </I18nProvider>
  )
}
