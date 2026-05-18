import { selectIsSlow, useServerStatusStore } from '../store/serverStatus'

export default function SlowServerBanner() {
  const isSlow = useServerStatusStore(selectIsSlow)
  if (!isSlow) return null

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-border bg-surface/95 px-4 py-2.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">Waking up our server…</span>
          <span className="text-xs text-muted-foreground">
            This may take ~30 seconds the first time.
          </span>
        </div>
      </div>
    </div>
  )
}
