import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { initials } from '@/lib/utils'

const routeMeta: Record<string, { title: string; sub: string }> = {
  '/app/dashboard': { title: 'Dashboard', sub: 'Visão geral da operação' },
  '/app/inbox': { title: 'Inbox', sub: 'Conversas em tempo real' },
  '/app/quotes': { title: 'Cotações', sub: 'Orçamentos gerados pelo bot' },
  '/app/reports': { title: 'Relatórios', sub: 'Resumo semanal' },
  '/app/post-sale': { title: 'Pós-venda', sub: 'Acompanhamento pós-compra' },
  '/app/settings': { title: 'Configurações', sub: 'Empresa, preços e agentes' },
}

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const meta = routeMeta[pathname]
  const name: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Usuário'

  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="h-[64px] flex-none flex items-center justify-between gap-3 px-4 sm:px-8 bg-white border-b border-ink/8 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-md text-ink-soft hover:bg-cream-2 flex-none"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          {meta ? (
            <>
              <h1 className="font-display font-bold text-lg sm:text-xl text-ink leading-none tracking-tight truncate">{meta.title}</h1>
              <p className="text-ink-faint text-xs font-body mt-1 capitalize hidden sm:block">{dateStr}</p>
            </>
          ) : (
            <span className="font-display font-bold text-xl text-ink">Plimpost</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-none">
        <div className="text-right hidden sm:block">
          <div className="font-body font-semibold text-sm text-ink leading-none">{name}</div>
          <div className="text-ink-faint text-[11px] font-mono mt-0.5">{user?.email}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-green flex items-center justify-center font-display font-bold text-white text-sm flex-none">
          {initials(name)}
        </div>
      </div>
    </div>
  )
}
