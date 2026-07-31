import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRealtimeTable } from '@/hooks/useRealtime'

/** Quantas conversas têm cotação fechada esperando um humano cobrar o pagamento. */
export function useHandoffCount() {
  const [count, setCount] = useState(0)

  const load = () =>
    api.get<{ count: number }>('/conversations/handoff-count').then(r => setCount(r.count)).catch(() => {})

  useEffect(() => { load() }, [])
  useRealtimeTable('conversations', load)

  return count
}
