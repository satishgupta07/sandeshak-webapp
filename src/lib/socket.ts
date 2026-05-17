import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '../types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

// Client-side typed socket: listens for ServerToClientEvents, emits ClientToServerEvents.
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Module-scoped singleton — only one socket per tab regardless of how many
// components import this file. The useChatSocket hook owns the lifecycle.
let currentSocket: AppSocket | null = null

export function getSocket(): AppSocket | null {
  return currentSocket
}

export function initSocket(token: string): AppSocket {
  if (currentSocket) {
    currentSocket.disconnect()
    currentSocket = null
  }
  const socket: AppSocket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  })
  currentSocket = socket
  return socket
}

export function teardownSocket(): void {
  if (currentSocket) {
    currentSocket.disconnect()
    currentSocket = null
  }
}
