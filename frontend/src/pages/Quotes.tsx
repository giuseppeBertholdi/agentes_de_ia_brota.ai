import { useEffect, useState } from 'react'
import { FileText, TrendingUp, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { fmtCurrency, fmtDate, initials } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'
import { cn } from '@/lib/utils'

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

type FilterStatus = 'all' | 'pending' | 'sent' | 'accepted' | 'rejected'

const filters: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'sent', label: 'Enviadas' },
  { key: 'accepted', label: 'Aceitas' },
  { key: 'rejected', label: 'Recusadas' },
]

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')

  const load = () => api.get<Quote[]>('/quotes/').then(setQuotes).catch(console.error)

  useEffect(() => { load() }, [])
  useRealtimeTable('quotes', load)

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/quotes/${id}/status?status=${status}`)
    load()
  }

  const total = quotes.reduce((s, q) => s + (q.total || 0), 0)
  const accepted = quotes.filter(q => q.status === 'accepted')
  const conversionRate = quotes.length > 0 ? Math.round((accepted.length / quotes.length) * 100) : 0

  const visible = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Cotações</h1>
        <p className="text-ink-soft text-sm mt-1 font-body">Histórico de cotações geradas pelo bot</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md border-2 border-ink bg-green-soft flex items-center justify-center flex-none">
              <FileText size={19} className="text-green-deep" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ink">{quotes.length}</div>
              <div className="text-ink-soft text-xs font-body mt-0.5">Total de cotações</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md border-2 border-ink bg-lime/30 flex items-center justify-center flex-none">
              <CheckCircle2 size={19} className="text-ink" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ink">{accepted.length}</div>
              <div className="text-ink-soft text-xs font-body mt-0.5">
                Aceitas
                {quotes.length > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] text-green font-bold">
                    {conversionRate}% conversão
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md border-2 border-ink bg-cream-2 flex items-center justify-center flex-none">
              <TrendingUp size={19} className="text-ink" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ink">{fmtCurrency(total)}</div>
              <div className="text-ink-soft text-xs font-body mt-0.5">Valor total cotado</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3.5 py-1.5 rounded-md border-2 font-body font-semibold text-xs transition-all',
              filter === f.key
                ? 'bg-ink text-white border-ink shadow-hard'
                : 'bg-white text-ink-soft border-ink/20 hover:border-ink/50 hover:text-ink'
            )}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className={cn('ml-1.5 font-mono', filter === f.key ? 'text-white/60' : 'text-ink-faint')}>
                {quotes.filter(q => q.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0 border-b border-ink/10">
          <div className="flex items-center gap-4 pb-3">
            <CardTitle>Histórico</CardTitle>
            <Badge variant="default" className="ml-auto">{visible.length} {visible.length === 1 ? 'cotação' : 'cotações'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={36} className="mx-auto mb-3 text-ink/20" />
              <p className="text-ink-faint text-sm font-body">
                {filter === 'all'
                  ? 'Nenhuma cotação ainda. Elas aparecem aqui quando o bot gerar uma.'
                  : `Nenhuma cotação com status "${statusConfig[filter as keyof typeof statusConfig]?.label}".`}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 bg-cream/60 border-b border-ink/10">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-faint">Cliente</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-faint">Data</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-faint">Total</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-faint">Status</span>
              </div>
              <div className="divide-y divide-ink/8">
                {visible.map(q => (
                  <div key={q.id}>
                    <div
                      className="grid md:grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-cream/50 cursor-pointer transition-colors"
                      onClick={() => setExpanded(e => e === q.id ? null : q.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-soft border-2 border-ink flex-none flex items-center justify-center font-display font-bold text-green-deep text-xs">
                          {initials(q.contact_name || q.contact_phone || '?')}
                        </div>
                        <div>
                          <div className="font-body font-bold text-sm text-ink">{q.contact_name || q.contact_phone}</div>
                          <div className="text-ink-faint text-xs font-mono md:hidden">{fmtDate(q.created_at)}</div>
                        </div>
                      </div>
                      <span className="hidden md:block text-ink-soft text-xs font-mono">{fmtDate(q.created_at)}</span>
                      <span className="font-display font-bold text-sm text-ink">{fmtCurrency(q.total || 0)}</span>
                      <Badge variant={statusConfig[q.status]?.variant}>{statusConfig[q.status]?.label}</Badge>
                    </div>

                    {expanded === q.id && (
                      <div className="bg-cream-2 border-t border-ink/10 px-5 py-4 md:ml-16">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-3">Itens da cotação</p>
                        <div className="flex flex-col gap-1.5 mb-4">
                          {(q.items || []).map((it, i) => (
                            <div key={i} className="flex justify-between text-sm font-body">
                              <span className="text-ink">{it.qty}× {it.name}</span>
                              <span className="font-bold text-ink font-mono text-xs">{fmtCurrency(it.subtotal || it.unit_price * it.qty)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-body font-bold border-t border-ink/20 pt-2 mt-1">
                            <span className="text-ink">Total</span>
                            <span className="text-green font-mono">{fmtCurrency(q.total || 0)}</span>
                          </div>
                        </div>
                        {q.notes && (
                          <p className="text-ink-soft text-xs font-body italic mb-3">"{q.notes}"</p>
                        )}
                        <div className="flex gap-2">
                          {q.status !== 'accepted' && (
                            <Button size="sm" variant="primary" onClick={() => updateStatus(q.id, 'accepted')}>Marcar aceita</Button>
                          )}
                          {q.status !== 'rejected' && (
                            <Button size="sm" variant="danger" onClick={() => updateStatus(q.id, 'rejected')}>Recusada</Button>
                          )}
                          {q.status !== 'sent' && (
                            <Button size="sm" variant="ghost" onClick={() => updateStatus(q.id, 'sent')}>Marcar enviada</Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
