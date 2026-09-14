import { WeatherIcon } from './WeatherIcon'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useI18n } from '../i18n/context'
import { useNow } from '../hooks/useNow'

/**
 * The app's name, the language switcher, and the refresh.
 *
 * The language switcher sits in the header rather than in the settings card
 * further down because a reader who cannot read the interface cannot navigate
 * to a setting that would fix it. It is the one control that has to be reachable
 * without understanding anything else on screen.
 */
export function AppHeader({ onRefresh, refreshing, canRefresh }) {
  const { t } = useI18n()

  return (
    <header className="safe-top shrink-0 bg-brand text-brand-ink">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{t('app.name')}</h1>
          <p className="text-sm opacity-85 truncate">{t('app.tagline')}</p>
        </div>

        <LanguageSwitcher compact />

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || !canRefresh}
          aria-label={t('header.updateAria')}
          className="shrink-0 min-h-[2.6rem] min-w-[2.6rem] px-2.5 rounded-lg
                     border-2 border-brand-ink/35 flex items-center gap-1.5
                     text-sm font-semibold active:opacity-80 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"
               style={{ width: '1.2rem', height: '1.2rem' }}
               className={refreshing ? 'animate-spin' : ''}>
            <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"
                  fill="none" stroke="currentColor" strokeWidth="2.3"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}

/**
 * The freshness strip.
 *
 * Driven by how old the data is, not by `navigator.onLine` — which reports true
 * on a Wi-Fi with no route out, and which Chrome does not reliably flip. Age is
 * the fact the reader needs either way: an app that shows a day-old forecast as
 * though it were current is worse than one that admits it cannot reach the
 * service.
 */
const STALE_AFTER = 2 * 60 * 60 * 1000

export function FreshnessBar({ online, error, fetchedAt, onRefresh }) {
  const { t, timeAgo } = useI18n()
  const now = useNow()
  const age = fetchedAt ? now - fetchedAt : null
  const old = age != null && age > STALE_AFTER
  const label = timeAgo(fetchedAt, now)

  let message = null
  if (!online) {
    message = label ? t('status.offlineAge', { age: label }) : t('status.offline')
  } else if (error) {
    message = label ? t('status.error', { age: label }) : t('status.errorNoAge')
  } else if (old) {
    message = t('status.stale', { age: label })
  }
  if (!message) return null

  return (
    <div
      role="status"
      className="shrink-0 px-4 py-2.5 flex items-center gap-2.5 border-b-2 bg-temp-soft border-warning"
    >
      <WeatherIcon name="cloud" size="1.4rem" className="text-ink-2 shrink-0" />
      <p className="text-base font-semibold text-ink leading-tight flex-1">{message}</p>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 min-h-[2.6rem] px-3 rounded-lg border-2 border-ink-2
                     text-base font-bold text-ink active:bg-sunken"
        >
          {t('status.tryAgain')}
        </button>
      )}
    </div>
  )
}
