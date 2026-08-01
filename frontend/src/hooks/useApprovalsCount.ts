import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRealtimeTable } from '@/hooks/useRealtime'

/** Quantas solicitações de desconto fora da política estão aguardando aprovação. */
export function useApprovalsCount() {
  const [count, setCount] = useState(0)

  const load = () =>
    api.get<{ count: number }>('/approvals/pending-count').then(r => setCount(r.count)).catch(() => {})

  useEffect(() => { load() }, [])
  useRealtimeTable('ai_pending_approvals', load)

  return count
}
