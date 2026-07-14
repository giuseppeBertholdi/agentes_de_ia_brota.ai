import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconColor?: string
  badge?: string
  badgeVariant?: 'default' | 'green' | 'lime' | 'yellow' | 'red' | 'gray'
  hint?: React.ReactNode
  className?: string
}

export function StatTile({
  label, value, icon: Icon, iconColor = 'text-ink', badge, badgeVariant = 'default', hint, className,
}: StatTileProps) {
  return (
    <Card className={cn('hover:shadow-soft-md hover:border-ink/15 transition-shadow', className)}>
      <CardContent className="pt-4 pb-4 flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-cream-2 flex items-center justify-center flex-none">
          <Icon size={16} className={iconColor} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display font-bold text-2xl text-ink tracking-tight leading-none">{value}</span>
            {badge && (
              <Badge variant={badgeVariant} className="text-[9px]">{badge}</Badge>
            )}
          </div>
          <p className="font-body text-xs text-ink-soft mt-1 truncate">{label}</p>
          {hint && <div className="mt-1">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
