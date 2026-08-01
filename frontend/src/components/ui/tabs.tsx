import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'flex-none whitespace-nowrap px-3.5 py-2 rounded-lg border font-body font-semibold text-xs transition-colors',
        'bg-white text-ink-soft border-ink/15 hover:border-ink/30 hover:text-ink',
        'data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:border-ink',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-5 focus:outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
