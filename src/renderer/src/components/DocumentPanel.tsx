import type { StudyDocument } from '../../../shared/types'
import type { ImportStatus } from '../hooks/usePDFImport'

interface Props {
  document: StudyDocument | null
  status: ImportStatus
  error: string | null
  onImport: () => void
  onClear: () => void
}

const StatusIcon = ({ status }: { status: ImportStatus }) => {
  if (status === 'picking' || status === 'extracting') {
    return (
      <span
        className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        aria-label="Loading"
      />
    )
  }
  if (status === 'done') return <span aria-hidden>✓</span>
  if (status === 'error') return <span aria-hidden>✕</span>
  return null
}

export function DocumentPanel({ document, status, error, onImport, onClear }: Props) {
  const isLoading = status === 'picking' || status === 'extracting'

  return (
    <section
      className="card flex flex-col gap-3"
      aria-label="Lecture document"
      id="document-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '15px',
            color: 'var(--primary-ink)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}
        >
          📄 Lecture PDF
        </h2>

        {document && (
          <button
            id="clear-document-btn"
            className="btn btn-ghost btn-sm"
            onClick={onClear}
            aria-label="Remove document"
          >
            Remove
          </button>
        )}
      </div>

      {/* Empty state */}
      {!document && status !== 'error' && (
        <div
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--surface-2)'
          }}
        >
          <div style={{ fontSize: '32px' }}>📚</div>
          <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--text-body)', margin: 0 }}>
            Import a lecture PDF to give BARDHIE context for summaries and flashcards.
          </p>
          <button
            id="import-pdf-btn"
            className="btn btn-dark"
            onClick={onImport}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <StatusIcon status={status} />
                {status === 'picking' ? 'Choose file…' : 'Extracting…'}
              </>
            ) : (
              'Upload lecture PDF'
            )}
          </button>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && error && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--danger-wash)',
            border: '2px solid var(--danger)',
            borderRadius: 'var(--radius-control)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <p style={{ color: 'var(--danger-lip)', fontWeight: 700, margin: 0 }}>{error}</p>
          <button
            id="retry-import-btn"
            className="btn btn-danger btn-sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={onImport}
          >
            Try again
          </button>
        </div>
      )}

      {/* Loaded state */}
      {document && status === 'done' && (
        <div className="animate-fade-in flex flex-col gap-2">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: 'var(--primary-wash)',
              border: '2px solid var(--primary)',
              borderRadius: 'var(--radius-control)'
            }}
          >
            <span style={{ fontSize: '20px' }}>✅</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 'var(--text-body)',
                  color: 'var(--primary-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {document.name}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--fg-muted)' }}>
                {document.pageCount > 0 ? `${document.pageCount} pages · ` : ''}
                {(document.text.split(/\s+/).length).toLocaleString()} words extracted
              </p>
            </div>
          </div>

          <button
            id="replace-pdf-btn"
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={onImport}
            disabled={isLoading}
          >
            Replace
          </button>
        </div>
      )}
    </section>
  )
}
