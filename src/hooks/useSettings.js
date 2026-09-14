import { useCallback, useEffect, useState } from 'react'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../core/storage'

/** The three text sizes offered. Anything past 1.35 starts wrapping the big
 *  numbers onto two lines on a small phone, which reads worse than it helps.
 *  Labelled by translation key, not by an English word. */
export const TEXT_SCALES = [
  { value: 1, messageKey: 'settings.textNormal' },
  { value: 1.15, messageKey: 'settings.textLarge' },
  { value: 1.32, messageKey: 'settings.textLargest' },
]

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)

  // The scale drives the root font size, and every rem in the app with it.
  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale))
  }, [settings.textScale])

  useEffect(() => { saveSettings(settings) }, [settings])

  const update = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  return { settings, update, reset }
}
