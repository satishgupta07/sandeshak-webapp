import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../lib/api'
import { selectIsAuthenticated, useAuthStore } from '../store/auth'
import type { ApiResponse, UserDTO } from '../types'

type Status = 'pending' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const currentUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [status, setStatus] = useState<Status>('pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Missing token')
      return
    }
    let cancelled = false
    api<ApiResponse<UserDTO>>(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      skipAuth: true,
    })
      .then((res) => {
        if (cancelled) return
        setStatus('success')
        // Only update the store if the currently signed-in user is the
        // one being verified — prevents a forwarded link from clobbering
        // someone else's session.
        if (currentUser && currentUser.id === res.data.id) {
          setUser(res.data)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setErrorMessage(err instanceof ApiError ? err.message : 'Network error')
      })
    return () => {
      cancelled = true
    }
    // Run once on mount; the token is fixed for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        {status === 'pending' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Verifying…</h1>
            <p className="mt-2 text-sm text-gray-500">Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Email verified</h1>
            <p className="mt-2 text-sm text-gray-500">
              Your email has been confirmed. You&apos;re all set.
            </p>
            <Link
              to={isAuthenticated ? '/' : '/login'}
              className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {isAuthenticated ? 'Continue to chat' : 'Sign in'}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Verification failed</h1>
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="mt-6 inline-block text-sm text-blue-600 hover:underline"
            >
              {isAuthenticated ? 'Resend from profile' : 'Back to sign in'}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
