/** The loading wheel for the sky background, where the page spinner's ink
 *  colours would vanish. The label is required and arrives translated. */
export function SkySpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-white" role="status">
      <div className="h-10 w-10 rounded-full border-4 border-white/35 border-t-white animate-spin" aria-hidden="true" />
      <p className="text-lg font-semibold">{label}</p>
    </div>
  )
}
