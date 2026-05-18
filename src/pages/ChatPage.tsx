import { Link, useNavigate } from 'react-router-dom'
import ChatWindow from '../components/ChatWindow'
import ConversationList from '../components/ConversationList'
import UserSearch from '../components/UserSearch'
import { useChatSocket } from '../hooks/useChatSocket'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useChatStore } from '../store/chat'

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const clearAuth = useAuthStore((s) => s.clear)
  const clearChat = useChatStore((s) => s.clear)
  const activeId = useChatStore((s) => s.activeConversationId)
  const navigate = useNavigate()

  useChatSocket()

  async function onLogout() {
    if (refreshToken) {
      api('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    clearChat()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {user && !user.isVerified && (
        <div className="border-b border-border bg-warning/10 px-4 py-2 text-center text-xs text-warning sm:text-sm">
          Your email isn&apos;t verified.{' '}
          <Link to="/profile" className="font-medium underline underline-offset-2">
            Verify in profile
          </Link>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: full-width on mobile when no chat selected; fixed-width on md+ */}
        <aside
          className={`${
            activeId ? 'hidden md:flex' : 'flex'
          } w-full flex-col border-r border-border bg-sidebar md:w-[340px] lg:w-[380px]`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
            <Link
              to="/profile"
              className="group flex min-w-0 items-center gap-3 rounded-lg p-1 text-sm font-medium text-sidebar-foreground transition hover:bg-surface-hover"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-sm font-semibold text-primary-foreground">
                  {user?.name.charAt(0).toUpperCase() ?? '?'}
                </span>
              )}
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-semibold">{user?.name ?? '—'}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  View profile
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
          <UserSearch />
          <ConversationList />
        </aside>

        {/* Chat: hidden on mobile until a conversation is active */}
        <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          <ChatWindow />
        </div>
      </div>
    </div>
  )
}
