import { Navigate, Outlet } from 'react-router-dom'

// TODO: replace with real auth store check (Phase 1)
function useIsAuthenticated() {
  return false
}

export default function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
