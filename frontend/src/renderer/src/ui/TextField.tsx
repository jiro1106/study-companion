import type { InputHTMLAttributes } from 'react'

export function TextField({
  id,
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  error?: string
}): React.JSX.Element {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className="text-caption font-extrabold tracking-[0.053em] text-fg-muted uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full min-w-0 rounded-control border-2 px-3.5 py-3 text-base text-fg placeholder:text-fg-faint focus:outline-none ${error ? 'border-danger bg-danger-wash' : 'border-border bg-surface-2 focus:border-link focus:bg-surface'} ${className}`}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="text-caption font-bold text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
