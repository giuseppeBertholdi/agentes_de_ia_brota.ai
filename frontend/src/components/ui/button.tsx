import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-body font-bold text-sm border-2 border-ink transition-all duration-100 cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-green text-white shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        ghost: 'bg-white text-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md hover:bg-cream-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        danger: 'bg-red-500 text-white shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md',
        lime: 'bg-lime text-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md',
        link: 'border-0 shadow-none bg-transparent underline-offset-4 hover:underline text-green',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs rounded-sm',
        md: 'px-4 py-2.5 rounded-md',
        lg: 'px-6 py-3.5 text-base rounded-md',
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
