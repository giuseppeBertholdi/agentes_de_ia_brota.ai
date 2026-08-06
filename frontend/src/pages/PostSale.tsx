import { Heart, RefreshCw, AlertTriangle, Lock, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatTile } from '@/components/ui/stat-tile'

export default function PostSale() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 opacity-40 pointer-events-none select-none">
        <StatTile label="Pesquisas pendentes" value="—" icon={Heart} iconColor="text-green-deep" />
        <StatTile label="Fluxos de recompra" value="—" icon={RefreshCw} />
        <StatTile label="Clientes em risco" value="—" icon={AlertTriangle} iconColor="text-red-600" />
      </div>

      <Card>
        <CardContent className="flex flex-col items-center text-center gap-3 py-16 px-6">
          <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center">
            <Lock size={18} className="text-lime" />
          </div>
          <h2 className="font-display font-bold text-lg text-ink">Pós-venda bloqueado</h2>
          <p className="text-ink-soft text-sm font-body max-w-md">
            Estamos ajustando o envio automático de follow-ups e a detecção de clientes em risco.
            Essa área volta a ficar disponível em breve.
          </p>
          <div className="flex items-center gap-1.5 text-ink-faint text-xs font-mono font-bold uppercase tracking-wide mt-1">
            <Clock size={12} /> Em breve
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
