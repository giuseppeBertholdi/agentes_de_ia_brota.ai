import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AiChatPanel, useAiChat } from '@/components/AiAssistant'
import OnboardingShell from '@/components/onboarding/OnboardingShell'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const name: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    ''
  const firstName = name.split(' ')[0]

  const chat = useAiChat(true, undefined, true)
  const ready = chat.messages.some(m => m.actions?.some(a => a.type === 'onboarding_ready'))

  const goToVideo = () => navigate('/onboarding/video')

  return (
    <OnboardingShell step={1}>
      <div className="text-center mb-5">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
          {firstName ? `Vamos te conhecer, ${firstName}` : 'Vamos te conhecer'}
        </h1>
        <p className="text-ink-soft text-sm font-body mt-1.5 max-w-md mx-auto">
          Uma conversa rápida, sem formulário — a IA pergunta só o que precisa pra já deixar o atendimento pronto.
        </p>
      </div>

      <AiChatPanel
        {...chat}
        onInputChange={chat.setInput}
        onQuickSend={chat.quickSend}
        minimal
        className="h-[440px] shadow-soft-md"
      />

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={goToVideo}
          className="text-ink-faint text-xs font-body hover:text-ink-soft transition-colors underline-offset-2 hover:underline"
        >
          Pular perguntas por enquanto
        </button>

        {ready && (
          <button
            onClick={goToVideo}
            className="flex items-center gap-1.5 px-4 py-2 bg-green text-white border border-ink/10 rounded-md shadow-soft font-body font-bold text-xs hover:shadow-soft-md transition-shadow"
          >
            Continuar <ArrowRight size={13} />
          </button>
        )}
      </div>
    </OnboardingShell>
  )
}
