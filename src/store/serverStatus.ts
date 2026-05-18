import { create } from 'zustand'

// Tracks "is the server taking too long to respond?" so we can surface a
// friendly banner explaining the cold-start delay (Render free tier spins
// the dyno down after ~15min of inactivity).
//
// Anything that wants to participate calls `markSlowAfter(3000)` when its
// request starts, and the returned `clear` fn when it finishes (success OR
// failure). The banner subscribes to `slowCount > 0`.
interface ServerStatusState {
  slowCount: number
  bump: () => void
  unbump: () => void
}

export const useServerStatusStore = create<ServerStatusState>((set) => ({
  slowCount: 0,
  bump: () => set((s) => ({ slowCount: s.slowCount + 1 })),
  unbump: () => set((s) => ({ slowCount: Math.max(0, s.slowCount - 1) })),
}))

export function markSlowAfter(ms = 3000): () => void {
  const store = useServerStatusStore.getState()
  let bumped = false
  const timer = setTimeout(() => {
    bumped = true
    store.bump()
  }, ms)
  return () => {
    clearTimeout(timer)
    if (bumped) useServerStatusStore.getState().unbump()
  }
}

export const selectIsSlow = (s: ServerStatusState) => s.slowCount > 0
