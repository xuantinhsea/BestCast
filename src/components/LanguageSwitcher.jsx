import { useI18n } from '../i18n/context'

/**
 * Three languages, all three always visible.
 *
 * Not a dropdown. A reader who has landed in a language they cannot read needs
 * to see the way out without first understanding the control that hides it —
 * and the whole set costs less width than the word "Language" does.
 *
 * Each option is labelled with its own endonym — see locales.js for why there
 * are no flags beside them.
 *
 * `onSky` is the variant for the forecast screen's sky background, which stays
 * dark in both colour schemes, so it cannot use the scheme-following brand
 * colours.
 */
export function LanguageSwitcher({ compact = false, onSky = false }) {
  const { locale, locales, setLocale, t } = useI18n()

  return (
    <div role="group" aria-label={t('lang.aria')} className="flex gap-1">
      {locales.map((l) => {
        const on = l.code === locale
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            onClick={() => setLocale(l.code)}
            aria-pressed={on}
            // The state is carried by the filled background AND the bold
            // weight, never by colour alone.
            className={`
              flex items-center justify-center gap-1.5 rounded-lg border-2 whitespace-nowrap
              ${compact ? 'min-h-[2.75rem] min-w-[2.75rem] px-2 text-sm' : 'min-h-[3.4rem] flex-1 px-3 text-base'}
              leading-tight transition-[background-color] duration-100
              ${onSky ? (on
                ? 'bg-white text-[#0b2a4a] border-white font-bold'
                : 'bg-black/15 text-white border-white/50 font-semibold')
                : (on
                  ? 'bg-brand-ink text-brand border-brand-ink font-bold'
                  : 'bg-transparent text-brand-ink/90 border-brand-ink/35 font-semibold')}
            `}
          >
            <span>{compact ? l.short : l.name}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * The same switcher for the settings card, where it sits on the page surface
 * rather than on the header's brand colour and needs the opposite palette.
 */
export function LanguageChoice() {
  const { locale, locales, setLocale, t } = useI18n()

  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="text-lg font-semibold text-ink mb-2">{t('lang.label')}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-2">
        {locales.map((l) => {
          const on = l.code === locale
          return (
            <label
              key={l.code}
              lang={l.code}
              className={`
                flex items-center justify-center gap-1.5 text-center
                min-h-[3.4rem] px-2 rounded-xl border-2 cursor-pointer
                text-base font-semibold leading-tight
                ${on ? 'bg-brand text-brand-ink border-brand' : 'bg-surface text-ink border-line'}
              `}
            >
              <input
                type="radio"
                name="language"
                checked={on}
                onChange={() => setLocale(l.code)}
                className="sr-only"
              />
              <span>{l.name}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
