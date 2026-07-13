import { useState } from 'react'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useSubscription } from '@/hooks/useSubscription'

export default function UpgradeCard() {
  const { active, loading: statusLoading } = useSubscription()
  const [starting, setStarting] = useState(false)

  if (statusLoading || active) return null

  const subscribe = async () => {
    setStarting(true)
    try {
      const { url } = await api.post<{ url: string }>('/billing/checkout-session')
      window.location.href = url
    } catch {
      setStarting(false)
    }
  }

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-ink border-2 border-ink rounded-xl shadow-hard-md">
      <div className="w-10 h-10 rounded-full bg-green border-2 border-lime/40 flex items-center justify-center flex-none">
        <Sparkles size={18} className="text-lime" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-base text-white leading-tight">
          Ative o WhatsApp com IA — <span className="text-lime">de R$207 por R$127/mês</span>
        </div>
        <p className="text-white/60 text-sm font-body mt-0.5">
          Conecte seu número e deixe a IA atendendo sozinha. Cancele quando quiser.
        </p>
      </div>
      <button
        onClick={subscribe}
        disabled={starting}
        className="flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green text-white border-2 border-lime/40 rounded-md shadow-hard font-body font-bold text-sm hover:bg-green-deep hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-60"
      >
        {starting ? <><Loader2 size={15} className="animate-spin" /> Abrindo…</> : <>Assinar agora <ArrowRight size={15} /></>}
      </button>
    </div>
  )
}
