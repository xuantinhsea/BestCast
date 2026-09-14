import { Card, CardTitle } from '../components/ui'
import { useI18n } from '../i18n/context'

/**
 * Who made this, and how to reach them.
 *
 * Only the heading and the rights line are translated. A name, an employer, a
 * postal address and a phone number are not text to be localised — rendering
 * "Nippon Koei Co., Ltd." differently per language would make the contact
 * details harder to act on, not easier, and a Japanese postal address is
 * already in the form the post office wants.
 *
 * The address is marked up as an <address> so assistive technology announces it
 * as contact details rather than as another paragraph, and the phone and email
 * are real links: on a phone, a number you have to retype by hand is a number
 * nobody uses.
 */
const AUTHOR = {
  name: 'Nguyen Xuan TINH (Ph.D.)',
  org: 'Nippon Koei Co., Ltd. — Water Resources & Energy Dept.',
  address: '〒102-8539: 5-4 Kojimachi, Chiyoda-ku, Tokyo, JAPAN',
  tel: '+81-80-4689-7461',
  email: 'xuantinhsea@gmail.com',
  url: 'https://xuantinhsea.github.io/',
}

export function AuthorCard() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <Card>
      <CardTitle>{t('author.title')}</CardTitle>

      <address className="not-italic text-lg text-ink-2 leading-relaxed">
        <span className="block font-bold text-ink">{AUTHOR.name}</span>
        <span className="block">{AUTHOR.org}</span>
        <span className="block text-base">{AUTHOR.address}</span>

        <span className="block mt-2 text-base">
          Tel:{' '}
          {/* tel: strips the separators the human-readable form keeps. */}
          <a href={`tel:${AUTHOR.tel.replace(/[^+\d]/g, '')}`} className="text-brand font-semibold underline">
            {AUTHOR.tel}
          </a>
        </span>
        <span className="block text-base break-words">
          E-Mail:{' '}
          <a href={`mailto:${AUTHOR.email}`} className="text-brand font-semibold underline">
            {AUTHOR.email}
          </a>
        </span>
        <span className="block text-base break-words">
          URL:{' '}
          <a
            href={AUTHOR.url}
            target="_blank"
            // noopener is the one that matters: without it the opened page gets
            // a handle back to this one through window.opener.
            rel="noopener noreferrer"
            className="text-brand font-semibold underline"
          >
            {AUTHOR.url}
          </a>
        </span>
      </address>

      <p className="text-base text-muted mt-4">
        © {year} {AUTHOR.name}. {t('author.rights')}
      </p>
    </Card>
  )
}
