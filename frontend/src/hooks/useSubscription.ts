import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled'

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<{ status: SubscriptionStatus }>('/billing/status')
      setStatus(r.status)
    } catch {
      setStatus('inactive')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { status, active: status === 'active', loading, refresh }
}
