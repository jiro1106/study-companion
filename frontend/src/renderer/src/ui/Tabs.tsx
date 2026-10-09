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
  const selectTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let nextIndex: number

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (index - 1 + items.length) % items.length
        break
      case 'ArrowRight':
        nextIndex = (index + 1) % items.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = items.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    onChange(items[nextIndex].id)
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          tabIndex={item.id === value ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => selectTab(event, index)}
          className="cursor-pointer rounded-control border-2 border-border-strong px-3.5 py-2 text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase aria-selected:border-link aria-selected:bg-link/10 aria-selected:text-link"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
