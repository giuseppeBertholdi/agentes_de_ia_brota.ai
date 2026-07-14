import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2 text-sm font-body text-ink placeholder:text-ink-faint shadow-xs focus:outline-none focus:border-green focus:ring-2 focus:ring-green/15 transition-colors disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
