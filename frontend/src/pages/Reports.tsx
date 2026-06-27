import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare, FileText, TrendingUp, Percent, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { fmtCurrency } from '@/lib/utils'

interface WeekStats {
  conversations_new: number
  messages_total: number
  quotes_total: number
  quotes_accepted: number
  conversion_rate: number
  revenue_quoted: number
  revenue_closed: number
  top_products: { name: string; qty: number; revenue: number }[]
}

interface WeeklyReport {
  week_start: string
  week_end: string
  current: WeekStats
  previous: WeekStats
  comparison: {
    conversations_new: number | null
    quotes_total: number | null
    revenue_closed: number | null
  }
}

function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-faint text-xs font-mono">— sem base</span>
  const positive = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${positive ? 'text-green' : 'text-red-500'}`}>
      {positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value).toFixed(1)}% vs. semana anterior
    </span>
  )
}

export default function Reports() {
  const [offset, setOffset] = useState(0)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get<WeeklyReport>(`/reports/weekly?offset=${offset}`)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [offset])

  const tiles = report ? [
    { label: 'Novas conversas', value: report.current.conversations_new, icon: MessageSquare, color: 'bg-green-soft', delta: report.comparison.conversations_new },
    { label: 'Cotações geradas', value: report.current.quotes_total, icon: FileText, color: 'bg-lime/30', delta: report.comparison.quotes_total },
    { label: 'Receita fechada', value: fmtCurrency(report.current.revenue_closed), icon: TrendingUp, color: 'bg-cream-2', delta: report.comparison.revenue_closed },
    { label: 'Taxa de conversão', value: `${report.current.conversion_rate}%`, icon: Percent, color: 'bg-green-tint', delta: null },
  ] : []

  return (
    <div className="p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Relatórios</h1>
          <p className="text-ink-soft text-sm mt-1 font-body">Resumo semanal da operação</p>
        </div>
        <div className="flex items-center gap-1 bg-white border-2 border-ink rounded-md shadow-hard overflow-hidden">
          <Button variant="ghost" size="sm" onClick={() => setOffset(o => o + 1)} className="border-0 shadow-none rounded-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0 border-r-2 border-ink/10">
            <ChevronLeft size={15} />
          </Button>
          <span className="font-mono text-xs text-ink px-3 min-w-[160px] text-center">
            {report ? `${fmtDateBR(report.week_start)} – ${fmtDateBR(report.week_end)}` : '…'}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0} className="border-0 shadow-none rounded-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0 border-l-2 border-ink/10">
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>

      {loading && !report ? (
        <div className="text-ink-faint text-sm font-body py-10 text-center">Carregando…</div>
      ) : report && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {tiles.map(({ label, value, icon: Icon, color, delta }) => (
              <Card key={label}>
                <CardContent className="pt-5">
                  <div className={`w-11 h-11 rounded-md border-2 border-ink ${color} flex items-center justify-center mb-4`}>
                    <Icon size={20} className="text-ink" />
                  </div>
                  <div className="font-display font-bold text-2xl text-ink mb-1">{value}</div>
                  <div className="text-ink-soft text-sm font-body mb-2">{label}</div>
                  {delta !== undefined && <Delta value={delta} />}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle>Produtos mais cotados</CardTitle></CardHeader>
              <CardContent className="p-0">
                {report.current.top_products.length === 0 ? (
                  <div className="p-5 text-ink-faint text-sm font-body">Nenhuma cotação com itens nesta semana.</div>
                ) : (
                  <div className="divide-y-2 divide-ink/10">
                    {report.current.top_products.map(p => (
                      <div key={p.name} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="font-body font-bold text-sm text-ink">{p.name}</div>
                          <div className="text-ink-faint text-xs font-mono">{p.qty}× cotado</div>
                        </div>
                        <div className="font-mono font-bold text-sm text-green">{fmtCurrency(p.revenue)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Resumo da semana</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex justify-between text-sm font-body">
                  <span className="text-ink-soft">Mensagens trocadas</span>
                  <span className="font-bold text-ink">{report.current.messages_total}</span>
                </div>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-ink-soft">Cotações aceitas</span>
                  <span className="font-bold text-ink">{report.current.quotes_accepted} de {report.current.quotes_total}</span>
                </div>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-ink-soft">Valor total cotado</span>
                  <span className="font-bold text-ink">{fmtCurrency(report.current.revenue_quoted)}</span>
                </div>
                <div className="flex justify-between text-sm font-body border-t-2 border-ink/10 pt-3">
                  <span className="text-ink-soft">Valor fechado</span>
                  <span className="font-bold text-green">{fmtCurrency(report.current.revenue_closed)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
