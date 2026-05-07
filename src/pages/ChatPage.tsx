import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clear = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  async function onLogout() {
    if (refreshToken) {
      // Best-effort revocation — even if it fails we clear locally below.
      api('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // ignore
      })
    }
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen flex-col">
      {user && !user.isVerified && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-900">
          Your email isn&apos;t verified.{' '}
          <Link to="/profile" className="font-medium underline">
            Verify in profile
          </Link>
        </div>
      )}

      <div className="flex flex-1">
        <aside className="flex w-80 flex-col border-r border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 p-4">
            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                  {user?.name.charAt(0).toUpperCase() ?? '?'}
                </span>
              )}
              {user?.name ?? '—'}
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="text-sm text-blue-600 hover:underline"
            >
              Log out
            </button>
          </div>
          <p className="p-4 text-sm text-gray-400">Conversations</p>
        </aside>

        <main className="flex flex-1 items-center justify-center bg-gray-50">
          <p className="text-gray-400">Select a conversation</p>
        </main>
      </div>
    </div>
  )
}
