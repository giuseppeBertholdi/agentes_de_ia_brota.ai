import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Onboarding from '@/pages/Onboarding'
import OnboardingVideo from '@/pages/OnboardingVideo'
import OnboardingActivate from '@/pages/OnboardingActivate'
import Dashboard from '@/pages/Dashboard'
import Inbox from '@/pages/Inbox'
import Approvals from '@/pages/Approvals'
import Quotes from '@/pages/Quotes'
import Reports from '@/pages/Reports'
import PostSale from '@/pages/PostSale'
import ContextLibrary from '@/pages/Context'
import Team from '@/pages/Team'
import Settings from '@/pages/Settings'
import Landing from '@/pages/Landing'
import Terms from '@/pages/legal/Terms'
import Privacy from '@/pages/legal/Privacy'

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

// quem já concluiu o onboarding não deve ver o wizard de novo, mesmo entrando
// direto pela URL (ex: aba antiga aberta, botão "voltar" do navegador)
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { done, loading } = useOnboardingStatus()
  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-ink border-t-green rounded-full animate-spin" />
    </div>
  )
  if (done) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<Privacy />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingRoute><OnboardingVideo /></OnboardingRoute></ProtectedRoute>} />
        <Route path="/onboarding/chat" element={<ProtectedRoute><OnboardingRoute><Onboarding /></OnboardingRoute></ProtectedRoute>} />
        <Route path="/onboarding/activate" element={<ProtectedRoute><OnboardingRoute><OnboardingActivate /></OnboardingRoute></ProtectedRoute>} />

        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="reports" element={<Reports />} />
          <Route path="post-sale" element={<PostSale />} />
          <Route path="context" element={<ContextLibrary />} />
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
