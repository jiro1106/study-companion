export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange
}: {
  label: string
  items: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
}): React.JSX.Element {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          onClick={() => onChange(item.id)}
          className="cursor-pointer rounded-control border-2 border-border-strong px-3.5 py-2 text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase aria-selected:border-link aria-selected:bg-link/10 aria-selected:text-link"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
