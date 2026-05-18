import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthShell, {
  AuthField,
  authInputClass,
  authPrimaryButtonClass,
} from '../components/AuthShell'
import { ApiError, api } from '../lib/api'
import { selectIsAuthenticated, useAuthStore } from '../store/auth'
import type { ApiResponse, ForgotPasswordRequest } from '../types'

export default function ForgotPasswordPage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body: ForgotPasswordRequest = { email }
      await api<ApiResponse<{ sent: true }>>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${email}, we sent a reset link. It expires in 1 hour.`}
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            ← Back to sign in
          </Link>
        }
      >
        <div className="flex justify-center py-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </span>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="We'll email you a link to reset it."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={authInputClass}
          />
        </AuthField>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
