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
    <div className="border-b border-gray-100">
      <div className="p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          maxLength={100}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {showResultsPane && (
        <div className="px-4 pb-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!error && loading && results.length === 0 && (
            <p className="text-sm text-gray-400">Searching…</p>
          )}

          {!error && !loading && results.length === 0 && (
            <p className="text-sm text-gray-400">No users found.</p>
          )}

          {results.length > 0 && (
            <>
              <p className="text-xs text-gray-400">
                {total === 1 ? '1 result' : `${total} results`}
              </p>
              <ul className="mt-2 space-y-1">
                {results.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => onStartConversation(u)}
                      disabled={startingId !== null}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                    >
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-gray-900">{u.name}</span>
                        <span className="truncate text-xs text-gray-500">{u.email}</span>
                      </span>
                      {startingId === u.id && (
                        <span className="ml-2 text-xs text-gray-400">Starting…</span>
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
                  className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              )}
              {startError && <p className="mt-2 text-sm text-red-600">{startError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
