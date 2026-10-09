import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary border-b-4 border-primary-lip',
  secondary: 'bg-surface text-link border-2 border-border border-b-4',
  dark: 'bg-night text-bg border-b-4 border-night/70',
  danger: 'bg-danger text-on-primary border-b-4 border-danger-lip',
  ghost: 'bg-transparent text-fg-muted'
}

export function Button({
  variant = 'primary',
  block = false,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  block?: boolean
}): React.JSX.Element {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control px-[18px] py-3 text-sm leading-none font-extrabold tracking-[0.053em] uppercase hover:brightness-105 active:translate-y-0.5 active:border-b-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-fg-faint disabled:hover:brightness-100 ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    />
  )
}
