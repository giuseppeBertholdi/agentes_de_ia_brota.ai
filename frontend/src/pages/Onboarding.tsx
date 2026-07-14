import { useNavigate } from 'react-router-dom'
import { Zap, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AiChatPanel, useAiChat } from '@/components/AiAssistant'
import { api } from '@/lib/api'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const name: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    ''
  const firstName = name.split(' ')[0]

  const finishOnboarding = async () => {
    try { await api.post('/settings/onboarding/complete') } catch { /* segue mesmo se falhar */ }
    navigate('/app/dashboard')
  }

  const chat = useAiChat(true, undefined)
  const configured = chat.messages.some(m => m.actions?.some(a => a.type === 'update_company'))

  const skip = () => {
    sessionStorage.setItem('onboarding_skipped', '1')
    finishOnboarding()
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" style={{ backgroundImage: 'url(/doodles.svg)', backgroundSize: '320px' }}>
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 font-display font-bold text-2xl text-ink mb-3">
            <Zap size={22} className="text-green" fill="currentColor" />
            Plimpost<span className="text-green">.</span>
          </span>
          <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-green flex items-center justify-center shadow-soft">
            <Sparkles size={18} className="text-lime" />
          </div>
          <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
            {firstName ? `Vamos deixar tudo pronto, ${firstName}` : 'Vamos deixar tudo pronto'}
          </h1>
          <p className="text-ink-soft text-sm font-body mt-1.5 max-w-md mx-auto">
            Conta pra IA como seu negócio funciona — ela já monta os preços, o tom de atendimento e os
            setores certos. Leva uns 2 minutos, e dá pra ajustar qualquer coisa depois em Configurações.
          </p>
        </div>

        <AiChatPanel
          {...chat}
          onInputChange={chat.setInput}
          onQuickSend={chat.quickSend}
          className="h-[440px] shadow-soft-md"
        />

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={skip}
            className="text-ink-faint text-xs font-body hover:text-ink-soft transition-colors underline-offset-2 hover:underline"
          >
            Pular por enquanto
          </button>

          {configured && (
            <button
              onClick={finishOnboarding}
              className="px-4 py-2 bg-green text-white border border-ink/10 rounded-md shadow-soft font-body font-bold text-xs hover:shadow-soft-md transition-shadow"
            >
              Ir para o Dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
