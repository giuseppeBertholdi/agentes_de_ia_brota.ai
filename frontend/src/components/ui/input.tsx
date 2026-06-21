import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-md border-2 border-ink bg-white px-3 py-2 text-sm font-body text-ink placeholder:text-ink-faint shadow-hard focus:outline-none focus:shadow-hard-md focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
