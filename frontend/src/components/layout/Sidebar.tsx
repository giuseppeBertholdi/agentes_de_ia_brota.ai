import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, FileText, BarChart3, Heart, Users, Settings, LogOut, Zap, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useCheckout } from '@/hooks/useCheckout'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const mainNav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/app/quotes', icon: FileText, label: 'Cotações' },
  { to: '/app/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/app/post-sale', icon: Heart, label: 'Pós-venda' },
  { to: '/app/team', icon: Users, label: 'Equipe' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg font-body font-medium text-sm transition-colors relative',
    isActive
      ? 'bg-white/[0.08] text-white'
      : 'text-white/55 hover:text-white hover:bg-white/[0.05]'
  )

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { active: subscriptionActive, loading: statusLoading } = useSubscription()
  const { start, loading: starting } = useCheckout()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-60 flex-none flex flex-col bg-ink text-white">
      {/* Logo */}
      <div className="h-[64px] flex items-center px-5 border-b border-white/10 flex-none">
        <span className="font-display font-bold text-xl tracking-tight flex items-center gap-2">
          <Zap size={18} className="text-lime" fill="currentColor" />
          Plimpost<span className="text-lime">.</span>
        </span>
      </div>

      {/* Upgrade — some sozinho para quem já assina */}
      {!statusLoading && !subscriptionActive && (
        <div className="px-3 pt-3 flex-none">
          <button
            onClick={start}
            disabled={starting}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-colors text-left disabled:opacity-60"
          >
            <span className="w-7 h-7 rounded-md bg-green flex items-center justify-center flex-none">
              {starting ? <Loader2 size={13} className="animate-spin text-white" /> : <Sparkles size={13} className="text-lime" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-body font-semibold text-xs text-white leading-tight">Fazer upgrade</span>
              <span className="block font-mono text-[10px] text-white/40 mt-0.5">R$127/mês</span>
            </span>
          </button>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-3 mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">
          Menu
        </p>
        {mainNav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={cn('absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-green', isActive ? 'opacity-100' : 'opacity-0')} />
                <Icon size={16} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <div className="border-t border-white/10 mt-4 pt-4">
          <p className="px-3 mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">
            Sistema
          </p>
          <NavLink to="/app/settings" className={navLinkClass}>
            {({ isActive }) => (
              <>
                <span className={cn('absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-green', isActive ? 'opacity-100' : 'opacity-0')} />
                <Settings size={16} />
                Configurações
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/10 p-3 flex-none">
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors text-sm font-body"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Sair da conta"
        message="Tem certeza que deseja sair? Você vai precisar entrar novamente para acessar o painel."
        confirmLabel="Sair"
        variant="danger"
        onConfirm={() => { setConfirmOpen(false); handleSignOut() }}
        onCancel={() => setConfirmOpen(false)}
      />
    </aside>
  )
}
