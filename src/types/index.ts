/**
 * MIRROR of sandeshak-server/src/types/index.ts — the SERVER is the source of truth.
 * When the server types change, copy this file from there and adjust imports.
 */

// ─── HTTP: Generic response wrappers ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface PaginationQuery {
  page?: number
  limit?: number
  cursor?: string
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: UserDTO
  tokens: AuthTokens
}

export interface RefreshRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserDTO {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  bio: string | null
  lastSeen: string | null
  isOnline: boolean
  isVerified: boolean
  createdAt: string
}

export interface UpdateProfileRequest {
  name?: string
  bio?: string
  avatarUrl?: string
}

export type PrivacyVisibility = 'everyone' | 'contacts' | 'nobody'

export interface PrivacySettings {
  lastSeen: PrivacyVisibility
  avatar: PrivacyVisibility
  status: PrivacyVisibility
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface ContactDTO {
  userId: string
  contact: UserDTO
  nickname: string | null
  createdAt: string
}

export interface AddContactRequest {
  contactId: string
  nickname?: string
}

// ─── Conversation ────────────────────────────────────────────────────────────

export type ConversationType = 'direct' | 'group'

export interface ConversationDTO {
  id: string
  type: ConversationType
  name: string | null
  avatarUrl: string | null
  description: string | null
  lastMessage: MessageDTO | null
  unreadCount: number
  participants: ParticipantDTO[]
  createdAt: string
}

export type ParticipantRole = 'admin' | 'member'

export interface ParticipantDTO {
  userId: string
  user: UserDTO
  role: ParticipantRole
  joinedAt: string
}

export interface CreateDirectConversationRequest {
  participantId: string
}

export interface CreateGroupRequest {
  name: string
  memberIds: string[]
  avatarUrl?: string
  description?: string
}

export interface UpdateGroupRequest {
  name?: string
  avatarUrl?: string
  description?: string
}

export interface AddGroupMemberRequest {
  userId: string
}

export interface UpdateParticipantRoleRequest {
  role: ParticipantRole
}

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'system'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

export interface MessageDTO {
  id: string
  conversationId: string
  senderId: string
  type: MessageType
  content: string | null
  mediaUrl: string | null
  thumbUrl: string | null
  replyTo: MessageReplyDTO | null
  reactions: ReactionDTO[]
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface MessageReplyDTO {
  id: string
  senderId: string
  type: MessageType
  content: string | null
  mediaUrl: string | null
}

export interface ReactionDTO {
  userId: string
  emoji: string
  createdAt: string
}

export interface SendMessageRequest {
  type: MessageType
  content?: string
  mediaUrl?: string
  replyToId?: string
}

export interface EditMessageRequest {
  content: string
}

export interface AddReactionRequest {
  emoji: string
}

// ─── Media ───────────────────────────────────────────────────────────────────

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export interface PresignRequest {
  fileName: string
  mimeType: string
  mediaType: MediaType
  fileSize: number
}

export interface PresignResponse {
  uploadUrl: string
  key: string
  expiresIn: number
}

export interface MediaConfirmRequest {
  key: string
}

export interface MediaConfirmResponse {
  url: string
  thumbUrl: string | null
}

// ─── Socket.io events ────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'message:new': (message: MessageDTO) => void
  'message:receipt': (payload: {
    messageId: string
    userId: string
    status: 'delivered' | 'read'
    timestamp: string
  }) => void
  'message:deleted': (payload: { messageId: string; conversationId: string }) => void
  'message:edited': (payload: { messageId: string; content: string; updatedAt: string }) => void
  'message:reaction': (payload: {
    messageId: string
    conversationId: string
    reaction: ReactionDTO
  }) => void
  typing: (payload: { conversationId: string; userId: string; isTyping: boolean }) => void
  'presence:update': (payload: {
    userId: string
    isOnline: boolean
    lastSeen: string | null
  }) => void
  'conversation:new': (conversation: ConversationDTO) => void
  'group:member:added': (payload: { conversationId: string; participant: ParticipantDTO }) => void
  'group:member:removed': (payload: { conversationId: string; userId: string }) => void
}

export interface ClientToServerEvents {
  'message:send': (payload: {
    conversationId: string
    type: MessageType
    content?: string
    mediaUrl?: string
    replyToId?: string
  }) => void
  'message:read': (payload: { conversationId: string; messageId: string }) => void
  'typing:start': (payload: { conversationId: string }) => void
  'typing:stop': (payload: { conversationId: string }) => void
}
