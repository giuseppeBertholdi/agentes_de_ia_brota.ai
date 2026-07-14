import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm font-body text-ink placeholder:text-ink-faint shadow-xs focus:outline-none focus:border-green focus:ring-2 focus:ring-green/15 transition-colors resize-none disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
