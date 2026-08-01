import { useEffect, useState } from 'react'
import { ShieldAlert, Check, X as XIcon, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { fmtCurrency, fmtDate, initials } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'

interface QuoteItem { name: string; qty: number; unit_price: number; subtotal: number }

interface Approval {
  id: string
  conversation_id: string
  requested_items: QuoteItem[]
  requested_total: number
  max_allowed_items: QuoteItem[]
  max_allowed_total: number
  created_at: string
  conversations?: { contact_name?: string; contact_phone?: string }
}

function ItemList({ items }: { items: QuoteItem[] }) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((it, i) => (
        <div key={i} className="flex justify-between text-xs font-body">
          <span className="text-ink-soft">{it.qty}× {it.name}</span>
          <span className="font-mono font-bold text-ink">{fmtCurrency(it.subtotal || it.unit_price * it.qty)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Approvals() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = () => api.get<Approval[]>('/approvals/pending').then(setApprovals).catch(console.error).finally(() => setLoading(false))

  useEffect(() => { load() }, [])
  useRealtimeTable('ai_pending_approvals', load)

  const resolve = async (id: string, action: 'approve' | 'reject') => {
    setActing(id)
    try {
      await api.post(`/approvals/${id}/${action}`)
      await load()
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-ink flex items-center gap-2">
          <ShieldAlert size={20} className="text-green-deep" /> Aprovações
        </h1>
        <p className="text-ink-soft text-sm font-body mt-1">
          Pedidos de desconto acima do limite configurado — a IA não fecha esses sozinha,
          fica esperando sua decisão. Enquanto isso, ela continua respondendo o cliente
          normalmente sobre qualquer outro assunto.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => <div key={i} className="animate-pulse bg-ink/5 rounded-xl h-40" />)}
        </div>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-2 text-center">
            <ShieldAlert size={28} className="text-ink/15" />
            <p className="text-ink-faint text-sm font-body">Nenhuma aprovação pendente no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {approvals.map(a => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="w-9 h-9 rounded-full bg-green-soft flex-none flex items-center justify-center font-display font-bold text-green-deep text-xs">
                  {initials(a.conversations?.contact_name || a.conversations?.contact_phone || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm">{a.conversations?.contact_name || a.conversations?.contact_phone || 'Cliente'}</CardTitle>
                  <div className="text-ink-faint text-xs font-mono">{fmtDate(a.created_at)}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-cream-2 border border-ink/10 rounded-md">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-faint mb-1.5">Pedido pelo cliente</div>
                    <ItemList items={a.requested_items} />
                    <div className="flex justify-between text-sm font-body font-bold border-t border-ink/15 mt-2 pt-1.5">
                      <span>Total</span>
                      <span className="text-red-600">{fmtCurrency(a.requested_total)}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-tint border border-green/25 rounded-md">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-green-deep mb-1.5">Máximo permitido hoje</div>
                    <ItemList items={a.max_allowed_items} />
                    <div className="flex justify-between text-sm font-body font-bold border-t border-green/25 mt-2 pt-1.5">
                      <span>Total</span>
                      <span className="text-green-deep">{fmtCurrency(a.max_allowed_total)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary" size="sm"
                    onClick={() => resolve(a.id, 'approve')}
                    disabled={acting === a.id}
                  >
                    {acting === a.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Aprovar desconto pedido
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => resolve(a.id, 'reject')}
                    disabled={acting === a.id}
                  >
                    <XIcon size={14} /> Recusar e oferecer máximo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
