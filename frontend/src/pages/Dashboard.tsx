import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, FileText, TrendingUp, Zap, Sparkles, Send, Loader2, ArrowRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatTile } from '@/components/ui/stat-tile'
import { Badge } from '@/components/ui/badge'
import { cn, fmtCurrency, initials } from '@/lib/utils'
import { api } from '@/lib/api'
import { useRealtimeTable } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { AiChatPanel, useAiChat, CAPABILITIES } from '@/components/AiAssistant'
import PaywallModal from '@/components/PaywallModal'
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

const statusLabel: Record<string, string> = { bot: 'Bot', human: 'Humano', resolved: 'Resolvido' }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityDay[]>([])
  const [recentConvs, setRecentConvs] = useState<RecentConversation[]>([])
  const { user } = useAuth()
  const navigate = useNavigate()
  const chat = useAiChat()

  const name: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'por aqui'

  const firstName = name.split(' ')[0]

  const load = () => {
    api.get<Stats>('/quotes/dashboard').then(setStats).catch(console.error)
    api.get<ActivityDay[]>('/quotes/activity').then(setActivity).catch(console.error)
    api.get<RecentConversation[]>('/conversations/').then(cs => setRecentConvs(cs.slice(0, 5))).catch(console.error)
  }

  useEffect(() => { load() }, [])
  useRealtimeTable('conversations', load)
  useRealtimeTable('quotes', load)

  const tiles = [
    {
      label: 'Conversas ativas',
      value: stats?.conversations_total ?? '—',
      icon: MessageSquare,
      iconColor: 'text-green-deep',
      badge: `${stats?.conversations_bot ?? 0} no bot`,
      badgeVariant: 'green' as const,
    },
    {
      label: 'Cotações hoje',
      value: stats?.quotes_today ?? '—',
      icon: FileText,
      iconColor: 'text-ink',
      badge: `${stats?.quotes_week ?? 0} na semana`,
      badgeVariant: 'lime' as const,
    },
    {
      label: 'Receita (semana)',
      value: stats ? fmtCurrency(stats.revenue_week) : '—',
      icon: TrendingUp,
      iconColor: 'text-ink',
      badge: 'aceitas',
      badgeVariant: 'default' as const,
    },
    {
      label: 'Mensagens hoje',
      value: stats?.messages_today ?? '—',
      icon: Zap,
      iconColor: 'text-green',
      badge: 'pelo bot',
      badgeVariant: 'green' as const,
    },
  ]

  const hasConversation = chat.messages.some(m => !m.isInitial)

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* Hero da IA — input central, primeira coisa que a pessoa vê */}
        {!hasConversation ? (
          <div className="max-w-xl mx-auto text-center py-6 mb-8">
            <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-green flex items-center justify-center shadow-soft">
              <Sparkles size={18} className="text-lime" />
            </div>
            <h1 className="font-display font-bold text-2xl text-ink tracking-tight mb-1.5">
              {greeting()}, {firstName}. O que vamos fazer hoje?
            </h1>
            <p className="text-ink-soft text-sm font-body mb-5">
              Peça pra IA criar setores, ajustar preços, configurar agentes ou tirar qualquer dúvida — ela faz na hora, sem formulário.
            </p>

            <div className="relative">
              <input
                ref={chat.inputRef}
                value={chat.input}
                onChange={e => chat.setInput(e.target.value)}
                onKeyDown={chat.onKeyDown}
                disabled={chat.loading}
                placeholder="Ex: crie um setor de RH e ative o agente de cotação…"
                className="w-full pl-5 pr-14 py-4 text-sm font-body text-ink bg-white border border-ink/10 rounded-full shadow-soft focus:outline-none focus:shadow-soft-md transition-all placeholder:text-ink-faint"
              />
              <button
                onClick={() => chat.send()}
                disabled={!chat.input.trim() || chat.loading}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center border border-ink/10 transition-all',
                  chat.input.trim() && !chat.loading
                    ? 'bg-green text-white hover:bg-green-deep'
                    : 'bg-cream-2 text-ink-faint cursor-not-allowed'
                )}
              >
                {chat.loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {CAPABILITIES.map(cap => (
                <button
                  key={cap.label}
                  onClick={() => chat.quickSend(cap.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-ink/10 rounded-full text-xs font-body font-semibold text-ink hover:bg-green hover:text-white hover:border-green-deep transition-colors"
                >
                  <cap.icon size={12} />
                  {cap.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto mb-8">
            <AiChatPanel
              {...chat}
              onInputChange={chat.setInput}
              onQuickSend={chat.quickSend}
              className="h-[440px]"
            />
          </div>
        )}

        <div className="mb-3">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint">Resumo da operação</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {tiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>

        <AgendaCard />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <CardTitle>Atividade da semana</CardTitle>
              <div className="flex items-center gap-4 text-xs font-mono text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-green inline-block rounded-full" />
                  Conversas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-lime inline-block rounded-full" />
                  Cotações
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {activity.every(d => d.conversas === 0 && d.cotacoes === 0) ? (
                <div className="h-[220px] flex flex-col items-center justify-center gap-1.5 text-center">
                  <TrendingUp size={22} className="text-ink/15" />
                  <p className="text-ink-faint text-xs font-body">Sem atividade nos últimos 7 dias ainda.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={activity} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1F8A4C" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1F8A4C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gCot" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C7F25C" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#C7F25C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2D9C4" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontFamily: 'Space Mono', fontSize: 11, fill: '#7C8A7F' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontFamily: 'Space Mono', fontSize: 11, fill: '#7C8A7F' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13, border: '2px solid #16241C', borderRadius: 7, boxShadow: '4px 4px 0 #16241C', background: '#fff' }}
                      cursor={{ stroke: '#16241C', strokeWidth: 1, strokeDasharray: '4 2' }}
                    />
                    <Area type="monotone" dataKey="conversas" stroke="#1F8A4C" strokeWidth={2} fill="url(#gConv)" name="Conversas" dot={false} activeDot={{ r: 4, fill: '#1F8A4C', stroke: '#16241C', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="cotacoes" stroke="#8aab00" strokeWidth={2} fill="url(#gCot)" name="Cotações" dot={false} activeDot={{ r: 4, fill: '#C7F25C', stroke: '#16241C', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-2 pb-2">
              <CardTitle>Conversas recentes</CardTitle>
              <button
                onClick={() => navigate('/app/inbox')}
                className="flex items-center gap-1 text-green-deep text-xs font-body font-bold hover:underline underline-offset-2"
              >
                Ver todas <ArrowRight size={11} />
              </button>
            </CardHeader>
            <CardContent className="pt-1 flex flex-col gap-1">
              {recentConvs.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-1.5 text-center">
                  <MessageSquare size={20} className="text-ink/15" />
                  <p className="text-ink-faint text-xs font-body">Nenhuma conversa ainda.</p>
                </div>
              ) : recentConvs.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate('/app/inbox')}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-cream-2 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-green-soft flex-none flex items-center justify-center font-display font-bold text-green-deep text-xs">
                    {initials(c.contact_name || c.contact_phone || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-semibold text-xs text-ink truncate">{c.contact_name || c.contact_phone}</div>
                  </div>
                  <Badge variant={c.status === 'bot' ? 'green' : c.status === 'human' ? 'yellow' : 'gray'} className="text-[9px] flex-none">
                    {statusLabel[c.status]}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <PaywallModal open={chat.paywallRequired} onClose={chat.dismissPaywall} />
    </div>
  )
}
