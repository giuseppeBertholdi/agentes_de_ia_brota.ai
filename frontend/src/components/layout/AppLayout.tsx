import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AiAssistant from '@/components/AiAssistant'
import { api } from '@/lib/api'

export default function AppLayout() {
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [checkedFirstTime, setCheckedFirstTime] = useState(false)
  const [configVersion, setConfigVersion] = useState(0)
  const location = useLocation()

  const isDashboard = location.pathname === '/app/dashboard' || location.pathname === '/app'

  useEffect(() => {
    api.get<{ business_desc?: string }>('/settings/company')
      .then(c => setIsFirstTime(!c.business_desc))
      .catch(() => {})
      .finally(() => setCheckedFirstTime(true))
  }, [configVersion])

  const handleConfigChanged = useCallback(() => {
    setIsFirstTime(false)
    setConfigVersion(v => v + 1)
  }, [])

  // primeiro acesso: manda pro onboarding guiado, a menos que a pessoa já tenha pulado nesta sessão
  const skippedOnboarding = sessionStorage.getItem('onboarding_skipped') === '1'
  if (checkedFirstTime && isFirstTime && !skippedOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream font-body">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet key={configVersion} />
        </div>
      </main>
      {!isDashboard && (
        <AiAssistant isFirstTime={isFirstTime} onConfigChanged={handleConfigChanged} />
      )}
    </div>
  )
}
