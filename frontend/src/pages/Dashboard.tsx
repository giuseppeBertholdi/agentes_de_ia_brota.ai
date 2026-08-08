import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X as XIcon, ArrowRight, Loader2, LayoutGrid, Rows3, Bot, UserRound } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn, fmtCurrency, initials } from '@/lib/utils'
import { api } from '@/lib/api'
import { useRealtimeTable } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { useWhatsapp } from '@/hooks/useWhatsapp'
import AgendaCard from '@/components/AgendaCard'

interface Stats {
  conversations_total: number
  conversations_bot: number
  quotes_today: number
  quotes_week: number
  revenue_week: number
  messages_today: number
}

interface ActivityDay { day: string; conversas: number; cotacoes: number }

interface RecentConversation {
  id: string
  contact_name: string
  contact_phone: string
  status: 'bot' | 'human' | 'resolved'
  last_message_at: string
}

interface QuoteItem { name: string; qty: number; unit_price: number; subtotal: number }
interface Approval {
  id: string
  requested_items: QuoteItem[]
  requested_total: number
  max_allowed_items: QuoteItem[]
  max_allowed_total: number
  conversations?: { contact_name?: string; contact_phone?: string }
}

const statusChip: Record<string, string> = {
  bot: 'bg-green-soft text-green-deep',
  human: 'bg-amber-soft text-amber-text',
  resolved: 'bg-cream-2 text-ink-soft',
}
const statusLabel: Record<string, string> = { bot: 'bot', human: 'com você', resolved: 'resolvido' }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function fmtDateLine() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityDay[]>([])
  const [recentConvs, setRecentConvs] = useState<RecentConversation[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [acting, setActing] = useState<string | null>(null)
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
  const [savingAiMode, setSavingAiMode] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [compact, setCompact] = useState(false)
  const { user } = useAuth()
  const { connected: waConnected } = useWhatsapp()
  const navigate = useNavigate()

  const name: string =
    (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'por aqui'
  const firstName = name.split(' ')[0]

  const load = () => {
    api.get<Stats>('/quotes/dashboard').then(setStats).catch(console.error)
    api.get<ActivityDay[]>('/quotes/activity').then(setActivity).catch(console.error)
    api.get<RecentConversation[]>('/conversations/').then(cs => setRecentConvs(cs.slice(0, 5))).catch(console.error)
    api.get<Approval[]>('/approvals/pending').then(setApprovals).catch(console.error)
    api.get<{ ai_enabled?: boolean }>('/settings/company').then(c => setAiEnabled(c.ai_enabled ?? true)).catch(console.error)
  }

  useEffect(() => { load() }, [])
  useRealtimeTable('conversations', load)
  useRealtimeTable('quotes', load)
  useRealtimeTable('ai_pending_approvals', load)

  const setAiMode = async (enabled: boolean) => {
    setSavingAiMode(true)
    try {
      await api.post('/settings/ai-mode', { enabled })
      setAiEnabled(enabled)
      load()
    } finally {
      setSavingAiMode(false)
    }
  }

  const resolveApproval = async (id: string, action: 'approve' | 'reject') => {
    setActing(id)
    try {
      await api.post(`/approvals/${id}/${action}`)
      load()
    } finally {
      setActing(null)
    }
  }

  const maxActivity = Math.max(1, ...activity.map(d => Math.max(d.conversas, d.cotacoes)))

  const kpis = [
    { label: 'Conversas ativas', value: stats?.conversations_total ?? '—', sub: stats ? `${stats.conversations_bot} no bot · ${stats.conversations_total - stats.conversations_bot} com você` : '' },
    { label: 'Cotações hoje', value: stats?.quotes_today ?? '—', sub: stats ? `${stats.quotes_week} na semana` : '' },
    { label: 'Receita (semana)', value: stats ? fmtCurrency(stats.revenue_week) : '—', sub: 'cotações aceitas' },
    { label: 'Mensagens hoje', value: stats?.messages_today ?? '—', sub: 'pelo bot' },
  ]

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-cream">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-xl sm:text-[22px] text-ink tracking-tight">{greeting()}, {firstName}</h1>
            <p className="text-ink-soft text-[13px] mt-1">{fmtDateLine()} · tudo rodando bem</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full',
              waConnected ? 'bg-green-soft text-green-deep' : 'bg-cream-2 text-ink-faint'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', waConnected ? 'bg-green' : 'bg-ink-faint')} />
              WhatsApp {waConnected ? 'conectado' : 'desconectado'}
            </span>
            <Button variant="primary" size="sm" onClick={() => navigate('/app/quotes')}>Nova cotação</Button>
            <div className="flex items-center gap-0.5 bg-cream-2 rounded-lg p-0.5">
              <button
                onClick={() => setCompact(false)}
                className={cn('p-1.5 rounded-md transition-colors', !compact ? 'bg-white text-green-deep shadow-xs' : 'text-ink-faint hover:text-ink-soft')}
                title="Visão completa"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setCompact(true)}
                className={cn('p-1.5 rounded-md transition-colors', compact ? 'bg-white text-green-deep shadow-xs' : 'text-ink-faint hover:text-ink-soft')}
                title="Modo compacto"
              >
                <Rows3 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Interruptor de IA */}
        {aiEnabled !== null && (
          <div className={cn(
            'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border',
            aiEnabled ? 'bg-white border-ink/8' : 'bg-ink border-ink'
          )}>
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-none', aiEnabled ? 'bg-green-soft' : 'bg-lime')}>
              {aiEnabled ? <Bot size={16} className="text-green-deep" /> : <UserRound size={16} className="text-ink" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('font-bold text-sm leading-tight', aiEnabled ? 'text-ink' : 'text-white')}>
                {aiEnabled ? 'IA respondendo automaticamente' : 'Modo humano — IA desligada'}
              </div>
              <p className={cn('text-xs mt-0.5', aiEnabled ? 'text-ink-soft' : 'text-white/60')}>
                {aiEnabled ? 'Todo atendimento novo passa pelos agentes de IA.' : 'Nada é respondido automaticamente — tudo cai no Inbox pra sua equipe.'}
              </p>
            </div>
            <Button
              variant={aiEnabled ? 'danger' : 'lime'}
              size="sm"
              className="flex-none"
              disabled={savingAiMode}
              onClick={() => aiEnabled ? setConfirmDisable(true) : setAiMode(true)}
            >
              {savingAiMode ? <Loader2 size={14} className="animate-spin" /> : aiEnabled ? 'Desabilitar IA' : 'Reativar IA'}
            </Button>
          </div>
        )}

        {compact ? (
          // ── Modo compacto (2b) ──────────────────────────────────────────
          <div className="flex flex-col gap-8 max-w-2xl">
            <div className="flex gap-8 py-5 border-y border-ink/8 flex-wrap">
              {kpis.slice(0, 3).map(k => (
                <div key={k.label}>
                  <div className="text-2xl font-extrabold text-ink">{k.value}</div>
                  <div className="text-xs text-ink-soft">{k.label.toLowerCase()}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-3.5">Só isso precisa de você</p>
              {approvals.length === 0 ? (
                <p className="text-ink-faint text-sm">Nada pendente — bom trabalho!</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {approvals.map(a => (
                    <div key={a.id} className="flex items-center gap-3.5 px-4.5 py-4 border border-ink/10 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-green flex-none" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          {a.conversations?.contact_name || 'Cliente'} pediu R$ {a.requested_total.toFixed(2)} — máximo é R$ {a.max_allowed_total.toFixed(2)}
                        </div>
                        <div className="text-xs text-ink-soft">Aguardando decisão</div>
                      </div>
                      <Button variant="primary" size="sm" disabled={acting === a.id} onClick={() => resolveApproval(a.id, 'approve')}>Decidir</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-3.5">O bot cuidou do resto</p>
              <div className="flex flex-col">
                {recentConvs.filter(c => c.status !== 'human').map(c => (
                  <div key={c.id} className="flex gap-3 py-2.5 border-b border-ink/6 text-sm last:border-0">
                    <span className="text-green font-bold">✓</span>
                    <span className="flex-1 truncate">{c.contact_name || c.contact_phone}</span>
                    <span className="text-ink-faint text-xs flex-none">
                      {new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // ── Visão completa (2a) ─────────────────────────────────────────
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {kpis.map(k => (
                <Card key={k.label} className="!shadow-xs">
                  <CardContent className="p-4.5 pt-5">
                    <div className="text-xs text-ink-soft mb-2">{k.label}</div>
                    <div className="text-[28px] font-extrabold text-ink leading-none">{k.value}</div>
                    <div className="text-xs text-green-deep mt-1.5">{k.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3.5 items-start">
              <div className="flex flex-col gap-3.5 min-w-0">
                <Card className="!shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="text-[15px] font-bold text-ink">Atividade da semana</span>
                      <div className="flex gap-3.5 text-[11px] text-ink-soft">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green inline-block" />Conversas</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-lime/40 inline-block" />Cotações</span>
                      </div>
                    </div>
                    {activity.length === 0 ? (
                      <div className="h-[130px] flex items-center justify-center text-ink-faint text-xs">Sem atividade ainda</div>
                    ) : (
                      <>
                        <div className="flex items-end gap-4 h-[130px]">
                          {activity.map(d => (
                            <div key={d.day} className="flex-1 flex items-end gap-1 h-full">
                              <div className="flex-1 bg-green rounded-t" style={{ height: `${Math.max(4, (d.conversas / maxActivity) * 100)}%` }} />
                              <div className="flex-1 bg-lime/40 rounded-t" style={{ height: `${Math.max(4, (d.cotacoes / maxActivity) * 100)}%` }} />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 pt-2 text-[11px] text-ink-faint">
                          {activity.map(d => <span key={d.day} className="flex-1 text-center">{d.day}</span>)}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="!shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[15px] font-bold text-ink">Conversas recentes</span>
                      <button onClick={() => navigate('/app/inbox')} className="text-[13px] text-green-deep font-semibold hover:underline">Ver inbox →</button>
                    </div>
                    <div className="flex flex-col">
                      {recentConvs.length === 0 ? (
                        <p className="text-ink-faint text-xs py-6 text-center">Nenhuma conversa ainda.</p>
                      ) : recentConvs.map(c => (
                        <div key={c.id} className="flex items-center gap-3 py-3 border-b border-ink/6 last:border-0">
                          <div className={cn('w-9 h-9 rounded-full flex-none grid place-items-center text-xs font-bold', statusChip[c.status])}>
                            {initials(c.contact_name || c.contact_phone || '?')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-ink truncate">{c.contact_name || c.contact_phone}</div>
                          </div>
                          <span className={cn('text-[11px] px-2.5 py-1 rounded-full flex-none', statusChip[c.status])}>{statusLabel[c.status]}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col gap-3.5">
                <Card className="!shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-[15px] font-bold text-ink">Precisa de você</span>
                      {approvals.length > 0 && (
                        <span className="text-[11px] font-bold bg-green text-white rounded-full px-2 py-0.5">{approvals.length}</span>
                      )}
                    </div>
                    {approvals.length === 0 ? (
                      <p className="text-ink-faint text-xs py-4 text-center">Nada pendente por aqui.</p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {approvals.map(a => (
                          <div key={a.id} className="p-3 bg-cream rounded-[10px]">
                            <div className="text-[13px] font-semibold text-ink">Desconto acima do limite</div>
                            <p className="text-xs text-ink-soft my-1">
                              {a.conversations?.contact_name || 'Cliente'} pediu R$ {a.requested_total.toFixed(2)} — máximo R$ {a.max_allowed_total.toFixed(2)}.
                            </p>
                            <div className="flex gap-2 mt-2.5">
                              <Button variant="primary" size="sm" disabled={acting === a.id} onClick={() => resolveApproval(a.id, 'approve')}>
                                {acting === a.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Aprovar
                              </Button>
                              <Button variant="ghost" size="sm" disabled={acting === a.id} onClick={() => resolveApproval(a.id, 'reject')}>
                                <XIcon size={12} /> Manter limite
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <AgendaCard />
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDisable}
        title="Desabilitar a IA?"
        message="Todas as conversas em andamento passam pro modo humano agora — ninguém mais recebe resposta automática até você reativar."
        confirmLabel="Desabilitar"
        variant="danger"
        onConfirm={() => { setConfirmDisable(false); setAiMode(false) }}
        onCancel={() => setConfirmDisable(false)}
      />
    </div>
  )
}
