import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import BootGate from './components/BootGate'
import ProtectedRoute from './components/ProtectedRoute'
import SlowServerBanner from './components/SlowServerBanner'
import ChatPage from './pages/ChatPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

export default function App() {
  return (
    <BootGate>
      <BrowserRouter>
        <SlowServerBanner />
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Email verification works whether signed-in or not */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </BootGate>
  )
}
