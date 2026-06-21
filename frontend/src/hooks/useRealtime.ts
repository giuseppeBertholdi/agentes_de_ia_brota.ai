import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Handler = (payload: Record<string, unknown>) => void

export function useRealtimeTable(table: string, onEvent: Handler, filter?: string) {
  useEffect(() => {
    const channel = supabase.channel(`rt-${table}-${filter ?? 'all'}`)
    channel
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        onEvent as any,
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, filter]) // eslint-disable-line react-hooks/exhaustive-deps
}
