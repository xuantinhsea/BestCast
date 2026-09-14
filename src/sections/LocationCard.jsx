import { Card, Button, Notice, Spinner } from '../components/ui'
import { PlaceMap } from '../components/PlaceMap'
import { PlaceSearch } from '../components/PlaceSearch'
import { formatCoords } from '../core/geocode'
import { useI18n } from '../i18n/context'

/**
 * Where the forecast is for, and the three ways to change it.
 *
 * The map is kept to roughly a third of the first screen: it is here to confirm
 * a place, not to be explored, and the charts below it are what the reader came
 * for. The chosen place is named above it in words — a pin on a map somewhere
 * you have never seen from above is not confirmation of anything.
 */
export function LocationCard({
  place, naming,
  onPickCoords, onSelectFound,
  onLocate, locating, gpsError, gpsSupported, onClearGpsError,
}) {
  const { t } = useI18n()

  return (
    <Card>
      <header className="mb-3">
        <p className="text-base font-semibold text-muted uppercase tracking-wide">
          {t('header.forecastFor')}
        </p>
        <h2 className="text-2xl font-bold text-ink leading-tight">
          {place ? place.name : t('header.choosePlace')}
        </h2>
        {place && (
          <p className="text-base text-muted mt-0.5">
            {[place.detail, formatCoords(place.lat, place.lon)].filter(Boolean).join(' · ')}
          </p>
        )}
      </header>

      {place ? (
        <PlaceMap lat={place.lat} lon={place.lon} onPick={onPickCoords} height="13rem" />
      ) : (
        <div className="h-[13rem] rounded-2xl border-2 border-line bg-sunken
                        flex items-center justify-center">
          <Spinner label={t('states.loading')} />
        </div>
      )}

      <p className="text-base text-muted mt-2">
        {place ? t('location.mapHint') : t('location.noPlaceHint')}
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {gpsSupported && (
          <Button variant="secondary" full onClick={onLocate} disabled={locating || naming}>
            {locating ? t('location.finding') : t('location.useMyLocation')}
          </Button>
        )}

        {gpsError && (
          <Notice
            title={t('location.errorTitle')}
            action={<Button onClick={onClearGpsError}>{t('location.close')}</Button>}
          >
            {gpsError}
          </Notice>
        )}

        <PlaceSearch onSelect={onSelectFound} />
      </div>
    </Card>
  )
}
