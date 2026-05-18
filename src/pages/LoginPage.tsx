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
import type { ApiResponse, AuthResponse, LoginRequest } from '../types'

export default function LoginPage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body: LoginRequest = { email, password }
      const response = await api<ApiResponse<AuthResponse>>('/auth/login', {
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
      title="Welcome back"
      subtitle="Sign in to continue to Sandeshak"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
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

        <AuthField label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={authInputClass}
          />
        </AuthField>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
