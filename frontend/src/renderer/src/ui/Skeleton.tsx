export function Skeleton({ className = '' }: { className?: string }): React.JSX.Element {
  return <div aria-hidden className={`animate-pulse rounded-control bg-surface-2 ${className}`} />
}
