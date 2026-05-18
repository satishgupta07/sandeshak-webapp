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

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ConversationList() {
  const conversations = useChatStore((s) => s.conversations)
  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const setConversations = useChatStore((s) => s.setConversations)
  const presence = useChatStore((s) => s.presence)
  const currentUserId = useAuthStore((s) => s.user?.id)

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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading conversations…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">
          No conversations yet.
          <br />
          Search above to start one.
        </p>
      </div>
    )
  }

  return (
    <ul className="scroll-thin flex-1 overflow-y-auto px-2 py-2">
      {conversations.map((conv) => {
        const name = displayName(conv, currentUserId)
        const avatar = displayAvatar(conv, currentUserId)
        const isActive = conv.id === activeId
        const preview = conv.lastMessage?.content ?? 'No messages yet'
        const time = formatRelativeTime(conv.lastMessage?.createdAt)
        const otherId = otherUserId(conv, currentUserId)
        const isOnline = otherId ? (presence[otherId]?.isOnline ?? false) : false
        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => setActive(conv.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                isActive ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-surface-hover'
              }`}
            >
              <span className="relative shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-sm font-semibold text-primary-foreground">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                {isOnline && (
                  <span
                    aria-label="online"
                    className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-sidebar bg-success"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{name}</span>
                  {time && (
                    <span
                      className={`shrink-0 text-[11px] ${
                        conv.unreadCount > 0 ? 'font-medium text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {time}
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-xs ${
                      conv.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {preview}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="ml-1 shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
