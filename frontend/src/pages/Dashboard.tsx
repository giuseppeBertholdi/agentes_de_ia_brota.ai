import { useEffect, useState } from 'react'
import { MessageSquare, FileText, TrendingUp, Zap, ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { fmtCurrency } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { AiChatPanel, useAiChat } from '@/components/AiAssistant'

interface Stats {
  conversations_total: number
  conversations_bot: number
  quotes_today: number
  quotes_week: number
  revenue_week: number
  messages_today: number
}

const mockChart = [
  { day: 'Seg', conversas: 12, cotacoes: 4 },
  { day: 'Ter', conversas: 18, cotacoes: 7 },
  { day: 'Qua', conversas: 14, cotacoes: 5 },
  { day: 'Qui', conversas: 22, cotacoes: 9 },
  { day: 'Sex', conversas: 30, cotacoes: 11 },
  { day: 'Sáb', conversas: 8, cotacoes: 3 },
  { day: 'Dom', conversas: 5, cotacoes: 2 },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

interface MetricTileProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  iconColor: string
  badge: string
  badgeVariant?: 'default' | 'green' | 'lime' | 'yellow'
}

function MetricTile({ label, value, icon: Icon, color, iconColor, badge, badgeVariant = 'default' }: MetricTileProps) {
  return (
    <Card className="hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md transition-all">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-4">
          <p className="font-body text-sm text-ink-soft font-medium">{label}</p>
          <div className={`w-9 h-9 rounded-md border-2 border-ink ${color} flex items-center justify-center flex-none`}>
            <Icon size={17} className={iconColor} />
          </div>
        </div>
        <div className="font-display font-bold text-3xl text-ink tracking-tight mb-3">{value}</div>
        <Badge variant={badgeVariant} className="text-[10px]">
          <ArrowUpRight size={10} className="mr-0.5" />
          {badge}
        </Badge>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const { user } = useAuth()
  const chat = useAiChat()

  const name: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'por aqui'

  const firstName = name.split(' ')[0]

  const load = () => api.get<Stats>('/quotes/dashboard').then(setStats).catch(console.error)

  useEffect(() => { load() }, [])
  useRealtimeTable('conversations', load)
  useRealtimeTable('quotes', load)

  const tiles: MetricTileProps[] = [
    {
      label: 'Conversas ativas',
      value: stats?.conversations_total ?? '—',
      icon: MessageSquare,
      color: 'bg-green-soft',
      iconColor: 'text-green-deep',
      badge: `${stats?.conversations_bot ?? 0} no bot`,
      badgeVariant: 'green',
    },
    {
      label: 'Cotações hoje',
      value: stats?.quotes_today ?? '—',
      icon: FileText,
      color: 'bg-lime/30',
      iconColor: 'text-ink',
      badge: `${stats?.quotes_week ?? 0} essa semana`,
      badgeVariant: 'lime',
    },
    {
      label: 'Receita (semana)',
      value: stats ? fmtCurrency(stats.revenue_week) : '—',
      icon: TrendingUp,
      color: 'bg-cream-2',
      iconColor: 'text-ink',
      badge: 'cotações aceitas',
    },
    {
      label: 'Mensagens hoje',
      value: stats?.messages_today ?? '—',
      icon: Zap,
      color: 'bg-green-tint',
      iconColor: 'text-green',
      badge: 'pelo bot',
      badgeVariant: 'green',
    },
  ]

  return (
    <div className="flex h-full min-h-0">
      {/* Coluna principal — métricas + gráfico */}
      <div className="flex-1 overflow-y-auto p-8 min-w-0">
        <div className="mb-8">
          <h2 className="font-display font-bold text-2xl text-ink tracking-tight">
            {greeting()}, {firstName}
          </h2>
          <p className="text-ink-soft text-sm mt-1 font-body">
            Aqui está o resumo da sua operação hoje.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {tiles.map((tile) => (
            <MetricTile key={tile.label} {...tile} />
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={mockChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
                <YAxis tick={{ fontFamily: 'Space Mono', fontSize: 11, fill: '#7C8A7F' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13, border: '2px solid #16241C', borderRadius: 7, boxShadow: '4px 4px 0 #16241C', background: '#fff' }}
                  cursor={{ stroke: '#16241C', strokeWidth: 1, strokeDasharray: '4 2' }}
                />
                <Area type="monotone" dataKey="conversas" stroke="#1F8A4C" strokeWidth={2} fill="url(#gConv)" name="Conversas" dot={false} activeDot={{ r: 4, fill: '#1F8A4C', stroke: '#16241C', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="cotacoes" stroke="#8aab00" strokeWidth={2} fill="url(#gCot)" name="Cotações" dot={false} activeDot={{ r: 4, fill: '#C7F25C', stroke: '#16241C', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Coluna do chat — fixada à direita */}
      <div className="w-[340px] flex-none border-l-2 border-ink flex flex-col p-4 bg-cream-2">
        <div className="flex items-center gap-2 mb-3 flex-none">
          <div className="w-6 h-6 rounded-full bg-green border-2 border-lime/40 flex items-center justify-center">
            <Zap size={12} className="text-lime" fill="currentColor" />
          </div>
          <span className="font-display font-bold text-sm text-ink">Assistente IA</span>
          <span className="ml-auto font-mono text-[9px] text-ink-faint uppercase tracking-wide">Configuração & Dados</span>
        </div>
        <AiChatPanel
          {...chat}
          onInputChange={chat.setInput}
          onQuickSend={chat.quickSend}
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  )
}
