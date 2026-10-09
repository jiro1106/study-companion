import { Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import { api, toApiError, type StudyDocument } from '../data'
import { useResource } from '../data/use-resource'
import { PAGE } from '../ui/page'
import { useNavigation } from '../shell/navigation'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { ICON } from '../ui/icon'
import { Pill } from '../ui/Pill'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { ScreenHeader } from '../ui/ScreenHeader'
import { Skeleton } from '../ui/Skeleton'

function DocumentCard({ doc, onOpen, onDelete }: { doc: StudyDocument; onOpen: () => void; onDelete: () => Promise<void> }): React.JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const processing = doc.processing

  return (
    <article className="grid content-start gap-2.5 rounded-card border-2 border-b-4 border-border bg-surface p-4">
      <button type="button" disabled={processing !== null} onClick={onOpen} className="grid cursor-pointer gap-2.5 text-left disabled:cursor-default">
        <div aria-hidden className="grid h-24 content-start gap-1.5 rounded-[10px] border-2 border-border bg-surface-2 p-3">
          <i className="block h-2 w-3/5 rounded bg-fg-faint" />
          <i className="block h-1.5 rounded bg-border" />
          <i className="block h-1.5 w-4/5 rounded bg-border" />
          <i className="block h-1.5 rounded bg-border" />
        </div>
        <div className="font-extrabold leading-tight break-words">{doc.fileName}</div>
      </button>
      {processing ? (
        <>
          <div className="flex items-center gap-2 text-[13px] font-bold text-fg-muted">
            <span className="size-3.5 animate-spin rounded-full border-[3px] border-border border-t-primary" aria-hidden />
            Reading page {processing.currentPage} of {doc.pageCount}…
          </div>
          <ProgressBar size="sm" value={processing.currentPage / doc.pageCount} label={`Reading ${doc.fileName}`} />
          <Button variant="ghost" disabled={deleting} onClick={async () => { setDeleting(true); await onDelete() }}>Cancel</Button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Pill tone="brand">{doc.cardCount} cards</Pill>
          <span className="text-[13px] text-fg-muted">{doc.pageCount} pages</span>
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${doc.fileName}`} className="ml-auto cursor-pointer rounded-control p-2 text-fg-faint hover:bg-surface-2 hover:text-danger">
            <Trash2 {...ICON} size={18} />
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Delete ${doc.fileName}?`}
        body="This also deletes its decks, quiz, and chat."
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => { setDeleting(true); await onDelete() }}
      />
    </article>
  )
}

export function LibraryScreen(): React.JSX.Element {
  const { navigate } = useNavigation()
  const documents = useResource<StudyDocument[]>(() => api.listDocuments(), [])
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function deleteDocument(id: string): Promise<void> {
    setDeleteError(null)
    try {
      await api.deleteDocument(id)
    } catch (e) {
      setDeleteError(toApiError(e).message)
    } finally {
      documents.reload()
    }
  }

  return (
    <div className={PAGE}>
      <ScreenHeader eyebrow="Library" title="Your study material" />
      <div className="grid justify-items-center gap-2.5 rounded-[20px] border-2 border-dashed border-border-strong bg-surface-2 p-7 text-center">
        <Upload {...ICON} size={44} className="text-primary" />
        <b className="text-lg">Drop a PDF here</b>
        <p className="max-w-[52ch] text-[13px] text-fg-muted">Lecture slides, readings, or your own notes. Bardy reads them on this computer and makes a summary, flashcards, and quizzes.</p>
        <Button disabled title="PDF import arrives with the study engine">Choose file</Button>
        <span className="text-[12px] text-fg-faint">Importing PDFs arrives with the study engine.</span>
      </div>
      {deleteError && <p role="alert" className="rounded-control bg-danger-wash px-3.5 py-2.5 text-[14px]">{deleteError}</p>}
      <ResourceView
        resource={documents}
        loading={<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-card" />)}</div>}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState title="Your library is empty" body="PDFs you add show up here, ready to turn into cards and quizzes." />}
      >
        {(list) => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {list.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onOpen={() => navigate({ screen: 'ask', documentId: doc.id })} onDelete={() => deleteDocument(doc.id)} />
            ))}
          </div>
        )}
      </ResourceView>
    </div>
  )
}
