import { useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useChatStore } from '../store/chat'
import type { ApiResponse, ConversationDTO, PaginatedResponse, UserDTO } from '../types'

const LIMIT = 20

export default function UserSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<UserDTO[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setPage(1)
      setTotal(0)
      setHasMore(false)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    api<PaginatedResponse<UserDTO>>(
      `/users/search?q=${encodeURIComponent(debouncedQuery)}&page=1&limit=${LIMIT}`,
    )
      .then((res) => {
        if (cancelled) return
        setResults(res.data)
        setPage(res.page)
        setTotal(res.total)
        setHasMore(res.hasMore)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Network error')
        setResults([])
        setTotal(0)
        setHasMore(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  async function onStartConversation(user: UserDTO) {
    if (startingId) return
    setStartError(null)
    setStartingId(user.id)
    try {
      const res = await api<ApiResponse<ConversationDTO>>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ participantId: user.id }),
      })
      useChatStore.getState().upsertConversation(res.data)
      useChatStore.getState().setActiveConversation(res.data.id)
      setQuery('')
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setStartingId(null)
    }
  }

  async function onLoadMore() {
    if (!debouncedQuery || loading || !hasMore) return
    setLoading(true)
    setError(null)
    try {
      const next = page + 1
      const res = await api<PaginatedResponse<UserDTO>>(
        `/users/search?q=${encodeURIComponent(debouncedQuery)}&page=${next}&limit=${LIMIT}`,
      )
      setResults((prev) => [...prev, ...res.data])
      setPage(res.page)
      setHasMore(res.hasMore)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const showResultsPane = debouncedQuery.length > 0

  return (
    <div className="border-b border-border">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            maxLength={100}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="rounded-full p-0.5 text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showResultsPane && (
        <div className="border-t border-border bg-surface-2/30 px-3 pt-2 pb-3">
          {error && <p className="px-2 text-sm text-destructive">{error}</p>}

          {!error && loading && results.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">Searching…</p>
          )}

          {!error && !loading && results.length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">No users found.</p>
          )}

          {results.length > 0 && (
            <>
              <p className="px-2 text-[11px] tracking-wide text-muted-foreground uppercase">
                {total === 1 ? '1 result' : `${total} results`}
              </p>
              <ul className="mt-1 space-y-0.5">
                {results.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => onStartConversation(u)}
                      disabled={startingId !== null}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface-hover disabled:opacity-50"
                    >
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-border"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-xs font-semibold text-primary-foreground">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {u.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                      </span>
                      {startingId === u.id && (
                        <span className="ml-2 text-xs text-muted-foreground">Starting…</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-primary transition hover:bg-surface-hover disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              )}
              {startError && <p className="mt-2 px-2 text-sm text-destructive">{startError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
