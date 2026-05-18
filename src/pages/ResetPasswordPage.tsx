import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell, {
  AuthField,
  authInputClass,
  authPrimaryButtonClass,
} from '../components/AuthShell'
import { ApiError, api } from '../lib/api'
import { selectIsAuthenticated, useAuthStore } from '../store/auth'
import type { ApiResponse, ResetPasswordRequest } from '../types'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  if (!token) {
    return (
      <AuthShell
        title="Invalid link"
        subtitle="This reset link is missing or malformed."
        footer={
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new link
          </Link>
        }
      >
        <div />
      </AuthShell>
    )
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const body: ResetPasswordRequest = { token: token!, newPassword: password }
      await api<ApiResponse<{ reset: true }>>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Enter your new password below.">
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField label="New password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={authInputClass}
          />
        </AuthField>

        <AuthField label="Confirm new password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className={authInputClass}
          />
        </AuthField>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
          {submitting ? 'Saving…' : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  )
}
