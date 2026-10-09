import { useLayoutEffect, useRef, useState } from "react";

import { type Deck, type StudyDocument } from "../data";
import { useResource } from "../data/use-resource";
import { api } from "../data";
import { useNavigation } from "../shell/navigation";
import { Button } from "../ui/Button";
import { DocumentPicker } from "../ui/DocumentPicker";
import { EmptyState } from "../ui/EmptyState";
import { Pill } from "../ui/Pill";
import { ResourceView } from "../ui/ResourceView";
import { ScreenHeader } from "../ui/ScreenHeader";
import { Skeleton } from "../ui/Skeleton";
import { Tabs } from "../ui/Tabs";
import { NotesPanel } from "./NotesPanel";
import {
  NOTES_SPLIT_THRESHOLD,
  clampNotesWidth,
  notesDefaultWidth,
  notesWidthForPointer,
} from "./notes-panel-width";

function loadNotesWidth(containerWidth: number): number {
  try {
    const n = Number(localStorage.getItem("bardy:notes-w"));
    if (n > 0) return clampNotesWidth(n, containerWidth);
  } catch {
    // fall through to default
  }
  return notesDefaultWidth(containerWidth);
}

type View = "summary" | "original";

function Highlighted({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}): React.JSX.Element {
  const at = text.indexOf(highlight);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm border-b-2 border-warning bg-warning-wash px-0.5 text-inherit">
        {highlight}
      </mark>
      {text.slice(at + highlight.length)}
    </>
  );
}

function DocumentView({ doc }: { doc: StudyDocument }): React.JSX.Element {
  const { navigate } = useNavigation();
  const [view, setView] = useState<View>("summary");
  const summary = doc.summary;
  const decks = useResource<Deck[]>(() => api.listDecks(), [doc.id]);
  const deckId =
    decks.status === "ready"
      ? decks.data.find((d) => d.sourceDocumentId === doc.id)?.id
      : undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [notesWidth, setNotesWidth] = useState(() => notesDefaultWidth(900));
  const [dragging, setDragging] = useState(false);
  const initialized = useRef(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setContainerWidth(width);
      if (!initialized.current && width > 0) {
        initialized.current = true;
        setNotesWidth(loadNotesWidth(width));
      } else {
        setNotesWidth((w) => clampNotesWidth(w, width));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isSplit = containerWidth >= NOTES_SPLIT_THRESHOLD;

  const saveNotesWidth = (w: number): void => {
    try {
      localStorage.setItem("bardy:notes-w", String(w));
    } catch {
      // preference just isn't remembered
    }
  };
  const startDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setNotesWidth(notesWidthForPointer(e.clientX - rect.left, containerWidth));
  };
  const endDrag = (): void => {
    if (!dragging) return;
    setDragging(false);
    saveNotesWidth(notesWidth);
  };

  return (
    <div
      ref={containerRef}
      className="grid min-h-full"
      style={
        isSplit
          ? {
              height: "100%",
              gridTemplateColumns: `minmax(0,1fr) ${notesWidth}px`,
              transition: dragging ? "none" : "grid-template-columns 150ms ease-out",
            }
          : undefined
      }
    >
      <div className="grid content-start gap-5 overflow-y-auto px-8 pt-7 pb-12">
        <div>
          <Button
            variant="secondary"
            onClick={() => navigate({ screen: "ask" })}
          >
            ← All documents
          </Button>
        </div>
        <ScreenHeader
          eyebrow={`${doc.fileName} · ${doc.pageCount} pages`}
          title={doc.title}
          actions={
            summary && (
              <>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate({ screen: "quiz", documentId: doc.id })
                  }
                >
                  Quiz me
                </Button>
                <Button
                  disabled={!deckId}
                  onClick={() => navigate({ screen: "cards", deckId })}
                >
                  Study {doc.cardCount} cards
                </Button>
              </>
            )
          }
        />
        {!summary ? (
          <EmptyState
            awake={false}
            title="Still reading this PDF"
            body={`Bardy is on page ${doc.processing?.currentPage ?? 1} of ${doc.pageCount}. The summary opens when it's done.`}
            action={
              <Button
                variant="secondary"
                onClick={() => navigate({ screen: "library" })}
              >
                Back to library
              </Button>
            }
          />
        ) : (
          <>
            <Tabs<View>
              label="Document view"
              value={view}
              onChange={setView}
              items={[
                { id: "summary", label: "Summary" },
                { id: "original", label: "Original" },
              ]}
            />
            {view === "summary" ? (
              <div className="grid max-w-[72ch] gap-3">
                <p className="text-[13px] text-fg-muted">
                  Generated on this computer from {doc.pageCount} pages ·{" "}
                  {summary.readMinutes} min read
                </p>
                <h2 className="font-display text-[22px] font-black">
                  Key ideas
                </h2>
                <ul className="grid list-disc gap-2 pl-5">
                  {summary.keyIdeas.map((idea) => (
                    <li key={idea.text}>
                      {idea.text}{" "}
                      <span className="rounded-md border-2 border-link/50 px-1.5 py-0.5 align-[2px] text-[11px] font-extrabold whitespace-nowrap text-link">
                        p. {idea.page}
                      </span>
                    </li>
                  ))}
                </ul>
                <h2 className="font-display text-[22px] font-black">
                  Likely exam terms
                </h2>
                <div className="flex flex-wrap gap-2">
                  {summary.examTerms.map((term) => (
                    <Pill key={term}>{term}</Pill>
                  ))}
                </div>
              </div>
            ) : (
              <article className="grid max-w-[72ch] gap-3.5 rounded-card border-2 border-border p-7 leading-relaxed">
                <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">
                  Page {summary.excerpt.page}
                </span>
                <h2 className="font-display text-[22px] font-black">
                  {summary.excerpt.heading}
                </h2>
                {summary.excerpt.paragraphs.map((p) => (
                  <p key={p}>
                    <Highlighted
                      text={p}
                      highlight={summary.excerpt.highlight}
                    />
                  </p>
                ))}
              </article>
            )}
          </>
        )}
      </div>

      {/* ── Right: notes ── */}
      {isSplit ? (
        <div className="relative min-h-0">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize notes panel"
            onPointerDown={startDrag}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize hover:bg-link/40 active:bg-link/60"
          />
          <NotesPanel documentId={doc.id} stacked={false} />
        </div>
      ) : (
        <NotesPanel documentId={doc.id} stacked />
      )}
    </div>
  );
}

export function AskScreen(): React.JSX.Element {
  const { route, navigate } = useNavigation();
  const requestedId = route.screen === "ask" ? route.documentId : undefined;
  const documents = useResource<StudyDocument[]>(() => api.listDocuments(), []);

  if (!requestedId) {
    return (
      <DocumentPicker
        title="Ask your notes"
        body="Pick a document to read, summarize, and take notes on."
        onSelect={(doc) => navigate({ screen: "ask", documentId: doc.id })}
      />
    );
  }

  return (
    <ResourceView
      resource={documents}
      loading={
        <div className="grid gap-4 px-8 pt-7">
          <Skeleton className="h-16" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      }
      isEmpty={(list) => list.length === 0}
      empty={
        <div className="px-8">
          <EmptyState
            title="Nothing to take notes on yet"
            body="Add a PDF to your library, then use Notes to annotate it."
            action={
              <Button onClick={() => navigate({ screen: "library" })}>
                Go to library
              </Button>
            }
          />
        </div>
      }
    >
      {(list) => {
        const doc = list.find((d) => d.id === requestedId) ?? list[0];
        return <DocumentView key={doc.id} doc={doc} />;
      }}
    </ResourceView>
  );
}
