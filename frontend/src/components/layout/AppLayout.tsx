import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AiAssistant from '@/components/AiAssistant'
import { api } from '@/lib/api'

interface Company {
  name?: string
  plan?: string
  business_desc?: string
}

export default function AppLayout() {
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [configVersion, setConfigVersion] = useState(0)
  const location = useLocation()

  const isDashboard = location.pathname === '/app/dashboard' || location.pathname === '/app'

  useEffect(() => {
    api.get<Company>('/settings/company')
      .then(c => { setCompany(c); setIsFirstTime(!c.business_desc) })
      .catch(() => {})
  }, [configVersion])

  const handleConfigChanged = useCallback(() => {
    setIsFirstTime(false)
    setConfigVersion(v => v + 1)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-cream font-body">
      <Sidebar company={company} />
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
