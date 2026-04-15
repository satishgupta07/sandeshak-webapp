export default function ChatPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 bg-white">
        <p className="p-4 text-sm text-gray-400">Conversations</p>
      </aside>

      {/* Main area */}
      <main className="flex flex-1 items-center justify-center bg-gray-50">
        <p className="text-gray-400">Select a conversation</p>
      </main>
    </div>
  )
}
