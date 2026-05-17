import { useEffect } from 'react'
import { initSocket, teardownSocket } from '../lib/socket'
import { useAuthStore } from '../store/auth'
import { useChatStore } from '../store/chat'

// Connects the socket whenever an access token is available; tears it down
// on logout. Mount this from a single authenticated component (ChatPage) so
// only one connection exists per tab.
export function useChatSocket(): void {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) return undefined

    const socket = initSocket(accessToken)
    const chat = useChatStore.getState()

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

    socket.connect()

    return () => {
      teardownSocket()
      chat.setConnected(false)
    }
  }, [accessToken])
}
