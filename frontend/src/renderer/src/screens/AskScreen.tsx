import { useState } from 'react'

import { api, type Deck, type StudyDocument } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Pill } from '../ui/Pill'
import { ResourceView } from '../ui/ResourceView'
import { ScreenHeader } from '../ui/ScreenHeader'
import { Skeleton } from '../ui/Skeleton'
import { Tabs } from '../ui/Tabs'
import { ChatPanel } from './ChatPanel'

type View = 'summary' | 'original'

function Highlighted({ text, highlight }: { text: string; highlight: string }): React.JSX.Element {
  const at = text.indexOf(highlight)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm border-b-2 border-warning bg-warning-wash px-0.5 text-inherit">{highlight}</mark>
      {text.slice(at + highlight.length)}
    </>
  )
}

function DocumentView({ doc }: { doc: StudyDocument }): React.JSX.Element {
  const { navigate } = useNavigation()
  const [view, setView] = useState<View>('summary')
  const summary = doc.summary
  const decks = useResource<Deck[]>(() => api.listDecks(), [doc.id])
  const deckId = decks.status === 'ready' ? decks.data.find((d) => d.sourceDocumentId === doc.id)?.id : undefined

  return (
    <div className="grid min-h-full mid:h-full mid:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-5 overflow-y-auto px-8 pt-7 pb-12">
        <ScreenHeader
          eyebrow={`${doc.fileName} · ${doc.pageCount} pages`}
          title={doc.title}
          actions={summary && (
            <>
              <Button variant="secondary" onClick={() => navigate({ screen: 'quiz', documentId: doc.id })}>Quiz me</Button>
              <Button disabled={!deckId} onClick={() => navigate({ screen: 'cards', deckId })}>Study {doc.cardCount} cards</Button>
            </>
          )}
        />
        {!summary ? (
          <EmptyState awake={false} title="Still reading this PDF" body={`BARDHIE is on page ${doc.processing?.currentPage ?? 1} of ${doc.pageCount}. The summary and chat open when it’s done.`} action={<Button variant="secondary" onClick={() => navigate({ screen: 'library' })}>Back to library</Button>} />
        ) : (
          <>
            <Tabs<View> label="Document view" value={view} onChange={setView} items={[{ id: 'summary', label: 'Summary' }, { id: 'original', label: 'Original' }]} />
            {view === 'summary' ? (
              <div className="grid max-w-[72ch] gap-3">
                <p className="text-[13px] text-fg-muted">Generated on this computer from {doc.pageCount} pages · {summary.readMinutes} min read</p>
                <h2 className="font-display text-[22px] font-black">Key ideas</h2>
                <ul className="grid list-disc gap-2 pl-5">
                  {summary.keyIdeas.map((idea) => (
                    <li key={idea.text}>{idea.text} <span className="rounded-md border-2 border-link/50 px-1.5 py-0.5 align-[2px] text-[11px] font-extrabold whitespace-nowrap text-link">p. {idea.page}</span></li>
                  ))}
                </ul>
                <h2 className="font-display text-[22px] font-black">Likely exam terms</h2>
                <div className="flex flex-wrap gap-2">{summary.examTerms.map((term) => <Pill key={term}>{term}</Pill>)}</div>
              </div>
            ) : (
              <article className="grid max-w-[72ch] gap-3.5 rounded-card border-2 border-border p-7 leading-relaxed">
                <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">Page {summary.excerpt.page}</span>
                <h2 className="font-display text-[22px] font-black">{summary.excerpt.heading}</h2>
                {summary.excerpt.paragraphs.map((p) => <p key={p}><Highlighted text={p} highlight={summary.excerpt.highlight} /></p>)}
              </article>
            )}
          </>
        )}
      </div>
      {summary && <ChatPanel documentId={doc.id} documentTitle={doc.title} />}
    </div>
  )
}

export function AskScreen(): React.JSX.Element {
  const { route, navigate } = useNavigation()
  const requestedId = route.screen === 'ask' ? route.documentId : undefined
  const documents = useResource<StudyDocument[]>(() => api.listDocuments(), [])

  return (
    <ResourceView
      resource={documents}
      loading={<div className="grid gap-4 px-8 pt-7"><Skeleton className="h-16" /><Skeleton className="h-64 rounded-card" /></div>}
      isEmpty={(list) => list.length === 0}
      empty={<div className="px-8"><EmptyState title="Nothing to ask about yet" body="Add a PDF to your library, then ask BARDHIE anything about it." action={<Button onClick={() => navigate({ screen: 'library' })}>Go to library</Button>} /></div>}
    >
      {(list) => {
        const doc = list.find((d) => d.id === requestedId) ?? list.find((d) => d.summary !== null) ?? list[0]
        return <DocumentView key={doc.id} doc={doc} />
      }}
    </ResourceView>
  )
}
