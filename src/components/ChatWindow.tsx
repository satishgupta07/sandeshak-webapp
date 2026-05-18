import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useAuthStore } from '../store/auth'
import { useChatStore, type ReceiptStatus } from '../store/chat'
import type { ConversationDTO, MessageDTO, PaginatedResponse } from '../types'

const TYPING_AUTOSTOP_MS = 3000

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

type MessageStatus = 'sent' | ReceiptStatus

function deriveMessageStatus(
  conv: ConversationDTO,
  currentUserId: string | undefined,
  receipts: Record<string, ReceiptStatus> | undefined,
): MessageStatus {
  const otherIds = conv.participants.map((p) => p.userId).filter((id) => id !== currentUserId)
  if (otherIds.length === 0 || !receipts) return 'sent'
  const statuses = otherIds.map((id) => receipts[id]).filter((s): s is ReceiptStatus => Boolean(s))
  if (statuses.length === 0) return 'sent'
  if (statuses.every((s) => s === 'read')) return 'read'
  return 'delivered'
}

function StatusTick({ status, ownIsBlue }: { status: MessageStatus; ownIsBlue: boolean }) {
  const isDouble = status !== 'sent'
  const colorClass =
    status === 'read'
      ? ownIsBlue
        ? 'text-sky-200'
        : 'text-primary'
      : ownIsBlue
        ? 'text-white/60'
        : 'text-muted-foreground'
  return (
    <span aria-label={status} className={`ml-1 align-middle text-[10px] ${colorClass}`}>
      {isDouble ? '✓✓' : '✓'}
    </span>
  )
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return 'Offline'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Offline'
  return `Last seen ${d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function formatTime(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function ChatWindow() {
  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const conversations = useChatStore((s) => s.conversations)
  const messagesByConv = useChatStore((s) => s.messagesByConv)
  const setMessages = useChatStore((s) => s.setMessages)
  const isConnected = useChatStore((s) => s.isConnected)
  const presence = useChatStore((s) => s.presence)
  const typingByConv = useChatStore((s) => s.typingByConv)
  const receiptsByMessage = useChatStore((s) => s.receiptsByMessage)
  const currentUserId = useAuthStore((s) => s.user?.id)

  const conv = conversations.find((c) => c.id === activeId) ?? null
  const messages = activeId ? (messagesByConv[activeId] ?? []) : []

  const [draft, setDraft] = useState('')
  const [errorsByConv, setErrorsByConv] = useState<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  const typingRef = useRef<{
    emittedConvId: string | null
    timer: ReturnType<typeof setTimeout> | null
  }>({ emittedConvId: null, timer: null })

  const activeError = activeId ? (errorsByConv[activeId] ?? null) : null
  const loading =
    activeId !== null && messagesByConv[activeId] === undefined && activeError === null

  useEffect(() => {
    if (!activeId) return undefined
    if (messagesByConv[activeId]) return undefined
    if (errorsByConv[activeId]) return undefined

    let cancelled = false
    api<PaginatedResponse<MessageDTO>>(`/conversations/${activeId}/messages?page=1&limit=50`)
      .then((res) => {
        if (cancelled) return
        setMessages(activeId, [...res.data].reverse())
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof ApiError ? err.message : 'Network error'
        setErrorsByConv((prev) => ({ ...prev, [activeId]: msg }))
      })
    return () => {
      cancelled = true
    }
  }, [activeId, messagesByConv, errorsByConv, setMessages])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, activeId])

  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null
  const latestMessageId = latestMessage?.id ?? null
  const latestSenderId = latestMessage?.senderId ?? null
  useEffect(() => {
    if (!activeId || !latestMessageId) return
    if (latestSenderId === currentUserId) return
    const socket = getSocket()
    if (!socket || !socket.connected) return
    socket.emit('message:read', { conversationId: activeId, messageId: latestMessageId })
  }, [activeId, latestMessageId, latestSenderId, currentUserId])

  useEffect(() => {
    const state = typingRef.current
    return () => {
      if (state.emittedConvId !== null) {
        const socket = getSocket()
        if (socket?.connected) {
          socket.emit('typing:stop', { conversationId: state.emittedConvId })
        }
      }
      if (state.timer !== null) clearTimeout(state.timer)
      state.emittedConvId = null
      state.timer = null
    }
  }, [activeId])

  function emitTypingStop() {
    const state = typingRef.current
    if (state.emittedConvId === null) return
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit('typing:stop', { conversationId: state.emittedConvId })
    }
    if (state.timer !== null) clearTimeout(state.timer)
    state.emittedConvId = null
    state.timer = null
  }

  function emitTypingStart() {
    if (!activeId) return
    const socket = getSocket()
    if (!socket || !socket.connected) return
    const state = typingRef.current
    if (state.emittedConvId !== activeId) {
      socket.emit('typing:start', { conversationId: activeId })
      state.emittedConvId = activeId
    }
    if (state.timer !== null) clearTimeout(state.timer)
    state.timer = setTimeout(() => emitTypingStop(), TYPING_AUTOSTOP_MS)
  }

  function onDraftChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setDraft(next)
    if (next.trim()) emitTypingStart()
    else emitTypingStop()
  }

  function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!activeId || !trimmed) return
    const socket = getSocket()
    if (!socket) return
    socket.emit('message:send', {
      conversationId: activeId,
      type: 'text',
      content: trimmed,
    })
    setDraft('')
    emitTypingStop()
  }

  if (!conv) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-primary"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Your messages</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Select a conversation or search for someone to start chatting securely.
          </p>
        </div>
      </main>
    )
  }

  const name = displayName(conv, currentUserId)
  const avatar = displayAvatar(conv, currentUserId)
  const otherId = otherUserId(conv, currentUserId)
  const otherPresence = otherId ? presence[otherId] : null
  const typingUsers = activeId ? (typingByConv[activeId] ?? []) : []
  const showTyping = typingUsers.some((uid) => uid !== currentUserId)

  let statusLine: string | null = null
  if (showTyping) statusLine = 'Typing…'
  else if (otherPresence?.isOnline) statusLine = 'Online'
  else if (otherPresence) statusLine = formatLastSeen(otherPresence.lastSeen)

  const statusActive = showTyping || Boolean(otherPresence?.isOnline)

  return (
    <main className="flex flex-1 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-surface/60 px-3 py-3 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-label="Back to conversations"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-hover hover:text-foreground md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="relative shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-sm font-semibold text-primary-foreground">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          {otherPresence?.isOnline && (
            <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-surface bg-success" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{name}</h2>
          {statusLine && (
            <span
              className={`truncate text-xs ${
                statusActive ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              {statusLine}
            </span>
          )}
        </div>

        {!isConnected && (
          <span className="hidden rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning sm:inline">
            Reconnecting…
          </span>
        )}
      </header>

      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
        {activeError && <p className="py-8 text-center text-sm text-destructive">{activeError}</p>}
        {!loading && !activeError && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No messages yet. Say hi 👋</p>
          </div>
        )}

        <ul className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {messages.map((m, idx) => {
            const isOwn = m.senderId === currentUserId
            const prev = messages[idx - 1]
            const next = messages[idx + 1]
            const prevSame = prev?.senderId === m.senderId
            const nextSame = next?.senderId === m.senderId
            const status = isOwn
              ? deriveMessageStatus(conv, currentUserId, receiptsByMessage[m.id])
              : null

            const corners = isOwn
              ? `rounded-2xl ${prevSame ? 'rounded-tr-md' : ''} ${nextSame ? 'rounded-br-md' : ''}`
              : `rounded-2xl ${prevSame ? 'rounded-tl-md' : ''} ${nextSame ? 'rounded-bl-md' : ''}`

            return (
              <li
                key={m.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                  nextSame ? '' : 'mb-1'
                }`}
              >
                <div
                  className={`group relative max-w-[85%] px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm sm:max-w-[70%] ${corners} ${
                    isOwn
                      ? 'bg-bubble-own text-bubble-own-foreground'
                      : 'bg-bubble-peer text-bubble-peer-foreground'
                  }`}
                >
                  <span>{m.content ?? ''}</span>
                  <span
                    className={`ml-2 inline-flex items-center align-middle text-[10px] ${
                      isOwn ? 'text-white/60' : 'text-muted-foreground'
                    }`}
                  >
                    {formatTime(m.createdAt)}
                    {status && <StatusTick status={status} ownIsBlue={isOwn} />}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <form
        onSubmit={onSend}
        className="border-t border-border bg-surface/60 px-3 py-3 backdrop-blur sm:px-5"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="flex flex-1 items-center rounded-2xl border border-border bg-surface px-4 py-2 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25">
            <input
              type="text"
              value={draft}
              onChange={onDraftChange}
              onBlur={emitTypingStop}
              placeholder="Message"
              maxLength={8000}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!draft.trim() || !isConnected}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </main>
  )
}
