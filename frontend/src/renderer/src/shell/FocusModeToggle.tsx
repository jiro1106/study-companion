import { Loader2, Shield, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ICON } from '../ui/icon'

/** Toggles OS-level blocking of social media + YouTube across all browsers while studying. */
export function FocusModeToggle(): React.JSX.Element | null {
  const focus = window.bardy?.focus
  const block = window.bardy?.block
  const [enabled, setEnabled] = useState(false)
  const [blockedSites, setBlockedSites] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!focus) return
    let current = true
    void focus.getStatus().then((status) => {
      if (!current) return
      setEnabled(status.enabled)
      setBlockedSites(status.blockedSites)
    })
    return () => {
      current = false
    }
  }, [focus])

  useEffect(() => {
    if (!focus) return
    return focus.onDistraction(({ site }) => {
      setToast(`${site} was closed and blocked.`)
      setTimeout(() => setToast(null), 4000)
    })
  }, [focus])

  if (!focus || !block) return null // plain browser preview, no desktop shell

  async function toggle(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      if (!enabled) {
        const confirmed = await block.confirm(blockedSites.join(', '))
        if (!confirmed) {
          setBusy(false)
          return
        }
      }
      const result = await focus.set(!enabled)
      setEnabled(result.enabled)
      if (!result.ok && result.error) setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const Icon = enabled ? ShieldCheck : Shield
  const title = enabled
    ? 'Focus Mode is on. Social media and YouTube are blocked. Click to turn off.'
    : 'Turn on Focus Mode to block social media and YouTube during study sessions.'

  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        title={title}
        aria-label="Focus Mode"
        aria-pressed={enabled}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-control border-2 border-b-4 border-border bg-surface px-3 py-2.5 text-sm font-extrabold tracking-[0.053em] text-fg-muted uppercase hover:bg-surface-2 aria-pressed:border-danger/50 aria-pressed:bg-danger-wash aria-pressed:text-danger disabled:cursor-not-allowed disabled:opacity-60 wide:justify-start"
      >
        {busy ? (
          <Loader2 {...ICON} size={18} className="shrink-0 animate-spin" />
        ) : (
          <Icon {...ICON} size={18} className="shrink-0" />
        )}
        <span className="hidden wide:inline">{enabled ? 'Focus Mode: On' : 'Focus Mode'}</span>
      </button>
      {error && (
        <p role="alert" className="hidden text-[11px] leading-snug text-danger wide:block">
          {error}
        </p>
      )}
      {toast && (
        <p role="status" className="hidden text-[11px] leading-snug text-fg-muted wide:block">
          {toast}
        </p>
      )}
    </div>
  )
}
