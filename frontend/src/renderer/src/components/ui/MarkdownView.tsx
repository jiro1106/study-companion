import { useCallback, useMemo } from 'react'
import { marked, Renderer } from 'marked'

interface MarkdownViewProps {
  content: string
  className?: string
  isStreaming?: boolean
}

// Custom renderer: every link opens in the system browser via Electron shell.
const renderer = new Renderer()
renderer.link = ({ href, title, text }): string => {
  const safeHref = href ?? ''
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${safeHref}"${titleAttr} class="md-link" data-external="true">${text}</a>`
}

marked.use({
  renderer,
  gfm: true,
  breaks: true,
})

export default function MarkdownView({
  content,
  className = '',
  isStreaming = false,
}: MarkdownViewProps): React.JSX.Element {
  const html = useMemo(() => {
    if (!content) return ''
    try {
      return marked.parse(content) as string
    } catch {
      return content
    }
  }, [content])

  // Intercept clicks on [data-external] links and open in the system browser.
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a[data-external]') as HTMLAnchorElement | null
    if (!target) return
    e.preventDefault()
    const href = target.getAttribute('href') ?? ''
    if (!href) return
    if (window.bardy?.openExternal) {
      window.bardy.openExternal(href)
    } else {
      // Fallback for non-Electron / dev environments
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }, [])

  return (
    <div className={`markdown-content ${className}`} onClick={handleClick}>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  )
}
