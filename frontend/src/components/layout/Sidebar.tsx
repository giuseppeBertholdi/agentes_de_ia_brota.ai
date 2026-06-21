import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, FileText, BarChart3, Heart, Settings, LogOut, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const nav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/inbox', icon: MessageSquare, label: 'Inbox' },
  { to: '/app/quotes', icon: FileText, label: 'Cotações' },
  { to: '/app/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/app/post-sale', icon: Heart, label: 'Pós-venda' },
  { to: '/app/settings', icon: Settings, label: 'Configurações' },
]

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-64 flex-none flex flex-col bg-ink text-white border-r-2 border-ink">
      {/* Logo */}
      <div className="h-[70px] flex items-center px-6 border-b-2 border-white/10">
        <span className="font-display font-bold text-2xl tracking-tight flex items-center gap-2">
          <Zap size={20} className="text-lime" fill="currentColor" />
          Brota<span className="text-lime">.</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-md font-body font-600 text-sm transition-all',
                isActive
                  ? 'bg-green text-white border-2 border-lime shadow-[3px_3px_0_#C7F25C]'
                  : 'text-white/70 hover:bg-white/10 border-2 border-transparent'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t-2 border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-md text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm font-body border-2 border-transparent"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
