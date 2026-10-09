import { useMemo } from 'react'
import { marked } from 'marked'

interface MarkdownViewProps {
  content: string
  className?: string
  isStreaming?: boolean
}

// Configure marked options for clean output
marked.setOptions({
  gfm: true,
  breaks: true
})

export default function MarkdownView({ content, className = '', isStreaming = false }: MarkdownViewProps): React.JSX.Element {
  const html = useMemo(() => {
    if (!content) return ''
    try {
      return marked.parse(content) as string
    } catch {
      return content
    }
  }, [content])

  return (
    <div className={`markdown-content ${className}`}>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  )
}
