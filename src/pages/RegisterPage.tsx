import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell, {
  AuthField,
  authInputClass,
  authPrimaryButtonClass,
} from '../components/AuthShell'
import { ApiError, api } from '../lib/api'
import { selectIsAuthenticated, useAuthStore } from '../store/auth'
import type { ApiResponse, AuthResponse, RegisterRequest } from '../types'

export default function RegisterPage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const body: RegisterRequest = { name, email, password }
      const response = await api<ApiResponse<AuthResponse>>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
        skipAuth: true,
      })
      setAuth(response.data.user, response.data.tokens)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Join Sandeshak — chat with anyone, anywhere"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            autoComplete="name"
            className={authInputClass}
          />
        </AuthField>

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

        <AuthField label="Password">
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

        <AuthField label="Confirm password">
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
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
