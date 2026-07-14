import { useState } from 'react'
import { X, Zap, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

const BENEFITS = [
  'WhatsApp conectado e respondendo sozinho, 24h por dia',
  'IA gerando cotações e organizando conversas automaticamente',
  'Setores, agentes e pós-venda sem limite',
]

interface PaywallModalProps {
  open: boolean
  onClose: () => void
}

export default function PaywallModal({ open, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const subscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout-session')
      window.location.href = url
    } catch {
      setError('Não foi possível iniciar o checkout. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-[2px]">
      <div className="w-full max-w-sm bg-cream border border-ink/10 rounded-xl shadow-soft-lg overflow-hidden msg-in">
        <div className="flex items-center justify-between px-5 py-4 bg-ink">
          <span className="inline-flex items-center gap-2 font-display font-bold text-lg text-white">
            <Zap size={18} className="text-lime" fill="currentColor" />
            Plimpost<span className="text-lime">.</span>
          </span>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-display font-bold text-xl text-ink tracking-tight">
              Desbloqueie o WhatsApp com IA
            </h2>
            <p className="text-ink-soft text-sm font-body mt-1.5 leading-relaxed">
              O onboarding é grátis — para conectar o WhatsApp e deixar a IA atendendo de verdade, ative sua assinatura.
            </p>
          </div>

          <div className="flex items-end gap-2 p-3 bg-white border border-ink/10 rounded-md shadow-soft">
            <span className="text-ink-faint text-sm font-body line-through">R$ 207</span>
            <span className="font-display font-bold text-3xl text-ink leading-none">R$ 127</span>
            <span className="text-ink-soft text-xs font-body mb-0.5">/mês</span>
          </div>

          <div className="flex flex-col gap-2">
            {BENEFITS.map(b => (
              <div key={b} className="flex items-start gap-2 text-sm font-body text-ink">
                <span className="w-4 h-4 mt-0.5 rounded-full bg-green border border-ink flex items-center justify-center flex-none">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </span>
                {b}
              </div>
            ))}
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 rounded-md text-red-700 text-xs font-body">
              {error}
            </div>
          )}

          <Button variant="primary" onClick={subscribe} disabled={loading} className="w-full justify-center">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Abrindo checkout…</> : 'Assinar agora — R$ 127/mês'}
          </Button>
          <button
            onClick={onClose}
            className="text-ink-faint text-xs font-body hover:text-ink-soft transition-colors text-center underline-offset-2 hover:underline"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
