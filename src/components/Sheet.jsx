import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { useI18n } from '../i18n/context'

/**
 * A panel that slides up from the bottom of the screen — where a phone's
 * weather app keeps everything that is not the forecast itself: the list of
 * places and the settings.
 *
 * It is a real modal dialog: the page behind it is made inert by the caller,
 * Escape closes it, focus moves into it on open and back to whatever opened
 * it on close. It closes with a worded "Done" button rather than only a swipe
 * or a tap on the shade, because neither of those is discoverable.
 */
export function Sheet({ open, onClose, title, children }) {
  const { t } = useI18n()
  const titleId = useId()
  const doneRef = useRef(null)
  const openerRef = useRef(null)

  // The opener is read in a layout effect, in the same commit that makes the
  // page behind inert: by the time a passive effect runs the browser may
  // already have blurred it, and focus would come back to nothing on close.
  useLayoutEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement
    doneRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const opener = openerRef.current
    return () => { if (opener instanceof HTMLElement) opener.focus() }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      <div className="sheet-shade absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-panel relative mx-auto w-full max-w-2xl flex flex-col
                   rounded-t-3xl bg-plane text-ink shadow-2xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <header className="flex items-center gap-3 px-4 pt-2 pb-3 border-b border-hairline">
          <h2 id={titleId} className="flex-1 min-w-0 text-2xl font-bold leading-tight">{title}</h2>
          <button
            ref={doneRef}
            type="button"
            onClick={onClose}
            className="shrink-0 min-h-[3rem] px-5 rounded-full bg-brand text-brand-ink
                       text-lg font-semibold active:brightness-90"
          >
            {t('sheet.done')}
          </button>
        </header>
        <div className="safe-bottom flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 pb-6 flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
