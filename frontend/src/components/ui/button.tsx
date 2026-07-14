import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-body font-semibold text-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-green text-white shadow-xs hover:bg-green-deep active:bg-green-700',
        ghost: 'bg-white text-ink border border-ink/12 shadow-xs hover:bg-cream-2 hover:border-ink/20 active:bg-cream-3',
        danger: 'bg-red-500 text-white shadow-xs hover:bg-red-600 active:bg-red-700',
        lime: 'bg-lime text-ink hover:brightness-95',
        link: 'border-0 shadow-none bg-transparent underline-offset-4 hover:underline text-green px-0',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs rounded-md',
        md: 'px-4 py-2.5 rounded-lg',
        lg: 'px-6 py-3.5 text-base rounded-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
