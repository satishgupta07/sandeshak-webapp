import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell, { authPrimaryButtonClass } from '../components/AuthShell'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'pending') {
    return (
      <AuthShell title="Verifying…" subtitle="Please wait a moment.">
        <div className="flex justify-center py-2">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      </AuthShell>
    )
  }

  if (status === 'success') {
    return (
      <AuthShell title="Email verified" subtitle="Your email has been confirmed. You're all set.">
        <div className="flex flex-col items-center gap-4 py-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <Link to={isAuthenticated ? '/' : '/login'} className={authPrimaryButtonClass}>
            {isAuthenticated ? 'Continue to chat' : 'Sign in'}
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Verification failed"
      subtitle={errorMessage ?? undefined}
      footer={
        <Link
          to={isAuthenticated ? '/profile' : '/login'}
          className="font-medium text-primary hover:underline"
        >
          {isAuthenticated ? 'Resend from profile' : 'Back to sign in'}
        </Link>
      }
    >
      <div className="flex justify-center py-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
      </div>
    </AuthShell>
  )
}
