import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useAuthStore } from '../store/auth'
import { useChatStore } from '../store/chat'
import type { ConversationDTO, MessageDTO, PaginatedResponse } from '../types'

function displayName(conv: ConversationDTO, currentUserId: string | undefined): string {
  if (conv.type === 'group') return conv.name ?? 'Group'
  const other = conv.participants.find((p) => p.userId !== currentUserId)
  return other?.user.name ?? 'Direct'
}

export default function ChatWindow() {
  const activeId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const messagesByConv = useChatStore((s) => s.messagesByConv)
  const setMessages = useChatStore((s) => s.setMessages)
  const isConnected = useChatStore((s) => s.isConnected)
  const currentUserId = useAuthStore((s) => s.user?.id)

  const conv = conversations.find((c) => c.id === activeId) ?? null
  const messages = activeId ? (messagesByConv[activeId] ?? []) : []

  const [draft, setDraft] = useState('')
  const [errorsByConv, setErrorsByConv] = useState<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // Derived loading/error state — avoids react-hooks/set-state-in-effect by
  // never flipping a flag inside the effect body itself. "Loading" means the
  // user picked a conversation, the store has no messages for it yet, and no
  // error has been recorded.
  const activeError = activeId ? (errorsByConv[activeId] ?? null) : null
  const loading =
    activeId !== null && messagesByConv[activeId] === undefined && activeError === null

  // Fetch history once per conversation switch (if not already loaded)
  useEffect(() => {
    if (!activeId) return undefined
    if (messagesByConv[activeId]) return undefined
    if (errorsByConv[activeId]) return undefined

    let cancelled = false
    api<PaginatedResponse<MessageDTO>>(`/conversations/${activeId}/messages?page=1&limit=50`)
      .then((res) => {
        if (cancelled) return
        // Server returns newest-first; we render oldest-first.
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
  }

  if (!conv) {
    return (
      <main className="flex flex-1 items-center justify-center bg-gray-50">
        <p className="text-gray-400">Select a conversation</p>
      </main>
    )
  }

  const name = displayName(conv, currentUserId)

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="text-sm font-medium text-gray-900">{name}</h2>
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
            return (
              <li key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 shadow-sm'
                  }`}
                >
                  {m.content ?? ''}
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
            onChange={(e) => setDraft(e.target.value)}
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
