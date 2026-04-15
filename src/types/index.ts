// MIRROR of sandeshak-server/src/types/index.ts — source of truth is the server.
// When the server types change, copy this file again and update both.

// ─── API Response wrapper ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  lastSeen: string | null; // ISO string
  createdAt: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ─── Conversation ────────────────────────────────────────────────────────────

export type ConversationType = 'direct' | 'group';

export interface ConversationDTO {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  lastMessage: MessageDTO | null;
  unreadCount: number;
  participants: UserDTO[];
  createdAt: string;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  replyTo: MessageDTO | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Socket.io events ────────────────────────────────────────────────────────
// Naming convention: "<resource>:<action>"

export interface ServerToClientEvents {
  'message:new': (message: MessageDTO) => void;
  'message:receipt': (payload: { messageId: string; userId: string; status: 'delivered' | 'read'; timestamp: string }) => void;
  'message:deleted': (payload: { messageId: string; conversationId: string }) => void;
  'message:edited': (payload: { messageId: string; content: string; updatedAt: string }) => void;
  'typing': (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  'presence:update': (payload: { userId: string; isOnline: boolean; lastSeen: string | null }) => void;
}

export interface ClientToServerEvents {
  'message:send': (payload: { conversationId: string; type: MessageType; content?: string; mediaUrl?: string; replyToId?: string }) => void;
  'message:read': (payload: { conversationId: string; messageId: string }) => void;
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
}
