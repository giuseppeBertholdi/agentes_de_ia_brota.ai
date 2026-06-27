import { useEffect, useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AiAssistant from '@/components/AiAssistant'
import { api } from '@/lib/api'

interface Company {
  business_desc?: string
}

export default function AppLayout() {
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [configVersion, setConfigVersion] = useState(0)

  useEffect(() => {
    api.get<Company>('/settings/company')
      .then(c => setIsFirstTime(!c.business_desc))
      .catch(() => {})
  }, [])

  const handleConfigChanged = useCallback(() => {
    setIsFirstTime(false)
    setConfigVersion(v => v + 1)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-cream font-body">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet key={configVersion} />
        </div>
      </main>
      <AiAssistant isFirstTime={isFirstTime} onConfigChanged={handleConfigChanged} />
    </div>
  )
}
