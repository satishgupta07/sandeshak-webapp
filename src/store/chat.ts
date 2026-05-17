import { create } from 'zustand'
import type { ConversationDTO, MessageDTO } from '../types'

interface ChatState {
  // Connection
  isConnected: boolean

  // Data
  conversations: ConversationDTO[]
  messagesByConv: Record<string, MessageDTO[]> // ordered oldest → newest

  // UI
  activeConversationId: string | null

  // Actions
  setConnected: (connected: boolean) => void
  setConversations: (convs: ConversationDTO[]) => void
  upsertConversation: (conv: ConversationDTO) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (conversationId: string, messages: MessageDTO[]) => void
  appendMessage: (conversationId: string, message: MessageDTO) => void
  clear: () => void
}

const initialState = {
  isConnected: false,
  conversations: [] as ConversationDTO[],
  messagesByConv: {} as Record<string, MessageDTO[]>,
  activeConversationId: null as string | null,
}

export const useChatStore = create<ChatState>()((set) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setConversations: (convs) => set({ conversations: convs }),

  upsertConversation: (conv) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conv.id)
      if (idx === -1) return { conversations: [conv, ...state.conversations] }
      const next = state.conversations.slice()
      next[idx] = conv
      return { conversations: next }
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConv: { ...state.messagesByConv, [conversationId]: messages },
    })),

  // Idempotent against duplicates — if the same message id is appended twice
  // (e.g. the sender's echo races with their optimistic update once we add
  // optimistic UI), the second call is a no-op.
  appendMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messagesByConv[conversationId] ?? []
      if (existing.some((m) => m.id === message.id)) return {}
      return {
        messagesByConv: {
          ...state.messagesByConv,
          [conversationId]: [...existing, message],
        },
      }
    }),

  clear: () => set({ ...initialState }),
}))
