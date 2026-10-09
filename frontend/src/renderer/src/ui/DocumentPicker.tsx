import { BookOpen } from 'lucide-react'

import { api, type StudyDocument } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { ICON } from './icon'
import { PAGE } from './page'
import { Pill } from './Pill'
import { ResourceView } from './ResourceView'
import { ScreenHeader } from './ScreenHeader'
import { Skeleton } from './Skeleton'

interface Props {
  title: string
  body: string
  onSelect: (doc: StudyDocument) => void
}

export function DocumentPicker({ title, body, onSelect }: Props): React.JSX.Element {
  const { navigate } = useNavigation()
  const documents = useResource<StudyDocument[]>(() => api.listDocuments(), [])

  return (
    <div className={PAGE}>
      <ScreenHeader eyebrow="Choose a document" title={title} />
      <p className="text-[15px] text-fg-muted">{body}</p>
      <ResourceView
        resource={documents}
        loading={
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)}
          </div>
        }
        isEmpty={(list) => list.filter((d) => d.summary !== null && d.processing === null).length === 0}
        empty={
          <EmptyState
            title="No documents yet"
            body="Import a PDF first, then come back to get started."
            action={<Button onClick={() => navigate({ screen: 'library' })}>Go to Library</Button>}
          />
        }
      >
        {(list) => {
          const ready = list.filter((d) => d.summary !== null && d.processing === null)
          return (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {ready.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelect(doc)}
                  className="grid content-start gap-3 rounded-card border-2 border-b-4 border-border bg-surface p-5 text-left transition-colors hover:border-link/50 hover:bg-link/5 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen {...ICON} size={20} className="mt-0.5 shrink-0 text-primary" />
                    <span className="font-extrabold leading-tight break-words">{doc.title}</span>
                  </div>
                  <span className="text-[13px] text-fg-muted line-clamp-1">{doc.fileName}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill tone="brand">{doc.cardCount} cards</Pill>
                    <span className="text-[13px] text-fg-muted">{doc.pageCount} pages</span>
                  </div>
                </button>
              ))}
            </div>
          )
        }}
      </ResourceView>
    </div>
  )
}
