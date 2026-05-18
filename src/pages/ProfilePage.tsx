import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../lib/api'
import { uploadFile } from '../lib/upload'
import { useAuthStore } from '../store/auth'
import type { ApiResponse, UpdateProfileRequest, UserDTO } from '../types'

const inputClass =
  'block w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25 focus:outline-none'

const fieldLabelClass =
  'mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground uppercase'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const setUser = useAuthStore((s) => s.setUser)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)

  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [verifySending, setVerifySending] = useState(false)

  if (!user) return null

  async function onSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileError(null)
    setSavingProfile(true)
    try {
      const body: UpdateProfileRequest = { name, bio: bio || undefined }
      const res = await api<ApiResponse<UserDTO>>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setUser(res.data)
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function onRemoveAvatar() {
    setUploadError(null)
    setRemovingAvatar(true)
    try {
      const res = await api<ApiResponse<UserDTO>>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: null }),
      })
      setUser(res.data)
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setRemovingAvatar(false)
    }
  }

  async function onAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const { url } = await uploadFile(file, 'image')
      const res = await api<ApiResponse<UserDTO>>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: url }),
      })
      setUser(res.data)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function onResendVerify() {
    setVerifyMessage(null)
    setVerifySending(true)
    try {
      const res = await api<ApiResponse<{ sent: boolean; alreadyVerified?: boolean }>>(
        '/auth/send-verification-email',
        { method: 'POST' },
      )
      setVerifyMessage(
        res.data.alreadyVerified
          ? 'Already verified.'
          : 'Verification email sent — check your inbox.',
      )
    } catch (err) {
      setVerifyMessage(err instanceof ApiError ? err.message : 'Network error')
    } finally {
      setVerifySending(false)
    }
  }

  async function onLogout() {
    if (refreshToken) {
      api('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] bg-background py-6 sm:py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to chat
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>

        <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Manage how others see you on Sandeshak.
        </p>

        {!user.isVerified && (
          <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-warning">Email not verified</p>
                <p className="mt-0.5 text-xs text-warning/90">
                  Some features may be limited until you verify your email.
                </p>
                <button
                  type="button"
                  onClick={onResendVerify}
                  disabled={verifySending}
                  className="mt-2 text-xs font-semibold text-warning underline underline-offset-2 disabled:opacity-50"
                >
                  {verifySending ? 'Sending…' : 'Send verification email'}
                </button>
                {verifyMessage && <p className="mt-2 text-xs text-warning/90">{verifyMessage}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Avatar */}
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">Profile photo</h2>
          <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-border">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-hover text-2xl font-semibold text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <label
                className={`cursor-pointer rounded-xl border border-border bg-surface-2 px-4 py-2 text-center text-sm font-medium text-foreground transition hover:bg-surface-hover ${
                  uploading || removingAvatar ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                {uploading ? 'Uploading…' : 'Change photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onAvatarChange}
                  disabled={uploading || removingAvatar}
                  className="hidden"
                />
              </label>
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={uploading || removingAvatar}
                  className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                >
                  {removingAvatar ? 'Removing…' : 'Remove photo'}
                </button>
              )}
            </div>
          </div>
          {uploadError && <p className="mt-3 text-sm text-destructive">{uploadError}</p>}
        </section>

        {/* Profile fields */}
        <form
          onSubmit={onSaveProfile}
          className="mt-5 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold text-foreground">About you</h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={fieldLabelClass}>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={fieldLabelClass}>Email</span>
              <input
                type="email"
                value={user.email}
                disabled
                className="block w-full cursor-not-allowed rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-muted-foreground"
              />
            </label>

            <label className="block">
              <span className={fieldLabelClass}>Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={139}
                rows={3}
                placeholder="Say something about yourself…"
                className={`${inputClass} resize-none`}
              />
              <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                {bio.length}/139
              </span>
            </label>
          </div>

          {profileError && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {profileError}
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
