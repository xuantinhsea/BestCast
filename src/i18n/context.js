import { createContext, useContext } from 'react'

/**
 * The language context and the hook that reads it.
 *
 * Split from the provider so that file exports a component and nothing else —
 * a module mixing components with plain values breaks fast refresh, and this
 * hook is imported by nearly every component in the app.
 */
export const I18nContext = createContext(null)

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
