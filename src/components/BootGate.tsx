import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { API_ORIGIN } from '../lib/api'

// Hits /health at startup to warm Render's dyno. If the response doesn't
// arrive within 3s we show a full-screen splash with the cold-start message.
// As soon as the server responds (or after a hard timeout) we render children.
const SLOW_MS = 3000
const HARD_TIMEOUT_MS = 60_000

type Status = 'pending-fast' | 'pending-slow' | 'ready'

export default function BootGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('pending-fast')

  useEffect(() => {
    const slowTimer = setTimeout(() => {
      setStatus((s) => (s === 'pending-fast' ? 'pending-slow' : s))
    }, SLOW_MS)

    const controller = new AbortController()
    const hardTimer = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS)

    fetch(`${API_ORIGIN}/health`, { signal: controller.signal })
      .catch(() => {
        // Network/abort — let the app load anyway; subsequent API calls
        // will surface their own errors via the slow-request banner.
      })
      .finally(() => {
        clearTimeout(slowTimer)
        clearTimeout(hardTimer)
        setStatus('ready')
      })

    return () => {
      clearTimeout(slowTimer)
      clearTimeout(hardTimer)
      controller.abort()
    }
  }, [])

  if (status === 'ready' || status === 'pending-fast') return <>{children}</>

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/30">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Waking up our server…</h1>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            The free-tier backend sleeps when idle. This usually takes ~30 seconds.
          </p>
        </div>
      </div>
    </div>
  )
}
