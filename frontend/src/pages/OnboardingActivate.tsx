import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Smartphone, ArrowRight, CheckCircle2, PartyPopper } from 'lucide-react'
import { api } from '@/lib/api'
import { useSubscription } from '@/hooks/useSubscription'
import { useCheckout } from '@/hooks/useCheckout'
import { useWhatsappConnection } from '@/hooks/useWhatsappConnection'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import { Button } from '@/components/ui/button'

export default function OnboardingActivate() {
  const navigate = useNavigate()
  const [entering, setEntering] = useState(false)

  const { active: subscriptionActive, loading: subLoading } = useSubscription()
  const { start: startCheckout, loading: startingCheckout } = useCheckout()
  const { wa, waLoading, waError, confirmingPayment, connectWa } = useWhatsappConnection()

  const connected = wa?.status === 'connected'

  const enterApp = async () => {
    setEntering(true)
    try { await api.post('/settings/onboarding/complete') } catch { /* segue mesmo se falhar */ }
    navigate('/app/dashboard')
  }

  return (
    <OnboardingShell step={3}>
      <div className="text-center mb-5">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
          {connected ? 'Tudo pronto!' : 'Última etapa: ativar seu WhatsApp'}
        </h1>
        <p className="text-ink-soft text-sm font-body mt-1.5 max-w-md mx-auto">
          {connected
            ? 'Seu WhatsApp está conectado e a IA já pode atender.'
            : 'Assine o plano e conecte seu número — sem isso a IA ainda não consegue atender de verdade.'}
        </p>
      </div>

      <div className="bg-white border border-ink/10 rounded-xl shadow-soft-md p-6">
        {confirmingPayment ? (
          <div className="flex flex-col items-center gap-2.5 py-8 text-center">
            <Loader2 size={24} className="animate-spin text-green" />
            <p className="text-ink-soft text-sm font-body">Confirmando seu pagamento…</p>
          </div>
        ) : subLoading ? (
          <div className="flex flex-col items-center gap-2.5 py-8">
            <Loader2 size={24} className="animate-spin text-ink-faint" />
          </div>
        ) : !subscriptionActive ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-end gap-2 p-3 bg-cream-2 border border-ink/10 rounded-md">
              <span className="text-ink-faint text-sm font-body line-through">R$ 207</span>
              <span className="font-display font-bold text-3xl text-ink leading-none">R$ 127</span>
              <span className="text-ink-soft text-xs font-body mb-0.5">/mês</span>
            </div>
            <ul className="text-ink-soft text-sm font-body flex flex-col gap-1.5 text-left">
              <li>✓ WhatsApp conectado e respondendo sozinho, 24h por dia</li>
              <li>✓ IA gerando cotações e organizando conversas automaticamente</li>
              <li>✓ Setores, agentes e pós-venda sem limite</li>
            </ul>
            <Button
              variant="primary"
              onClick={() => startCheckout('/onboarding/activate')}
              disabled={startingCheckout}
              className="w-full justify-center"
            >
              {startingCheckout ? <><Loader2 size={15} className="animate-spin" /> Abrindo…</> : <>Assinar e continuar <ArrowRight size={15} /></>}
            </Button>
          </div>
        ) : connected ? (
          <div className="flex flex-col items-center gap-4 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-tint border border-green/30 flex items-center justify-center">
              <PartyPopper size={24} className="text-green" />
            </div>
            <div>
              <div className="font-body font-bold text-ink text-sm">{wa.display_phone_number}</div>
              {wa.verified_name && <div className="text-ink-faint text-xs font-body">{wa.verified_name}</div>}
            </div>
            <Button variant="primary" onClick={enterApp} disabled={entering} className="w-full justify-center">
              {entering ? <><Loader2 size={15} className="animate-spin" /> Entrando…</> : <>Entrar no app <ArrowRight size={15} /></>}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            {waError && (
              <div className="w-full p-2.5 bg-red-50 border border-red-300 rounded-md text-red-700 text-xs font-body">
                {waError}
              </div>
            )}
            <div className="flex items-center gap-2 text-green text-sm font-body font-bold">
              <CheckCircle2 size={16} /> Assinatura ativa
            </div>
            <Button variant="primary" onClick={connectWa} disabled={waLoading} className="w-full justify-center">
              {waLoading ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
              {waLoading ? 'Conectando…' : 'Conectar WhatsApp'}
            </Button>
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}
