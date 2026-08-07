import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function useOnboardingStatus() {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ onboarding_completed_at?: string | null }>('/settings/company')
      .then(c => setDone(!!c.onboarding_completed_at))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { done, loading }
}
