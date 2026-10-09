import { usePDFImport } from './hooks/usePDFImport'
import { useStudyTimer } from './hooks/useStudyTimer'
import { DocumentPanel } from './components/DocumentPanel'
import { ChatPanel } from './components/ChatPanel'
import { TimerPanel } from './components/TimerPanel'

const SIDEBAR_WIDTH = 260

export default function App(): React.JSX.Element {
  const pdfImport = usePDFImport()
  const timer = useStudyTimer()

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden'
      }}
    >
      {/* ── Left sidebar ──────────────────────────────────────────── */}
      <aside
        id="sidebar"
        style={{
          width: SIDEBAR_WIDTH,
          minWidth: SIDEBAR_WIDTH,
          background: 'var(--surface-2)',
          borderRight: '2px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '2px solid var(--border)'
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '26px',
              color: 'var(--primary)',
              letterSpacing: '-0.01em',
              margin: 0
            }}
          >
            BARDHIE
          </h1>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 'var(--text-caption)',
              color: 'var(--fg-muted)',
              fontWeight: 700
            }}
          >
            Your study companion
          </p>
        </div>

        {/* Sidebar content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <DocumentPanel
            document={pdfImport.document}
            status={pdfImport.status}
            error={pdfImport.error}
            onImport={() => void pdfImport.importPDF()}
            onClear={pdfImport.clearDocument}
          />

          <TimerPanel timer={timer} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '2px solid var(--border)',
            fontSize: 'var(--text-caption)',
            color: 'var(--fg-faint)',
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}
        >
          <span>{window.bardhie.platform}</span>
          <span>·</span>
          <span>Phase 1</span>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main
        id="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <ChatPanel document={pdfImport.document} />
      </main>
    </div>
  )
}
