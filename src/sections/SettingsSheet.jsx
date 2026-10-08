import { Sheet } from '../components/Sheet'
import { Choice } from '../components/ui'
import { LanguageChoice } from '../components/LanguageSwitcher'
import { AuthorCard } from './AuthorCard'
import { TEXT_SCALES } from '../hooks/useSettings'
import { SYSTEMS } from '../core/units'
import { useI18n } from '../i18n/context'

/**
 * Language, units, text size, and what the app is — the things set once and
 * then left alone, kept off the forecast screen in their own sheet.
 */
export function SettingsSheet({ open, onClose, settings, onChange }) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onClose={onClose} title={t('settings.title')}>
      <LanguageChoice />
      <Choice
        name="units"
        legend={t('settings.units')}
        value={settings.units}
        onChange={(units) => onChange({ units })}
        options={Object.values(SYSTEMS).map((s) => ({ value: s.id, label: s.short }))}
      />
      <Choice
        name="textScale"
        legend={t('settings.textSize')}
        value={settings.textScale}
        onChange={(textScale) => onChange({ textScale })}
        options={TEXT_SCALES.map((s) => ({ value: s.value, label: t(s.messageKey) }))}
      />

      <section aria-labelledby="about-title">
        <h3 id="about-title" className="text-xl font-bold text-ink">{t('about.title')}</h3>
        <p className="text-lg text-ink-2 mt-1">{t('about.body')}</p>
        <p className="text-base text-muted mt-3">{t('about.credits')}</p>
      </section>

      <AuthorCard />
    </Sheet>
  )
}
