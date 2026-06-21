import { useEffect, useState } from 'react'
import { MessageSquare, FileText, TrendingUp, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { fmtCurrency } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'

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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  const load = () => api.get<Stats>('/quotes/dashboard').then(setStats).catch(console.error)

  useEffect(() => { load() }, [])
  useRealtimeTable('conversations', load)
  useRealtimeTable('quotes', load)

  const tiles = [
    { label: 'Conversas ativas', value: stats?.conversations_total ?? '—', icon: MessageSquare, color: 'bg-green-soft', badge: `${stats?.conversations_bot ?? 0} no bot` },
    { label: 'Cotações hoje', value: stats?.quotes_today ?? '—', icon: FileText, color: 'bg-lime/30', badge: `${stats?.quotes_week ?? 0} na semana` },
    { label: 'Receita (semana)', value: stats ? fmtCurrency(stats.revenue_week) : '—', icon: TrendingUp, color: 'bg-cream-2', badge: 'cotações enviadas' },
    { label: 'Mensagens hoje', value: stats?.messages_today ?? '—', icon: Zap, color: 'bg-green-tint', badge: 'pelo bot' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight">Dashboard</h1>
        <p className="text-ink-soft text-sm mt-1 font-body">Visão geral da sua operação</p>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {tiles.map(({ label, value, icon: Icon, color, badge }) => (
          <Card key={label} className="hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md transition-all">
            <CardContent className="pt-5">
              <div className={`w-11 h-11 rounded-md border-2 border-ink ${color} flex items-center justify-center mb-4`}>
                <Icon size={20} className="text-ink" />
              </div>
              <div className="font-display font-bold text-2xl text-ink mb-1">{value}</div>
              <div className="text-ink-soft text-sm font-body mb-2">{label}</div>
              <Badge>{badge}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade da semana</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mockChart}>
              <defs>
                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1F8A4C" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#1F8A4C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C7F25C" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#C7F25C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2D9C4" />
              <XAxis dataKey="day" tick={{ fontFamily: 'Space Mono', fontSize: 11 }} />
              <YAxis tick={{ fontFamily: 'Space Mono', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13, border: '2px solid #16241C', borderRadius: 7, boxShadow: '4px 4px 0 #16241C' }}
              />
              <Area type="monotone" dataKey="conversas" stroke="#1F8A4C" strokeWidth={2.5} fill="url(#gConv)" name="Conversas" />
              <Area type="monotone" dataKey="cotacoes" stroke="#C7F25C" strokeWidth={2.5} fill="url(#gCot)" name="Cotações" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
