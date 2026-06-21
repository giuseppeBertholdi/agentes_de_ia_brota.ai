import { useEffect, useState } from 'react'
import { FileText, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { fmtCurrency, fmtDate } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'

interface Quote {
  id: string
  contact_name: string
  contact_phone: string
  items: { name: string; qty: number; unit_price: number; subtotal: number }[]
  total: number
  status: 'pending' | 'sent' | 'accepted' | 'rejected'
  created_at: string
  notes: string
}

const statusConfig = {
  pending: { label: 'Pendente', variant: 'yellow' as const },
  sent: { label: 'Enviada', variant: 'green' as const },
  accepted: { label: 'Aceita', variant: 'lime' as const },
  rejected: { label: 'Recusada', variant: 'red' as const },
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = () => api.get<Quote[]>('/quotes/').then(setQuotes).catch(console.error)

  useEffect(() => { load() }, [])
  useRealtimeTable('quotes', load)

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/quotes/${id}/status?status=${status}`)
    load()
  }

  const total = quotes.reduce((s, q) => s + (q.total || 0), 0)
  const accepted = quotes.filter(q => q.status === 'accepted')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight">Cotações</h1>
        <p className="text-ink-soft text-sm mt-1 font-body">Histórico de cotações geradas pelo bot</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md border-2 border-ink bg-green-soft flex items-center justify-center">
              <FileText size={20} className="text-green-deep" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ink">{quotes.length}</div>
              <div className="text-ink-soft text-sm">Total de cotações</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md border-2 border-ink bg-lime/30 flex items-center justify-center">
              <TrendingUp size={20} className="text-ink" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ink">{accepted.length}</div>
              <div className="text-ink-soft text-sm">Aceitas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md border-2 border-ink bg-cream-2 flex items-center justify-center">
              <TrendingUp size={20} className="text-ink" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ink">{fmtCurrency(total)}</div>
              <div className="text-ink-soft text-sm">Valor total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {quotes.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm font-body">
              Nenhuma cotação ainda. Elas aparecem aqui automaticamente quando o bot gerar uma.
            </div>
          ) : (
            <div className="divide-y-2 divide-ink/10">
              {quotes.map(q => (
                <div key={q.id}>
                  <div
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream/60 cursor-pointer transition-colors"
                    onClick={() => setExpanded(e => e === q.id ? null : q.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-soft border-2 border-ink flex-none flex items-center justify-center font-display font-bold text-green-deep text-sm">
                      {(q.contact_name || q.contact_phone || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-bold text-sm text-ink">{q.contact_name || q.contact_phone}</div>
                      <div className="text-ink-faint text-xs font-mono">{fmtDate(q.created_at)}</div>
                    </div>
                    <div className="font-display font-bold text-ink">{fmtCurrency(q.total || 0)}</div>
                    <Badge variant={statusConfig[q.status]?.variant}>{statusConfig[q.status]?.label}</Badge>
                  </div>

                  {expanded === q.id && (
                    <div className="bg-cream-2 border-t-2 border-ink/10 px-5 py-4">
                      <div className="mb-3">
                        <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-2">Itens</div>
                        <div className="flex flex-col gap-1.5">
                          {(q.items || []).map((it, i) => (
                            <div key={i} className="flex justify-between text-sm font-body">
                              <span className="text-ink">{it.qty}× {it.name}</span>
                              <span className="font-bold text-ink">{fmtCurrency(it.subtotal || it.unit_price * it.qty)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-body font-bold border-t-2 border-ink/20 pt-2 mt-1">
                            <span>Total</span>
                            <span className="text-green">{fmtCurrency(q.total || 0)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {q.status !== 'accepted' && (
                          <Button size="sm" variant="primary" onClick={() => updateStatus(q.id, 'accepted')}>Aceita</Button>
                        )}
                        {q.status !== 'rejected' && (
                          <Button size="sm" variant="danger" onClick={() => updateStatus(q.id, 'rejected')}>Recusada</Button>
                        )}
                        {q.status !== 'sent' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(q.id, 'sent')}>Marcar como enviada</Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
