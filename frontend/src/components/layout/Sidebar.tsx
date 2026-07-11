import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, FileText, BarChart3, Heart, Users, Settings, LogOut, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { initials } from '@/lib/utils'

const mainNav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/app/quotes', icon: FileText, label: 'Cotações' },
  { to: '/app/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/app/post-sale', icon: Heart, label: 'Pós-venda' },
  { to: '/app/team', icon: Users, label: 'Equipe' },
]

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-md font-body font-semibold text-sm border-2 transition-all',
    isActive
      ? 'bg-green text-white border-ink shadow-[3px_3px_0_#C7F25C]'
      : 'text-white/65 border-transparent hover:text-white hover:bg-white/[0.06] hover:border-white/10 hover:-translate-x-0.5 hover:-translate-y-0.5'
  )

interface SidebarProps {
  company?: { name?: string; plan?: string } | null
}

export default function Sidebar({ company }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const name: string =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Usuário'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-60 flex-none flex flex-col bg-ink text-white border-r-2 border-ink">
      {/* Logo */}
      <div className="h-[64px] flex items-center px-5 border-b border-white/10 flex-none">
        <span className="font-display font-bold text-xl tracking-tight flex items-center gap-2">
          <Zap size={18} className="text-lime" fill="currentColor" />
          Plimpost<span className="text-lime">.</span>
        </span>
      </div>

      {/* Workspace atual */}
      <div className="px-5 py-3 border-b border-white/10 flex-none flex items-center justify-between gap-2">
        <span className="font-body font-semibold text-sm text-white/90 truncate">
          {company?.name || 'Sua empresa'}
        </span>
        <span className="flex-none font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-lime/40 text-lime bg-lime/10">
          {PLAN_LABEL[company?.plan ?? 'free'] ?? 'Free'}
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-3 mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">
          Menu
        </p>
        {mainNav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div className="border-t border-white/10 mt-4 pt-4">
          <p className="px-3 mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">
            Sistema
          </p>
          <NavLink to="/app/settings" className={navLinkClass}>
            <Settings size={16} />
            Configurações
          </NavLink>
        </div>
      </nav>

      {/* User profile + sign out */}
      <div className="border-t border-white/10 p-3 flex flex-col gap-1 flex-none">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md">
          <div className="w-8 h-8 rounded-full bg-green border-2 border-lime/40 flex items-center justify-center font-display font-bold text-white text-xs flex-none">
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-body font-semibold text-sm text-white truncate leading-none">{name}</div>
            <div className="font-mono text-[10px] text-white/40 truncate mt-0.5">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-all text-sm font-body border-2 border-transparent"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  )
}
