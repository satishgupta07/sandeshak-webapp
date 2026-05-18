import type { ReactNode } from 'react'

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-10">
      {/* Ambient glow accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-6rem] bottom-[-6rem] h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary-foreground"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          {children}
        </div>

        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  )
}

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}

export const authInputClass =
  'block w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25 focus:outline-none'

export const authPrimaryButtonClass =
  'inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none'
