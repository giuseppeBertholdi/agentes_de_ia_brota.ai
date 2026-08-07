import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import OnboardingShell from '@/components/onboarding/OnboardingShell'

export default function OnboardingVideo() {
  const navigate = useNavigate()

  return (
    <OnboardingShell step={1}>
      <div className="text-center mb-5">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
          Veja a Plimpost em ação
        </h1>
        <p className="text-ink-soft text-sm font-body mt-1.5 max-w-md mx-auto">
          Um vídeo rápido mostrando como o atendimento automático funciona na prática.
        </p>
      </div>

      <div className="bg-cream border border-ink/10 rounded-xl shadow-soft-md overflow-hidden">
        <div className="relative aspect-video bg-ink">
          <video
            src="/onboarding.mp4"
            controls
            playsInline
            className="w-full h-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-end mt-4">
        <button
          onClick={() => navigate('/onboarding/chat')}
          className="flex items-center gap-1.5 px-4 py-2 bg-green text-white border border-ink/10 rounded-md shadow-soft font-body font-bold text-xs hover:shadow-soft-md transition-shadow"
        >
          Continuar <ArrowRight size={13} />
        </button>
      </div>
    </OnboardingShell>
  )
}
