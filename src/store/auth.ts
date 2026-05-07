import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthTokens, UserDTO } from '../types'

interface AuthState {
  user: UserDTO | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: UserDTO, tokens: AuthTokens) => void
  setTokens: (tokens: AuthTokens) => void
  setUser: (user: UserDTO) => void
  clear: () => void
}

// Tokens are persisted to localStorage. Architecture target is HttpOnly cookie
// for the refresh token; that swap will happen when the server adds cookie
// support. Until then, treat localStorage as a dev-acceptable interim.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'sandeshak-auth' },
  ),
)

export const selectIsAuthenticated = (s: AuthState): boolean => Boolean(s.user && s.accessToken)
