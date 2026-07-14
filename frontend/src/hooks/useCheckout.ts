import { useState } from 'react'
import { api } from '@/lib/api'

export function useCheckout() {
  const [loading, setLoading] = useState(false)

  const start = async () => {
    setLoading(true)
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout-session')
      window.location.href = url
      return true
    } catch {
      setLoading(false)
      return false
    }
  }

  return { start, loading }
}
