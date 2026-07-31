import { useEffect, useId } from 'react'
import { supabase } from '@/lib/supabase'

type Handler = (payload: Record<string, unknown>) => void

export function useRealtimeTable(table: string, onEvent: Handler, filter?: string) {
  // cada chamada do hook precisa do seu próprio canal — duas instâncias
  // observando a mesma tabela (ex: barra lateral + página do Inbox, ambas
  // montadas ao mesmo tempo) não podem compartilhar o mesmo nome de canal,
  // senão a segunda tentativa de `.on()` derruba a aplicação inteira
  const instanceId = useId()

  useEffect(() => {
    const channel = supabase.channel(`rt-${table}-${filter ?? 'all'}-${instanceId}`)
    channel
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        onEvent as any,
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, filter, instanceId]) // eslint-disable-line react-hooks/exhaustive-deps
}
