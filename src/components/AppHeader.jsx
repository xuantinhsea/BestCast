import { WeatherIcon } from './WeatherIcon'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useI18n } from '../i18n/context'
import { useNow } from '../hooks/useNow'

/**
 * The strip along the top of the forecast screen: the language switcher and
 * the way into the settings.
 *
 * The language switcher stays out here rather than only inside the settings
 * because a reader who cannot read the interface cannot find a setting that
 * would fix it. It is the one control that has to be reachable without
 * understanding anything else on screen. Settings is a worded button, not a
 * bare cog: a pictogram alone is a guess.
 *
 * At the largest text size on a small phone the two do not fit on one line;
 * the settings button then wraps to its own line, right-aligned, rather than
 * either control being cut off.
 *
 * The app's name is not repeated here — the place name below is the heading
 * a weather screen needs, and the name is in the browser's title and on the
 * installed icon already.
 */
export function AppHeader({ onOpenSettings }) {
  const { t } = useI18n()

  return (
    <header className="safe-top shrink-0 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 pt-2 pb-1">
        <LanguageSwitcher compact onSky />

        <button
          type="button"
          onClick={onOpenSettings}
          aria-haspopup="dialog"
          className="ml-auto shrink-0 min-h-[2.75rem] px-3 rounded-lg border-2 border-white/50 bg-black/15
                     flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold active:bg-black/30"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '1.2rem', height: '1.2rem' }}>
            <path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7.6 7.6 0 0 1-2 1.2l-.3 2h-3.6l-.3-2a7.6 7.6 0 0 1-2-1.2l-1.9.7-1.8-3.1 1.6-1.2a7.7 7.7 0 0 1 0-3l-1.6-1.2 1.8-3.1 1.9.7a7.6 7.6 0 0 1 2-1.2l.3-2h3.6l.3 2a7.6 7.6 0 0 1 2 1.2l1.9-.7 1.8 3.1-1.6 1.2a7.7 7.7 0 0 1 0 3Z"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span>{t('settings.title')}</span>
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
