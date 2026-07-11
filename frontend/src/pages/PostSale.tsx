import { useEffect, useState } from 'react'
import { Heart, RefreshCw, AlertTriangle, Send, Check, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatTile } from '@/components/ui/stat-tile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/utils'

interface FollowUp {
  id: string
  contact_name: string
  contact_phone: string
  type: 'satisfaction' | 'repurchase'
  message: string
  scheduled_for: string
  status: 'pending' | 'done' | 'skipped'
}

interface ChurnRisk {
  id: string
  contact_name: string
  contact_phone: string
  last_message_at: string
}

const TYPE_CONFIG = {
  satisfaction: { label: 'Pesquisa de satisfação', icon: Heart, variant: 'green' as const },
  repurchase: { label: 'Fluxo de recompra', icon: RefreshCw, variant: 'lime' as const },
}

export default function PostSale() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    api.get<FollowUp[]>('/post-sale/follow-ups?status=pending').then(setFollowUps).catch(console.error)
    api.get<ChurnRisk[]>('/post-sale/churn-risks').then(setChurnRisks).catch(console.error)
  }

  useEffect(() => { load() }, [])

  const act = async (id: string, action: 'send' | 'done' | 'skipped') => {
    setBusyId(id)
    setError(null)
    try {
      if (action === 'send') {
        await api.post(`/post-sale/follow-ups/${id}/send`)
      } else {
        await api.patch(`/post-sale/follow-ups/${id}`, { status: action })
      }
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar')
    } finally {
      setBusyId(null)
    }
  }

  const overdue = (date: string) => new Date(date) <= new Date()

  return (
    <div className="p-8">
      <div className="mb-7">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Pós-venda</h1>
        <p className="text-ink-soft text-sm mt-1 font-body">Acompanhamento automático depois da venda</p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border-2 border-red-400 rounded-md text-red-700 text-sm font-body">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatTile
          label="Pesquisas pendentes"
          value={followUps.filter(f => f.type === 'satisfaction').length}
          icon={Heart}
          iconColor="text-green-deep"
        />
        <StatTile
          label="Fluxos de recompra"
          value={followUps.filter(f => f.type === 'repurchase').length}
          icon={RefreshCw}
        />
        <StatTile
          label="Clientes em risco"
          value={churnRisks.length}
          icon={AlertTriangle}
          iconColor="text-red-600"
        />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Follow-ups pendentes</CardTitle></CardHeader>
        <CardContent className="p-0">
          {followUps.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm font-body">
              Nenhum follow-up pendente. Eles aparecem aqui automaticamente quando uma cotação é aceita.
            </div>
          ) : (
            <div className="divide-y-2 divide-ink/10">
              {followUps.map(f => {
                const cfg = TYPE_CONFIG[f.type]
                const Icon = cfg.icon
                return (
                  <div key={f.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-full bg-cream-2 border-2 border-ink flex-none flex items-center justify-center">
                      <Icon size={16} className="text-ink" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-body font-bold text-sm text-ink">{f.contact_name || f.contact_phone}</span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {overdue(f.scheduled_for) ? (
                          <Badge variant="yellow">Pronto pra enviar</Badge>
                        ) : (
                          <span className="text-ink-faint text-xs font-mono">agendado p/ {fmtDate(f.scheduled_for)}</span>
                        )}
                      </div>
                      <p className="text-ink-soft text-sm font-body">{f.message}</p>
                    </div>
                    <div className="flex gap-2 flex-none">
                      <Button size="sm" variant="primary" disabled={busyId === f.id} onClick={() => act(f.id, 'send')}>
                        <Send size={13} /> Enviar agora
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === f.id} onClick={() => act(f.id, 'done')}>
                        <Check size={13} />
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === f.id} onClick={() => act(f.id, 'skipped')}>
                        <X size={13} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle size={18} className="text-red-600" /> Clientes em risco de churn</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {churnRisks.length === 0 ? (
            <div className="p-10 text-center text-ink-faint text-sm font-body">
              Nenhum cliente parado há mais de 14 dias entre os que já compraram. 🎉
            </div>
          ) : (
            <div className="divide-y-2 divide-ink/10">
              {churnRisks.map(c => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-body font-bold text-sm text-ink">{c.contact_name || c.contact_phone}</div>
                    <div className="text-ink-faint text-xs font-mono">{c.contact_phone}</div>
                  </div>
                  <div className="text-ink-soft text-xs font-mono">sem contato desde {fmtDate(c.last_message_at)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
