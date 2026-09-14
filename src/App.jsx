import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader, FreshnessBar } from './components/AppHeader'
import { Card, CardTitle, Choice, Notice, Button, Spinner } from './components/ui'
import { LanguageChoice } from './components/LanguageSwitcher'
import { LocationCard } from './sections/LocationCard'
import { ParameterCard } from './sections/ParameterCard'
import { AuthorCard } from './sections/AuthorCard'
import { I18nProvider } from './i18n/I18nProvider'
import { useI18n } from './i18n/context'
import { useEnsemble } from './hooks/useEnsemble'
import { useSettings, TEXT_SCALES } from './hooks/useSettings'
import { useOnline } from './hooks/useOnline'
import { useGeolocation } from './hooks/useGeolocation'
import { useNow } from './hooks/useNow'
import { loadPlace, savePlace } from './core/storage'
import { describePoint } from './core/geocode'
import { fallbackPlace } from './core/defaults'
import { PARAMETERS, todayIndex, nowIndex } from './core/ensemble'
import { SYSTEMS, getSystem } from './core/units'

/**
 * One page. A map at the top to say where, four charts to say what, and the
 * settings underneath.
 *
 * There is no navigation because there is nowhere to go: everything the app
 * knows is on this page, in the order someone reads it. A reader who has to
 * find a tab to see tomorrow's rain has been given a filing system instead of
 * a forecast.
 */
function Weather() {
  const { t, locale, timeAgo } = useI18n()
  const [place, setPlaceState] = useState(loadPlace)
  const [naming, setNaming] = useState(false)

  const { settings, update: updateSettings } = useSettings()
  const online = useOnline()
  const { data, loading, error, refresh } = useEnsemble(place)
  const system = getSystem(settings.units)
  const now = useNow()

  const setPlace = useCallback((next) => {
    setPlaceState(next)
    savePlace(next)
  }, [])

  /**
   * Takes a pair of coordinates and turns them into a named place.
   *
   * The pin moves immediately and the forecast starts loading; the name catches
   * up when the geocoder answers. Waiting for the name first would hold the
   * whole page on a lookup that is not needed to draw a single chart.
   */
  const adopt = useCallback(async (coords, known) => {
    if (known) {
      setPlace({ lat: coords.lat, lon: coords.lon, name: known.name, detail: known.detail, namedIn: locale })
      return
    }
    setPlace({ ...coords, name: t('location.findingName'), detail: null, namedIn: locale })
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
    useGeolocation((coords) => adopt(coords))

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
  // reader's — see placeNow in ensemble.js.
  const todayIdx = useMemo(
    () => (data ? todayIndex(data.dayKeys, data.utcOffsetSeconds) : -1), [data])
  const nowIdx = useMemo(
    () => (data ? nowIndex(data.hourlyKeys, data.utcOffsetSeconds) : -1), [data])

  return (
    <div className="app-shell flex flex-col bg-plane">
      <AppHeader onRefresh={refresh} refreshing={loading} canRefresh={!!place} />

      <FreshnessBar
        online={online}
        error={error}
        fetchedAt={data?.fetchedAt}
        onRefresh={refresh}
      />

      {/* overscroll-contain stops a swipe past the end from dragging the whole
          page and bouncing the header away. */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-6xl p-4 flex flex-col gap-4">
          <LocationCard
            place={place}
            naming={naming}
            onPickCoords={(coords) => adopt(coords)}
            onSelectFound={(found) => adopt({ lat: found.lat, lon: found.lon }, found)}
            onLocate={locate}
            locating={locating}
            gpsError={gpsErrorKey ? t(gpsErrorKey) : null}
            gpsSupported={supported}
            onClearGpsError={clearError}
          />

          {loading && !data && <Spinner label={t('states.loading')} />}

          {!loading && !data && place && (
            <Notice
              title={t('states.errorTitle')}
              tone="critical"
              action={<Button variant="primary" onClick={refresh}>{t('states.retry')}</Button>}
            >
              {t(error ?? 'states.errorBody')}
            </Notice>
          )}

          {/* On a phone these stack; on a wide screen they pair up, so the
              page stops being a single very long column.

              grid-cols-1 is not redundant: without an explicit template the
              implicit track is auto-sized to max-content, and the wide hourly
              strip inside a card drags the whole page off the screen. */}
          {data && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {PARAMETERS.map((parameter) => (
                <ParameterCard
                  key={parameter.id}
                  parameter={parameter}
                  data={data}
                  system={system}
                  todayIdx={todayIdx}
                  nowIdx={nowIdx}
                />
              ))}
            </div>
          )}

          <Card>
            <CardTitle>{t('settings.title')}</CardTitle>
            <div className="flex flex-col gap-5">
              <LanguageChoice />
              <Choice
                name="units"
                legend={t('settings.units')}
                value={settings.units}
                onChange={(units) => updateSettings({ units })}
                options={Object.values(SYSTEMS).map((s) => ({ value: s.id, label: s.short }))}
              />
              <Choice
                name="textScale"
                legend={t('settings.textSize')}
                value={settings.textScale}
                onChange={(textScale) => updateSettings({ textScale })}
                options={TEXT_SCALES.map((s) => ({ value: s.value, label: t(s.messageKey) }))}
              />
            </div>
          </Card>

          <Card>
            <CardTitle>{t('about.title')}</CardTitle>
            <p className="text-lg text-ink-2">{t('about.body')}</p>
            <p className="text-base text-muted mt-3">{t('about.credits')}</p>
          </Card>

          <AuthorCard />

          {data && (
            <p className="text-base text-muted text-center pb-2">
              {timeAgo(data.fetchedAt, now)}
            </p>
          )}
        </div>
      </main>
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
