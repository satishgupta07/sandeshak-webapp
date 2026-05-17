import { useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useChatStore } from '../store/chat'
import type { ApiResponse, ConversationDTO } from '../types'

function displayName(conv: ConversationDTO, currentUserId: string | undefined): string {
  if (conv.type === 'group') return conv.name ?? 'Group'
  const other = conv.participants.find((p) => p.userId !== currentUserId)
  return other?.user.name ?? 'Direct'
}

function displayAvatar(conv: ConversationDTO, currentUserId: string | undefined): string | null {
  if (conv.type === 'group') return conv.avatarUrl
  return conv.participants.find((p) => p.userId !== currentUserId)?.user.avatarUrl ?? null
}

function otherUserId(conv: ConversationDTO, currentUserId: string | undefined): string | null {
  if (conv.type === 'group') return null
  return conv.participants.find((p) => p.userId !== currentUserId)?.userId ?? null
}

export default function ConversationList() {
  const conversations = useChatStore((s) => s.conversations)
  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const setConversations = useChatStore((s) => s.setConversations)
  const presence = useChatStore((s) => s.presence)
  const currentUserId = useAuthStore((s) => s.user?.id)

  // Initial state covers "before the fetch resolves"; the effect doesn't need
  // to flip loading=true itself (avoids react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<ApiResponse<ConversationDTO[]>>('/conversations')
      .then((res) => {
        if (cancelled) return
        setConversations(res.data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Network error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setConversations])

  if (loading) return <p className="p-4 text-sm text-gray-400">Loading conversations…</p>
  if (error) return <p className="p-4 text-sm text-red-600">{error}</p>
  if (conversations.length === 0) {
    return (
      <p className="p-4 text-sm text-gray-400">
        No conversations yet. Search for someone above to start one.
      </p>
    )
  }

  return (
    <ul className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const name = displayName(conv, currentUserId)
        const avatar = displayAvatar(conv, currentUserId)
        const isActive = conv.id === activeId
        const preview = conv.lastMessage?.content ?? '—'
        const otherId = otherUserId(conv, currentUserId)
        const isOnline = otherId ? (presence[otherId]?.isOnline ?? false) : false
        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => setActive(conv.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                isActive ? 'bg-blue-50' : ''
              }`}
            >
              <span className="relative shrink-0">
                {avatar ? (
                  <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                {isOnline && (
                  <span
                    aria-label="online"
                    className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-gray-900">{name}</span>
                <span className="truncate text-xs text-gray-500">{preview}</span>
              </span>
              {conv.unreadCount > 0 && (
                <span className="ml-2 shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
