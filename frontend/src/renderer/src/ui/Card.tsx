import type { ReactNode } from 'react'

export function Card({
  as: Tag = 'section',
  className = '',
  children
}: {
  as?: 'section' | 'div' | 'article'
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <Tag
      className={`grid min-w-0 content-start gap-3.5 rounded-card border-2 border-border bg-surface p-5 ${className}`}
    >
      {children}
    </Tag>
  )
}
