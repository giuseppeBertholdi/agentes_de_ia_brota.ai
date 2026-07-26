import { Zap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Sobre você', 'Vídeo rápido', 'Ativar WhatsApp']

interface OnboardingShellProps {
  step: 1 | 2 | 3
  children: React.ReactNode
  maxWidth?: string
}

export default function OnboardingShell({ step, children, maxWidth = 'max-w-xl' }: OnboardingShellProps) {
  return (
    <div
      className="min-h-screen bg-cream flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: 'url(/doodles.svg)', backgroundSize: '320px' }}
    >
      <div className={cn('w-full flex flex-col items-center', maxWidth)}>
        <span className="inline-flex items-center gap-2 font-display font-bold text-2xl text-ink mb-5">
          <Zap size={22} className="text-green" fill="currentColor" />
          Plimpost<span className="text-green">.</span>
        </span>

        {/* Stepper de continuidade */}
        <div className="flex items-center gap-2 mb-7 w-full max-w-sm">
          {STEPS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3
            const done = n < step
            const active = n === step
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5 flex-none">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border transition-colors',
                      done ? 'bg-green border-green text-white' :
                      active ? 'bg-ink border-ink text-white' :
                      'bg-white border-ink/15 text-ink-faint'
                    )}
                  >
                    {done ? <Check size={12} /> : n}
                  </div>
                  <span className={cn(
                    'font-mono text-[9px] font-bold uppercase tracking-wide whitespace-nowrap',
                    active ? 'text-ink' : 'text-ink-faint'
                  )}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-px flex-1 mx-1.5 -mt-4', done ? 'bg-green' : 'bg-ink/15')} />
                )}
              </div>
            )
          })}
        </div>

        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}
