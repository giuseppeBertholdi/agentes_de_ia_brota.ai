import { useNavigate } from 'react-router-dom'
import { Play, ArrowRight, Clock } from 'lucide-react'
import OnboardingShell from '@/components/onboarding/OnboardingShell'

export default function OnboardingVideo() {
  const navigate = useNavigate()

  return (
    <OnboardingShell step={2}>
      <div className="text-center mb-5">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">
          Veja a Plimpost em ação
        </h1>
        <p className="text-ink-soft text-sm font-body mt-1.5 max-w-md mx-auto">
          Um vídeo rápido mostrando como o atendimento automático funciona na prática.
        </p>
      </div>

      <div className="bg-cream border border-ink/10 rounded-xl shadow-soft-md overflow-hidden">
        <div className="relative aspect-video bg-ink flex items-center justify-center">
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'url(/doodles.svg)', backgroundSize: '200px' }} />
          <div className="relative flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <Play size={20} className="text-white/70 ml-0.5" fill="currentColor" />
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-lime/15 border border-lime/30 rounded-full font-mono text-[10px] font-bold text-lime uppercase tracking-wide">
              <Clock size={10} /> Vídeo em breve
            </span>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-ink-soft text-sm font-body leading-relaxed">
            Estamos gravando essa apresentação — assim que ficar pronta, ela aparece direto aqui. Por enquanto, pode seguir pro último passo.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end mt-4">
        <button
          onClick={() => navigate('/onboarding/activate')}
          className="flex items-center gap-1.5 px-4 py-2 bg-green text-white border border-ink/10 rounded-md shadow-soft font-body font-bold text-xs hover:shadow-soft-md transition-shadow"
        >
          Continuar <ArrowRight size={13} />
        </button>
      </div>
    </OnboardingShell>
  )
}
