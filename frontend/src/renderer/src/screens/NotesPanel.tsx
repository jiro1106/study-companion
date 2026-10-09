/**
 * NotesPanel — rich note-taking sidebar for the document view.
 *
 * Text and drawing coexist on the same notebook surface: a contenteditable
 * layer holds the typed notes, and a canvas sits on top of it covering the
 * full scrollable height. The Write/Draw toggle only changes which layer
 * receives pointer input — typed notes stay visible under ink, and ink
 * stays visible over notes, at the same time.
 *
 * Notes are persisted to localStorage keyed by documentId so each document
 * keeps its own notebook. The canvas is saved as a PNG data-URL.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type NoteMode = 'write' | 'draw'
type DrawTool = 'pen' | 'highlighter' | 'eraser'

interface DrawColor {
  id: string
  value: string
  label: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DRAW_COLORS: DrawColor[] = [
  { id: 'white', value: '#e2e8f0', label: 'White' },
  { id: 'red', value: '#f87171', label: 'Red' },
  { id: 'blue', value: '#60a5fa', label: 'Blue' },
  { id: 'green', value: '#4ade80', label: 'Green' },
  { id: 'orange', value: '#fb923c', label: 'Orange' },
  { id: 'yellow', value: '#facc15', label: 'Yellow' },
]

const STROKE_SIZES = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
]

const HIGHLIGHT_COLORS = [
  { id: 'yellow', css: '#fef08a', label: 'Yellow' },
  { id: 'green', css: '#bbf7d0', label: 'Green' },
  { id: 'pink', css: '#fbcfe8', label: 'Pink' },
  { id: 'blue', css: '#bfdbfe', label: 'Blue' },
  { id: 'none', css: 'transparent', label: 'Remove' },
]

// ── Storage helpers ───────────────────────────────────────────────────────────

function textKey(docId: string): string {
  return `bardy:notes:text:${docId}`
}

function drawKey(docId: string): string {
  return `bardy:notes:draw:${docId}`
}

function loadText(docId: string): string {
  try { return localStorage.getItem(textKey(docId)) ?? '' } catch { return '' }
}

function saveText(docId: string, html: string): void {
  try { localStorage.setItem(textKey(docId), html) } catch { /* ignore */ }
}

function loadDraw(docId: string): string | null {
  try { return localStorage.getItem(drawKey(docId)) } catch { return null }
}

function saveDraw(docId: string, dataUrl: string): void {
  try { localStorage.setItem(drawKey(docId), dataUrl) } catch { /* ignore */ }
}

function clearDraw(docId: string): void {
  try { localStorage.removeItem(drawKey(docId)) } catch { /* ignore */ }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function canvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
  const rect = e.currentTarget.getBoundingClientRect()
  const scaleX = e.currentTarget.width / rect.width
  const scaleY = e.currentTarget.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

function restoreCanvas(canvas: HTMLCanvasElement, dataUrl: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
  }
  img.src = dataUrl
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  active = false,
  title,
  children,
  className = '',
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'flex size-[26px] items-center justify-center rounded text-[12px] font-bold transition-colors',
        active
          ? 'bg-link text-white'
          : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        className,
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </button>
  )
}

function Sep(): React.JSX.Element {
  return <div className="h-4 w-px shrink-0 bg-border" />
}

// ── SVG icon atoms ────────────────────────────────────────────────────────────

const IconBold = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h8a4 4 0 1 1 0 8H6zm0 8h9a4 4 0 1 1 0 8H6z" />
  </svg>
)
const IconItalic = () => (
  <svg width="10" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 4h10v2H11zm-2 14H9v2h10v-2h-2l3-12h2V4H12v2h2L11 18z" />
  </svg>
)
const IconUnderline = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 3v7a6 6 0 0 0 12 0V3" /><line x1="4" y1="21" x2="20" y2="21" />
  </svg>
)
const IconStrike = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="12" x2="20" y2="12" />
    <path d="M16 6C16 6 14.5 4 12 4s-5 1.5-5 4c0 2 1.5 3 3.5 3.5" />
    <path d="M8 18c0 0 1.5 2 4 2s5-1.5 5-4c0-2-1.5-3-3.5-3.5" />
  </svg>
)
const IconBullet = () => (
  <svg width="13" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="1.5" fill="currentColor" /><circle cx="4" cy="12" r="1.5" fill="currentColor" /><circle cx="4" cy="18" r="1.5" fill="currentColor" />
  </svg>
)
const IconOrdered = () => (
  <svg width="13" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
    <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none">1.</text>
    <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2.</text>
    <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3.</text>
  </svg>
)
const IconPen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
)
const IconHighlighter = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.5 3.5L7 14H4v-3L12 2z" /><path d="M4 21h16" /><path d="M9 15l-3 3" />
  </svg>
)
const IconEraser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16l10-10 7 7-3 4" /><path d="M3.5 16.5L7 20" />
  </svg>
)

