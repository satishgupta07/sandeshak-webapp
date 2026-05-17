import { useAuthStore } from '../store/auth'
import type { ApiResponse, AuthTokens } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null
  /** Skip Authorization header + skip auto-refresh. Use for /auth/login etc. */
  skipAuth?: boolean
}

// Single in-flight refresh promise so concurrent 401s share one /auth/refresh call.
let refreshInFlight: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as ApiResponse<AuthTokens>
    useAuthStore.getState().setTokens(body.data)
    return body.data.accessToken
  } catch {
    return null
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = options
  const accessToken = useAuthStore.getState().accessToken

  const finalHeaders = new Headers(headers)
  if (!finalHeaders.has('Content-Type') && rest.body) {
    finalHeaders.set('Content-Type', 'application/json')
  }
  if (!skipAuth && accessToken) {
    finalHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  let response = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders })

  if (response.status === 401 && !skipAuth) {
    const newToken = await tryRefresh()
    if (newToken) {
      finalHeaders.set('Authorization', `Bearer ${newToken}`)
      response = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders })
    } else {
      useAuthStore.getState().clear()
    }
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(response.status, errBody?.error ?? response.statusText)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
