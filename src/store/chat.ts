import { create } from 'zustand'
import type { ConversationDTO, MessageDTO, MessageStatus } from '../types'

export interface PresenceEntry {
  isOnline: boolean
  lastSeen: string | null
}

// 'sent' = server acknowledged (we received it back via message:new)
// 'delivered' = at least one recipient's device received it
// 'read' = at least one recipient has read it
export type ReceiptStatus = Extract<MessageStatus, 'delivered' | 'read'>

interface ChatState {
  // Connection
  isConnected: boolean

  // Data
  conversations: ConversationDTO[]
  messagesByConv: Record<string, MessageDTO[]> // ordered oldest → newest

  // Presence: userId → {isOnline, lastSeen}. Seeded from REST, updated by socket.
  presence: Record<string, PresenceEntry>

  // Typing: convId → set of userIds currently typing (excludes self). Stored
  // as plain arrays for Zustand structural-equality friendliness.
  typingByConv: Record<string, string[]>

  // Receipts: messageId → userId → status. Read overrides delivered.
  receiptsByMessage: Record<string, Record<string, ReceiptStatus>>

  // UI
  activeConversationId: string | null

  // Actions
  setConnected: (connected: boolean) => void
  setConversations: (convs: ConversationDTO[]) => void
  upsertConversation: (conv: ConversationDTO) => void
  setActiveConversation: (id: string | null) => void
  setMessages: (conversationId: string, messages: MessageDTO[]) => void
  appendMessage: (conversationId: string, message: MessageDTO) => void

  setPresence: (userId: string, entry: PresenceEntry) => void

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void

  setReceipt: (messageId: string, userId: string, status: ReceiptStatus) => void

  clear: () => void
}

const initialState = {
  isConnected: false,
  conversations: [] as ConversationDTO[],
  messagesByConv: {} as Record<string, MessageDTO[]>,
  presence: {} as Record<string, PresenceEntry>,
  typingByConv: {} as Record<string, string[]>,
  receiptsByMessage: {} as Record<string, Record<string, ReceiptStatus>>,
  activeConversationId: null as string | null,
}

// Seed presence + receipts from a freshly-fetched conversation. UserDTO
// already carries isOnline / lastSeen via the server's annotateOnlinePresence
// pass. Called from upsertConversation/setConversations so all consumers stay
// consistent.
function seedPresenceFromConversation(
  conv: ConversationDTO,
  presence: Record<string, PresenceEntry>,
): Record<string, PresenceEntry> {
  const next = { ...presence }
  for (const p of conv.participants) {
    next[p.userId] = { isOnline: p.user.isOnline, lastSeen: p.user.lastSeen }
  }
  return next
}

export const useChatStore = create<ChatState>()((set) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setConversations: (convs) =>
    set((state) => {
      let presence = state.presence
      for (const c of convs) presence = seedPresenceFromConversation(c, presence)
      return { conversations: convs, presence }
    }),

  upsertConversation: (conv) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conv.id)
      const conversations =
        idx === -1
          ? [conv, ...state.conversations]
          : state.conversations.map((c, i) => (i === idx ? conv : c))
      const presence = seedPresenceFromConversation(conv, state.presence)
      return { conversations, presence }
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConv: { ...state.messagesByConv, [conversationId]: messages },
    })),

  // Idempotent against duplicates — if the same message id is appended twice
  // (e.g. sender's echo races with optimistic update once we add it later),
  // the second call is a no-op.
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

  setPresence: (userId, entry) =>
    set((state) => ({ presence: { ...state.presence, [userId]: entry } })),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingByConv[conversationId] ?? []
      const has = current.includes(userId)
      if (isTyping === has) return {}
      const next = isTyping ? [...current, userId] : current.filter((id) => id !== userId)
      return { typingByConv: { ...state.typingByConv, [conversationId]: next } }
    }),

  // Read overrides delivered (monotonic). Delivered never demotes an existing
  // read. Keeps the UI from flickering if events arrive out of order.
  setReceipt: (messageId, userId, status) =>
    set((state) => {
      const prev = state.receiptsByMessage[messageId]?.[userId]
      if (prev === 'read' && status === 'delivered') return {}
      if (prev === status) return {}
      const forMessage = { ...(state.receiptsByMessage[messageId] ?? {}), [userId]: status }
      return {
        receiptsByMessage: { ...state.receiptsByMessage, [messageId]: forMessage },
      }
    }),

  clear: () => set({ ...initialState }),
}))