// ── Main component ────────────────────────────────────────────────────────────

export function NotesPanel({
  documentId,
  stacked = false,
}: {
  documentId: string
  /** True when the panel renders full-width below the document instead of beside it. */
  stacked?: boolean
}): React.JSX.Element {
  const [mode, setMode] = useState<NoteMode>('write')

  // Shared notebook surface (scrollable container holding both layers)
  const notebookRef = useRef<HTMLDivElement>(null)

  // Write layer
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

  // Draw layer
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawTool, setDrawTool] = useState<DrawTool>('pen')
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0].value)
  const [strokeSize, setStrokeSize] = useState(STROKE_SIZES[1].value)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  // ── Canvas sizing: always covers the notebook's full scrollable height ────

  /**
   * Resize the canvas to match the notebook's current content size, preserving ink.
   *
   * Uses getImageData/putImageData (synchronous) rather than toDataURL/Image.onload
   * (asynchronous) — resize events fire rapidly while the panel is being dragged, and
   * an async round-trip lets a later resize snapshot the canvas before an earlier
   * restore has finished painting, wiping the drawing out.
   */
  const syncCanvasSize = useCallback(() => {
    const notebook = notebookRef.current
    const canvas = canvasRef.current
    if (!notebook || !canvas) return

    const width = notebook.clientWidth
    const height = Math.max(notebook.scrollHeight, notebook.clientHeight)
    if (width === 0 || height === 0) return
    if (canvas.width === width && canvas.height === height) return

    const ctx = canvas.getContext('2d')
    const hadContent = ctx && canvas.width > 0 && canvas.height > 0
    const snapshot = hadContent ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null

    canvas.width = width
    canvas.height = height
    canvas.style.height = `${height}px`

    if (snapshot && ctx) {
      ctx.putImageData(snapshot, 0, 0)
    }
  }, [])

  // ── Load both layers fresh whenever the document changes ──────────────────

  useLayoutEffect(() => {
    const editor = editorRef.current
    const notebook = notebookRef.current
    const canvas = canvasRef.current
    if (!editor || !notebook || !canvas) return

    editor.innerHTML = loadText(documentId)
    setIsEmpty(editor.textContent?.trim() === '')

    const width = notebook.clientWidth || 1
    const height = Math.max(notebook.scrollHeight, notebook.clientHeight, 1)
    canvas.width = width
    canvas.height = height
    canvas.style.height = `${height}px`
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)

    const saved = loadDraw(documentId)
    if (saved) restoreCanvas(canvas, saved)
  }, [documentId])

  // Keep the canvas matched to the notebook size as the panel is resized.
  useEffect(() => {
    const notebook = notebookRef.current
    if (!notebook) return
    const ro = new ResizeObserver(() => syncCanvasSize())
    ro.observe(notebook)
    return () => ro.disconnect()
  }, [syncCanvasSize])

  // ── Write: persistence ─────────────────────────────────────────────────────

  const flushSave = useCallback(() => {
    if (!editorRef.current) return
    saveText(documentId, editorRef.current.innerHTML)
  }, [documentId])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(flushSave, 400)
  }, [flushSave])

  const handleInput = useCallback(() => {
    // The placeholder must vanish the instant a character is typed, not after
    // the save debounce settles — update it synchronously on every keystroke.
    setIsEmpty(editorRef.current?.textContent?.trim() === '')
    scheduleSave()
    // Typed content can grow/shrink the notebook's height immediately.
    syncCanvasSize()
  }, [scheduleSave, syncCanvasSize])

  // Detect active formats on selection change
  useEffect(() => {
    const update = (): void => {
      if (document.activeElement !== editorRef.current) return
      setActiveFormats(new Set([
        document.queryCommandState('bold') ? 'bold' : '',
        document.queryCommandState('italic') ? 'italic' : '',
        document.queryCommandState('underline') ? 'underline' : '',
        document.queryCommandState('strikeThrough') ? 'strikethrough' : '',
      ].filter(Boolean)))
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [])

  // ── Write: toolbar commands ───────────────────────────────────────────────

  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value ?? undefined)
    scheduleSave()
    syncCanvasSize()
  }, [scheduleSave, syncCanvasSize])

  const applyHighlight = useCallback((color: string) => {
    editorRef.current?.focus()
    document.execCommand('hiliteColor', false, color)
    scheduleSave()
  }, [scheduleSave])

  // ── Mode switch: hand pointer input to the right layer ────────────────────

  const switchMode = useCallback((next: NoteMode) => {
    if (next === 'draw') editorRef.current?.blur()
    setMode(next)
  }, [])

  // ── Draw: events ──────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    isDrawingRef.current = true
    lastPosRef.current = canvasPos(e)
  }, [])

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !lastPosRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const pos = canvasPos(e)
      const prev = lastPosRef.current

      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(pos.x, pos.y)

      if (drawTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = strokeSize * 6
        ctx.strokeStyle = 'rgba(0,0,0,1)'
      } else if (drawTool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineWidth = strokeSize * 5
        ctx.strokeStyle = `${drawColor}55` // ~33% opacity
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineWidth = strokeSize
        ctx.strokeStyle = drawColor
      }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      lastPosRef.current = pos
    },
    [drawTool, drawColor, strokeSize],
  )

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPosRef.current = null
    const canvas = canvasRef.current
    if (canvas) saveDraw(documentId, canvas.toDataURL())
  }, [documentId])

  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    clearDraw(documentId)
  }, [documentId])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside
      className={[
        'flex min-h-[420px] flex-col border-border',
        stacked ? 'border-t-2' : 'h-full min-h-0 border-l-2',
      ].join(' ')}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
        <b className="font-display text-[15px] font-black">Notes</b>
        <div className="flex overflow-hidden rounded-[8px] border-2 border-border">
          {(['write', 'draw'] as NoteMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              title={m === 'write' ? 'Type notes' : 'Draw over your notes'}
              className={[
                'px-3 py-[5px] text-[12px] font-bold capitalize transition-colors',
                mode === m
                  ? 'bg-link text-white'
                  : 'bg-transparent text-fg-muted hover:text-fg',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar (contextual to the active input mode) ── */}
      {mode === 'write' ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border/60 bg-surface px-3 py-1.5">
          {/* Text formatting */}
          <ToolbarBtn active={activeFormats.has('bold')} onClick={() => exec('bold')} title="Bold (Ctrl+B)">
            <IconBold />
          </ToolbarBtn>
          <ToolbarBtn active={activeFormats.has('italic')} onClick={() => exec('italic')} title="Italic (Ctrl+I)">
            <IconItalic />
          </ToolbarBtn>
          <ToolbarBtn active={activeFormats.has('underline')} onClick={() => exec('underline')} title="Underline (Ctrl+U)">
            <IconUnderline />
          </ToolbarBtn>
          <ToolbarBtn active={activeFormats.has('strikethrough')} onClick={() => exec('strikeThrough')} title="Strikethrough">
            <IconStrike />
          </ToolbarBtn>
          <Sep />

          {/* Headings */}
          <ToolbarBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1" className="text-[11px]">H1</ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2" className="text-[11px]">H2</ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'h3')} title="Heading 3" className="text-[11px]">H3</ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Normal text" className="text-[11px]">¶</ToolbarBtn>
          <Sep />

          {/* Lists */}
          <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Bullet list">
            <IconBullet />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Numbered list">
            <IconOrdered />
          </ToolbarBtn>
          <Sep />

          {/* Highlight colours */}
          {HIGHLIGHT_COLORS.map((hc) => (
            hc.id === 'none' ? (
              <ToolbarBtn
                key={hc.id}
                onClick={() => applyHighlight('transparent')}
                title="Remove highlight"
                className="text-[11px] text-fg-faint"
              >
                ✕
              </ToolbarBtn>
            ) : (
              <button
                key={hc.id}
                type="button"
                title={`${hc.label} highlight`}
                onClick={() => applyHighlight(hc.css)}
                style={{ backgroundColor: hc.css }}
                className="size-[18px] rounded-[4px] border-2 border-border/70 transition-transform hover:scale-110"
              />
            )
          ))}
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 bg-surface px-3 py-1.5">
          {/* Tools */}
          <ToolbarBtn active={drawTool === 'pen'} onClick={() => setDrawTool('pen')} title="Pen">
            <IconPen />
          </ToolbarBtn>
          <ToolbarBtn active={drawTool === 'highlighter'} onClick={() => setDrawTool('highlighter')} title="Highlighter">
            <IconHighlighter />
          </ToolbarBtn>
          <ToolbarBtn active={drawTool === 'eraser'} onClick={() => setDrawTool('eraser')} title="Eraser">
            <IconEraser />
          </ToolbarBtn>
          <Sep />

          {/* Colours */}
          {DRAW_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => setDrawColor(c.value)}
              style={{ backgroundColor: c.value }}
              className={[
                'size-[18px] rounded-full border-2 transition-transform hover:scale-110',
                drawColor === c.value ? 'scale-125 border-white' : 'border-border/50',
              ].join(' ')}
            />
          ))}
          <Sep />

          {/* Stroke sizes */}
          {STROKE_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              title={s.label}
              onClick={() => setStrokeSize(s.value)}
              className={[
                'flex size-[26px] items-center justify-center rounded transition-colors',
                strokeSize === s.value ? 'bg-surface-2' : 'hover:bg-surface-2',
              ].join(' ')}
            >
              <div
                style={{
                  width: Math.min(s.value * 2.5, 14),
                  height: Math.min(s.value * 2.5, 14),
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                }}
              />
            </button>
          ))}
          <Sep />

          <button
            type="button"
            onClick={handleClearCanvas}
            title="Clear drawing"
            className="ml-auto rounded px-2 py-[3px] text-[11px] font-bold text-fg-muted hover:text-danger"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Notebook surface: text + drawing layered together ── */}
      <div className="relative min-h-0 flex-1">
        <div ref={notebookRef} className="relative h-full overflow-y-auto">
          {isEmpty && (
            <p
              className="pointer-events-none absolute inset-0 z-0 px-5 py-4 text-[14px] text-fg-faint"
              aria-hidden
            >
              Start typing your notes here…
            </p>
          )}

          {/* Write layer */}
          <div
            ref={editorRef}
            contentEditable={mode === 'write'}
            suppressContentEditableWarning
            spellCheck
            onInput={handleInput}
            onPaste={(e) => {
              // Paste as plain text to avoid importing foreign HTML styles
              e.preventDefault()
              const text = e.clipboardData.getData('text/plain')
              document.execCommand('insertText', false, text)
            }}
            className={[
              'relative z-0 min-h-full px-5 py-4 text-[14px] leading-relaxed outline-none',
              '[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:font-display [&_h1]:text-[20px] [&_h1]:font-black',
              '[&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-[17px] [&_h2]:font-bold',
              '[&_h3]:mb-1 [&_h3]:mt-2.5 [&_h3]:font-display [&_h3]:text-[15px] [&_h3]:font-bold',
              '[&_ul]:list-disc [&_ul]:pl-5',
              '[&_ol]:list-decimal [&_ol]:pl-5',
              '[&_li]:mb-0.5',
              '[&_a]:text-link [&_a]:underline',
              '[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-fg-muted',
            ].join(' ')}
          />

          {/* Draw layer: transparent canvas covering the full notebook height */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 z-10 w-full"
            style={{
              pointerEvents: mode === 'draw' ? 'auto' : 'none',
              cursor: mode === 'draw' ? (drawTool === 'eraser' ? 'cell' : 'crosshair') : 'default',
              touchAction: 'none',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
          />
        </div>

        {/* Status badge: pinned to the panel, not the scrolling content */}
        {mode === 'draw' && (
          <span className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] whitespace-nowrap text-white/70">
            {drawTool === 'eraser' ? 'Eraser active' : `${drawTool} · ${DRAW_COLORS.find((c) => c.value === drawColor)?.label}`}
          </span>
        )}
      </div>
    </aside>
  )
}
