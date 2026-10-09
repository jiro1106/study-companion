const heights = { sm: 'h-2.5', md: 'h-3.5', lg: 'h-4' }

export function ProgressBar({
  value,
  label,
  size = 'md'
}: {
  value: number
  label: string
  size?: keyof typeof heights
}): React.JSX.Element {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`overflow-hidden rounded-full bg-border ${heights[size]}`}
    >
      <div
        className="relative h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      >
        <span className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-on-primary/35" />
      </div>
    </div>
  )
}
