import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../lib/api'
import { uploadFile } from '../lib/upload'
import { useAuthStore } from '../store/auth'
import type { ApiResponse, UpdateProfileRequest, UserDTO } from '../types'

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
      // Reset the input so picking the same file again retriggers onChange
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back to chat
          </Link>
          <button type="button" onClick={onLogout} className="text-sm text-red-600 hover:underline">
            Log out
          </button>
        </div>

        {!user.isVerified && (
          <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3">
            <p className="text-sm text-yellow-900">
              Your email is unverified. Some features may be limited.
            </p>
            <button
              type="button"
              onClick={onResendVerify}
              disabled={verifySending}
              className="mt-2 text-sm font-medium text-yellow-900 underline disabled:opacity-50"
            >
              {verifySending ? 'Sending…' : 'Send verification email'}
            </button>
            {verifyMessage && <p className="mt-2 text-sm text-yellow-900">{verifyMessage}</p>}
          </div>
        )}

        {/* Avatar */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-700">Profile photo</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-200">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-gray-500">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onAvatarChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          {uploadError && <p className="mt-3 text-sm text-red-600">{uploadError}</p>}
        </div>

        {/* Profile fields */}
        <form onSubmit={onSaveProfile} className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-700">About you</h2>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={user.email}
              disabled
              className="mt-1 block w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={139}
              rows={3}
              className="mt-1 block w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-gray-400">{bio.length}/139</span>
          </label>

          {profileError && <p className="mt-4 text-sm text-red-600">{profileError}</p>}

          <button
            type="submit"
            disabled={savingProfile}
            className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
