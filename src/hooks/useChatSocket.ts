import { useEffect } from 'react'
import { initSocket, teardownSocket } from '../lib/socket'
import { useAuthStore } from '../store/auth'
import { useChatStore } from '../store/chat'

// Server's typing relay doesn't auto-clear if the sender disconnects mid-burst.
// We auto-clear locally after this many ms of no further typing:start events.
const TYPING_AUTOCLEAR_MS = 5000

// Connects the socket whenever an access token is available; tears it down
// on logout. Mount this from a single authenticated component (ChatPage) so
// only one connection exists per tab.
export function useChatSocket(): void {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) return undefined

    const socket = initSocket(accessToken)
    const chat = useChatStore.getState()

    // Per-(convId, userId) timers used to auto-clear stale typing state.
    const typingTimers = new Map<string, number>()
    const typingKey = (convId: string, userId: string) => `${convId}::${userId}`

    socket.on('connect', () => useChatStore.getState().setConnected(true))
    socket.on('disconnect', () => useChatStore.getState().setConnected(false))
    socket.on('connect_error', (err) => {
      console.error('[socket] connect_error:', err.message)
    })

    socket.on('message:new', (msg) => {
      useChatStore.getState().appendMessage(msg.conversationId, msg)
    })

    socket.on('conversation:new', (conv) => {
      useChatStore.getState().upsertConversation(conv)
    })

    socket.on('message:receipt', ({ messageId, userId, status }) => {
      useChatStore.getState().setReceipt(messageId, userId, status)
    })

    socket.on('presence:update', ({ userId, isOnline, lastSeen }) => {
      useChatStore.getState().setPresence(userId, { isOnline, lastSeen })
    })

    socket.on('typing', ({ conversationId, userId, isTyping }) => {
      useChatStore.getState().setTyping(conversationId, userId, isTyping)
      const key = typingKey(conversationId, userId)
      const existing = typingTimers.get(key)
      if (existing !== undefined) window.clearTimeout(existing)
      if (isTyping) {
        const handle = window.setTimeout(() => {
          useChatStore.getState().setTyping(conversationId, userId, false)
          typingTimers.delete(key)
        }, TYPING_AUTOCLEAR_MS)
        typingTimers.set(key, handle)
      } else {
        typingTimers.delete(key)
      }
    })

    socket.connect()

    return () => {
      for (const handle of typingTimers.values()) window.clearTimeout(handle)
      typingTimers.clear()
      teardownSocket()
      chat.setConnected(false)
    }
  }, [accessToken])
}
