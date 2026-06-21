import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'green' | 'yellow' | 'red' | 'lime' | 'gray'
}

const variantClasses = {
  default: 'bg-cream-2 text-ink-soft',
  green: 'bg-green-soft text-green-deep',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-700',
  lime: 'bg-lime text-ink',
  gray: 'bg-cream-3 text-ink-faint',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-bold text-[10.5px] uppercase tracking-wider px-2 py-0.5 border-2 border-ink rounded-sm',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}
