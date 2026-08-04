import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AiAssistant from '@/components/AiAssistant'
import { api } from '@/lib/api'
import { useWhatsapp } from '@/hooks/useWhatsapp'
import { useSubscription } from '@/hooks/useSubscription'

// páginas que só fazem sentido com o bot realmente atendendo (assinatura ativa + WhatsApp conectado)
const GATED_PATHS = ['/app/inbox', '/app/approvals', '/app/quotes', '/app/reports', '/app/post-sale']

export default function AppLayout() {
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [checkedOnboarding, setCheckedOnboarding] = useState(false)
  const [configVersion, setConfigVersion] = useState(0)
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const { connected: waConnected, loading: waLoading } = useWhatsapp()
  const { active: subscriptionActive, loading: statusLoading } = useSubscription()

  const isDashboard = location.pathname === '/app/dashboard' || location.pathname === '/app'
  const isInbox = location.pathname === '/app/inbox'
  const statusReady = !waLoading && !statusLoading

  useEffect(() => { setNavOpen(false) }, [location.pathname])

  useEffect(() => {
    api.get<{ onboarding_completed_at?: string | null }>('/settings/company')
      .then(c => setOnboardingDone(!!c.onboarding_completed_at))
      .catch(() => {})
      .finally(() => setCheckedOnboarding(true))
  }, [configVersion])

  const handleConfigChanged = useCallback(() => {
    setConfigVersion(v => v + 1)
  }, [])

  // onboarding incompleto: manda de volta pro wizard — se já pagou e conectou, direto pro passo final
  if (checkedOnboarding && !onboardingDone && statusReady) {
    const target = subscriptionActive && waConnected ? '/onboarding/activate' : '/onboarding'
    return <Navigate to={target} replace />
  }

  // acesso direto por URL a páginas que dependem do bot ativo — manda pra Configurações
  if (statusReady && !(subscriptionActive && waConnected) && GATED_PATHS.includes(location.pathname)) {
    return <Navigate to="/app/settings" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream font-body">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet key={configVersion} />
        </div>
      </main>
      {!isDashboard && !isInbox && (
        <AiAssistant onConfigChanged={handleConfigChanged} />
      )}
    </div>
  )
}
