import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { useCheckout } from '@/hooks/useCheckout'

export default function UpgradeCard() {
  const { active, loading: statusLoading } = useSubscription()
  const { start, loading: starting } = useCheckout()

  if (statusLoading || active) return null

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-ink rounded-xl shadow-soft-md">
      <div className="w-10 h-10 rounded-full bg-green flex items-center justify-center flex-none">
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
        onClick={start}
        disabled={starting}
        className="flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green text-white rounded-lg font-body font-semibold text-sm hover:bg-green-deep transition-colors disabled:opacity-60"
      >
        {starting ? <><Loader2 size={15} className="animate-spin" /> Abrindo…</> : <>Assinar agora <ArrowRight size={15} /></>}
      </button>
    </div>
  )
}
