import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Inbox from '@/pages/Inbox'
import Quotes from '@/pages/Quotes'
import Reports from '@/pages/Reports'
import PostSale from '@/pages/PostSale'
import Team from '@/pages/Team'
import Settings from '@/pages/Settings'
import Landing from '@/pages/Landing'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-ink border-t-green rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="reports" element={<Reports />} />
          <Route path="post-sale" element={<PostSale />} />
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
