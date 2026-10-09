import type { ReactNode } from 'react'

export function ScreenHeader({
  eyebrow,
  title,
  actions
}: {
  eyebrow?: string
  title: ReactNode
  actions?: ReactNode
}): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[34px] leading-tight font-black tracking-[-0.02em] text-balance text-fg">
          {title}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  )
}
