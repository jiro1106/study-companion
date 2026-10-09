import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { STORAGE_KEY as CHAT_KEY } from '../components/floating/useSharedChat'
import { useProfile } from '../profile'
import { GoalPicker, NameField, RolePicker } from '../screens/OnboardingScreen'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ICON } from '../ui/icon'

const SECTION = 'text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase'

type Pending = 'chat' | 'reset' | null

/** Wipes everything this app keeps in storage; the reload lands on onboarding. */
function resetEverything(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('bardy:') || key === 'theme') localStorage.removeItem(key)
    }
  } finally {
    location.reload()
  }
}

export function SettingsDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  const { profile, setProfile } = useProfile()
  const [draft, setDraft] = useState(profile)
  const [pending, setPending] = useState<Pending>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setDraft(profile) // discard unsaved edits from last time
      setNotice(null)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, profile])

  const name = draft.name.trim()
  const dirty =
    name !== profile.name || draft.role !== profile.role || draft.goalMinutes !== profile.goalMinutes

  function save(): void {
    if (!name) return
    setProfile({ ...draft, name })
    setNotice('Saved.')
  }

  function confirm(): void {
    if (pending === 'reset') return resetEverything()
    try {
      localStorage.removeItem(CHAT_KEY)
      // The storage event only reaches other windows; tell this one's chat too.
      window.dispatchEvent(new StorageEvent('storage', { key: CHAT_KEY, newValue: null }))
      setNotice('Chat history cleared.')
    } catch {
      setNotice("Couldn't clear chat history.")
    }
    setPending(null)
  }

  return (
    <>
      <dialog
        ref={ref}
        onClose={onClose}
        onClick={(e) => e.target === ref.current && onClose()}
        aria-labelledby="settings-title"
        className="m-auto max-h-[calc(100%-32px)] w-[min(560px,calc(100%-32px))] overflow-y-auto rounded-[20px] border-2 border-b-[6px] border-border bg-surface text-fg backdrop:bg-scrim"
      >
        <div className="grid gap-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="settings-title" className="font-display text-2xl font-black">
              Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="cursor-pointer rounded-control p-2 text-fg-muted hover:bg-surface-2"
            >
              <X {...ICON} size={20} />
            </button>
          </div>

          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <span className={SECTION}>Profile</span>
            <NameField value={draft.name} onChange={(n) => setDraft({ ...draft, name: n })} />
            <RolePicker value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
            <span className={SECTION}>Daily goal</span>
            <GoalPicker
              value={draft.goalMinutes}
              onChange={(goalMinutes) => setDraft({ ...draft, goalMinutes })}
            />
            <div className="flex items-center justify-end gap-3">
              {notice && (
                <span role="status" className="text-sm font-bold text-fg-muted">
                  {notice}
                </span>
              )}
              <Button type="submit" disabled={!dirty || !name}>
                Save
              </Button>
            </div>
          </form>

          <div className="grid gap-3 border-t-2 border-border pt-5">
            <span className={SECTION}>Data</span>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-fg-muted">Erase your conversation with Bardy.</p>
              <Button variant="secondary" onClick={() => setPending('chat')}>
                Clear chat
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-fg-muted">Start over: erase everything and redo setup.</p>
              <Button variant="danger" onClick={() => setPending('reset')}>
                Reset Bardy
              </Button>
            </div>
          </div>
        </div>
      </dialog>

      <ConfirmDialog
        open={pending !== null}
        title={pending === 'reset' ? 'Reset Bardy?' : 'Clear chat history?'}
        body={
          pending === 'reset'
            ? 'Your profile, chat history and preferences will be erased. This cannot be undone.'
            : 'Your conversation with Bardy will be erased. This cannot be undone.'
        }
        confirmLabel={pending === 'reset' ? 'Reset' : 'Clear'}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
