import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function useWhatsapp() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<{ status?: string }>('/settings/whatsapp')
      setConnected(r.status === 'connected')
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { connected, loading, refresh }
}
