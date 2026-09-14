/**
 * The three languages the app speaks, and how it picks one on a first visit.
 *
 * Each entry carries its own endonym — the name of the language *in* that
 * language. A switcher that lists "Vietnamese / English / Japanese" in English
 * is only usable by someone who already reads English, which is precisely the
 * reader it is meant to help.
 *
 * There are deliberately no flags. Windows ships no glyphs for regional
 * indicator pairs, so 🇻🇳 renders there as the bare letters "VN" sitting next
 * to the word it was supposed to illustrate. A flag is a country rather than a
 * language in any case — 🇬🇧 speaks for none of the English spoken outside it —
 * and "日本語" identifies itself to the only reader who needs to find it.
 *
 * `tag` is the BCP-47 tag handed to Intl, and it is not always the same as
 * `code`: 'en' alone resolves to US conventions (9/14/2026, MM/DD), and this
 * app is read far more widely than that. 'en-GB' gives the day-first order that
 * matches the Vietnamese and Japanese formats sitting beside it.
 */
export const LOCALES = [
  { code: 'vi', tag: 'vi-VN', name: 'Tiếng Việt', short: 'VI' },
  { code: 'en', tag: 'en-GB', name: 'English',    short: 'EN' },
  { code: 'ja', tag: 'ja-JP', name: '日本語',      short: '日本' },
]

export const DEFAULT_LOCALE = 'en'

export const localeByCode = (code) =>
  LOCALES.find((l) => l.code === code) ?? LOCALES.find((l) => l.code === DEFAULT_LOCALE)

/**
 * The closest match to what the browser asks for.
 *
 * navigator.languages is in the reader's own order of preference, so the first
 * entry we can serve wins. Matching is on the primary subtag only: someone with
 * 'ja-JP' or 'vi-VN' or 'en-AU' set should all land somewhere sensible rather
 * than falling through to the default because the region did not match.
 */
export function detectLocale(languages = navigator?.languages ?? []) {
  const wanted = languages.length ? languages : [navigator?.language].filter(Boolean)
  for (const lang of wanted) {
    const primary = String(lang).toLowerCase().split('-')[0]
    const hit = LOCALES.find((l) => l.code === primary)
    if (hit) return hit.code
  }
  return DEFAULT_LOCALE
}
