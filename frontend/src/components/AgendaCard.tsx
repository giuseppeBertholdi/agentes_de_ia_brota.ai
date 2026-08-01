import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Heart, Clock, ShieldAlert, FileText as FileTextIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn, fmtCurrency, initials } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'

type AgendaKind = 'follow_up' | 'conversation_attention' | 'pending_approval' | 'stale_quote'

interface AgendaItem {
  kind: AgendaKind
  id: string
  date: string | null
  contact_name: string | null
  contact_phone: string | null
  conversation_id: string | null
  title: string
  subtitle: string | null
  amount: number | null
}

const KIND_ICON: Record<AgendaKind, typeof Heart> = {
  follow_up: Heart,
  conversation_attention: Clock,
  pending_approval: ShieldAlert,
  stale_quote: FileTextIcon,
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function bucketOf(item: AgendaItem, today: Date, tomorrow: Date, in7: Date): 'agora' | 'hoje' | 'amanha' | 'semana' | 'depois' {
  // itens que representam algo já acontecendo (não um agendamento futuro) vão pro "Agora"
  if (item.kind !== 'follow_up') return 'agora'
  if (!item.date) return 'agora'
  const d = new Date(`${item.date}T00:00:00`)
  if (isSameDay(d, today)) return 'hoje'
  if (isSameDay(d, tomorrow)) return 'amanha'
  if (d > today && d <= in7) return 'semana'
  return 'depois'
}

const BUCKET_LABEL: Record<string, string> = {
  agora: 'Agora',
  hoje: 'Hoje',
  amanha: 'Amanhã',
  semana: 'Próximos 7 dias',
  depois: 'Mais adiante',
}
const BUCKET_ORDER = ['agora', 'hoje', 'amanha', 'semana', 'depois']

export default function AgendaCard() {
  const [items, setItems] = useState<AgendaItem[]>([])
  const navigate = useNavigate()

  const load = () => api.get<AgendaItem[]>('/dashboard/agenda').then(setItems).catch(console.error)

  useEffect(() => { load() }, [])
  useRealtimeTable('post_sale_follow_ups', load)
  useRealtimeTable('conversations', load)
  useRealtimeTable('ai_pending_approvals', load)
  useRealtimeTable('quotes', load)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7)

  const grouped: Record<string, AgendaItem[]> = {}
  for (const item of items) {
    const b = bucketOf(item, today, tomorrow, in7)
    grouped[b] = grouped[b] || []
    grouped[b].push(item)
  }

  const goTo = (item: AgendaItem) => {
    if (item.kind === 'pending_approval') navigate('/app/approvals')
    else if (item.conversation_id) navigate('/app/inbox')
  }

  const total = items.length

  return (
    <Card className="mb-6">
      <CardHeader className="flex items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2"><CalendarClock size={18} /> Agenda</CardTitle>
        {total > 0 && <Badge variant="lime">{total} {total === 1 ? 'item' : 'itens'}</Badge>}
      </CardHeader>
      <CardContent className="pt-1">
        {total === 0 ? (
          <div className="py-8 flex flex-col items-center gap-1.5 text-center">
            <CalendarClock size={22} className="text-ink/15" />
            <p className="text-ink-faint text-xs font-body">Nada pendente por aqui. Bom trabalho!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {BUCKET_ORDER.filter(b => grouped[b]?.length).map(bucket => (
              <div key={bucket}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-1.5">
                  {BUCKET_LABEL[bucket]}
                </p>
                <div className="flex flex-col gap-1">
                  {grouped[bucket].map(item => {
                    const Icon = KIND_ICON[item.kind]
                    return (
                      <button
                        key={`${item.kind}-${item.id}`}
                        onClick={() => goTo(item)}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-cream-2 transition-colors text-left w-full"
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex-none flex items-center justify-center',
                          item.kind === 'pending_approval' ? 'bg-lime/40' : 'bg-green-soft'
                        )}>
                          {item.contact_name || item.contact_phone ? (
                            <span className="font-display font-bold text-green-deep text-[10px]">
                              {initials(item.contact_name || item.contact_phone || '?')}
                            </span>
                          ) : (
                            <Icon size={13} className="text-green-deep" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-body font-semibold text-xs text-ink truncate">
                            {item.contact_name || item.contact_phone || item.title}
                          </div>
                          <div className="text-ink-faint text-[11px] font-body truncate">
                            {item.title}{item.subtitle ? ` — ${item.subtitle}` : ''}
                          </div>
                        </div>
                        {item.amount != null && (
                          <span className="font-mono font-bold text-xs text-ink flex-none">{fmtCurrency(item.amount)}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
