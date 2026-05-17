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

function otherUserId(conv: ConversationDTO, currentUserId: string | undefined): string | null {
  if (conv.type === 'group') return null
  return conv.participants.find((p) => p.userId !== currentUserId)?.userId ?? null
}

type MessageStatus = 'sent' | ReceiptStatus

// For direct conversations: status is whatever the (single) other participant
// reports. For groups: 'read' only once everyone has read it, else 'delivered'
// if anyone has received it, else 'sent'.
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
  // 'sent' = single check; 'delivered' / 'read' = double check.
  // 'read' tint: lighter blue on the own (blue) bubble, normal blue otherwise.
  const isDouble = status !== 'sent'
  const colorClass =
    status === 'read'
      ? ownIsBlue
        ? 'text-sky-300'
        : 'text-blue-500'
      : ownIsBlue
        ? 'text-blue-200'
        : 'text-gray-400'
  return (
    <span aria-label={status} className={`ml-1 text-[10px] ${colorClass}`}>
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

export default function ChatWindow() {
  const activeId = useChatStore((s) => s.activeConversationId)
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

  // Typing-emit state — kept in a ref so changes don't re-render.
  const typingRef = useRef<{
    emittedConvId: string | null
    timer: ReturnType<typeof setTimeout> | null
  }>({ emittedConvId: null, timer: null })

  const activeError = activeId ? (errorsByConv[activeId] ?? null) : null
  const loading =
    activeId !== null && messagesByConv[activeId] === undefined && activeError === null

  // Fetch history once per conversation switch
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

  // Auto-scroll to bottom on new message / conversation switch
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, activeId])

  // Mark the latest message as read whenever it changes and isn't ours. Server
  // ignores reads on our own messages, but emitting them would still create
  // confusing self-receipts.
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

  // Stop typing whenever the active conversation changes (or unmount). Emitting
  // a stop for the *previous* conv on switch keeps the other side from seeing
  // a stuck "typing…" indicator.
  useEffect(() => {
    // Snapshot the ref so the cleanup uses the same object reference the
    // effect setup captured — silences react-hooks/exhaustive-deps.
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
      <main className="flex flex-1 items-center justify-center bg-gray-50">
        <p className="text-gray-400">Select a conversation</p>
      </main>
    )
  }

  const name = displayName(conv, currentUserId)
  const otherId = otherUserId(conv, currentUserId)
  const otherPresence = otherId ? presence[otherId] : null
  const typingUsers = activeId ? (typingByConv[activeId] ?? []) : []
  const showTyping = typingUsers.some((uid) => uid !== currentUserId)

  // Status line under the name: typing > online > last seen.
  let statusLine: string | null = null
  if (showTyping) statusLine = 'Typing…'
  else if (otherPresence?.isOnline) statusLine = 'Online'
  else if (otherPresence) statusLine = formatLastSeen(otherPresence.lastSeen)

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-sm font-medium text-gray-900">{name}</h2>
          {statusLine && (
            <span
              className={`text-xs ${
                showTyping || otherPresence?.isOnline ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {statusLine}
            </span>
          )}
        </div>
        {!isConnected && <span className="text-xs text-amber-600">Reconnecting…</span>}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading && <p className="text-center text-sm text-gray-400">Loading…</p>}
        {activeError && <p className="text-center text-sm text-red-600">{activeError}</p>}
        {!loading && !activeError && messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">No messages yet. Say hi!</p>
        )}
        <ul className="space-y-2">
          {messages.map((m) => {
            const isOwn = m.senderId === currentUserId
            const status = isOwn
              ? deriveMessageStatus(conv, currentUserId, receiptsByMessage[m.id])
              : null
            return (
              <li key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 shadow-sm'
                  }`}
                >
                  <span>{m.content ?? ''}</span>
                  {status && <StatusTick status={status} ownIsBlue={isOwn} />}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <form onSubmit={onSend} className="border-t border-gray-200 bg-white p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={onDraftChange}
            onBlur={emitTypingStop}
            placeholder="Type a message…"
            maxLength={8000}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !isConnected}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  )
}
