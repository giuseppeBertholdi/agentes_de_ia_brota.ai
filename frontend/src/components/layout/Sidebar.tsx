import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, FileText, BarChart3, Heart, Users, Settings, LogOut, Zap, Sparkles, Loader2, LifeBuoy, X, Lock, Smartphone, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useWhatsapp } from '@/hooks/useWhatsapp'
import { useCheckout } from '@/hooks/useCheckout'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const mainNav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', gated: false },
  { to: '/app/inbox', icon: MessageSquare, label: 'Inbox', gated: true },
  { to: '/app/quotes', icon: FileText, label: 'Cotações', gated: true },
  { to: '/app/reports', icon: BarChart3, label: 'Relatórios', gated: true },
  { to: '/app/post-sale', icon: Heart, label: 'Pós-venda', gated: true },
  { to: '/app/team', icon: Users, label: 'Equipe', gated: false },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg font-body font-medium text-sm transition-colors relative',
    isActive
      ? 'bg-white/[0.08] text-white'
      : 'text-white/55 hover:text-white hover:bg-white/[0.05]'
  )

interface SidebarProps {
  open: boolean
  onClose: () => void
}

// Duas etapas de liberação: primeiro a assinatura, depois a conexão do WhatsApp.
type GateStage = 'subscribe' | 'connect' | null

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { active: subscriptionActive, loading: statusLoading } = useSubscription()
  const { connected: waConnected, loading: waLoading } = useWhatsapp()
  const { start, loading: starting } = useCheckout()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const statusReady = !statusLoading && !waLoading
  const gateStage: GateStage = !statusReady
    ? null
    : !subscriptionActive
      ? 'subscribe'
      : !waConnected
        ? 'connect'
        : null

  const handleGatedClick = () => {
    onClose()
    if (gateStage === 'subscribe') start()
    else if (gateStage === 'connect') navigate('/app/settings')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-ink/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'w-64 sm:w-60 flex-none flex flex-col bg-ink text-white',
          'fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out',
          'lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      {/* Logo */}
      <div className="h-[64px] flex items-center justify-between px-5 border-b border-white/10 flex-none">
        <span className="font-display font-bold text-xl tracking-tight flex items-center gap-2">
          <Zap size={18} className="text-lime" fill="currentColor" />
          Plimpost<span className="text-lime">.</span>
        </span>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 -mr-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.08]"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Cartão de status — uma única etapa por vez: assinar, depois conectar */}
      {gateStage === 'subscribe' && (
        <div className="px-3 pt-3 flex-none">
          <button
            onClick={() => start()}
            disabled={starting}
            className="group relative w-full flex flex-col gap-2 px-3.5 py-3 rounded-xl overflow-hidden text-left border border-lime/25 bg-gradient-to-br from-green via-green to-green-deep shadow-[0_4px_16px_-4px_rgba(31,138,76,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(31,138,76,0.65)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0"
          >
            <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-lime/20 blur-xl" />
            <span className="flex items-center gap-2 relative">
              <span className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center flex-none">
                {starting ? <Loader2 size={13} className="animate-spin text-white" /> : <Sparkles size={13} className="text-lime" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-body font-bold text-[13px] text-white leading-tight">Ative o WhatsApp com IA</span>
              </span>
            </span>
            <span className="flex items-center justify-between relative">
              <span className="flex items-baseline gap-1.5">
                <span className="font-mono text-[10px] text-white/50 line-through">R$207</span>
                <span className="font-mono text-xs font-bold text-lime">R$127/mês</span>
              </span>
              <span className="font-body font-semibold text-[11px] text-ink bg-lime px-2 py-1 rounded-md group-hover:bg-white transition-colors">
                {starting ? 'Abrindo…' : 'Assinar →'}
              </span>
            </span>
          </button>
        </div>
      )}

      {gateStage === 'connect' && (
        <div className="px-3 pt-3 flex-none">
          <button
            onClick={() => { onClose(); navigate('/app/settings') }}
            className="group w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left border border-lime/25 bg-white/[0.06] hover:bg-white/[0.09] transition-colors"
          >
            <span className="w-7 h-7 rounded-md bg-lime/15 flex items-center justify-center flex-none">
              <Smartphone size={13} className="text-lime" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-body font-bold text-[12.5px] text-white leading-tight">Falta conectar o WhatsApp</span>
              <span className="block text-white/50 text-[10.5px] font-body leading-tight mt-0.5">Assinatura ativa — finalize em Configurações</span>
            </span>
            <ArrowRight size={14} className="text-lime flex-none" />
          </button>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-3 mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">
          Menu
        </p>
        {mainNav.map(({ to, icon: Icon, label, gated }) => {
          const locked = gated && gateStage !== null
          if (locked) {
            return (
              <button
                key={to}
                type="button"
                onClick={handleGatedClick}
                title={gateStage === 'subscribe' ? 'Assine para liberar' : 'Conecte o WhatsApp para liberar'}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-body font-medium text-sm text-white/30 hover:text-white/50 hover:bg-white/[0.03] transition-colors relative"
              >
                <Icon size={16} />
                {label}
                <Lock size={12} className="ml-auto flex-none" />
              </button>
            )
          }
          return (
            <NavLink key={to} to={to} className={navLinkClass} onClick={onClose}>
              {({ isActive }) => (
                <>
                  <span className={cn('absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-green', isActive ? 'opacity-100' : 'opacity-0')} />
                  <Icon size={16} />
                  {label}
                </>
              )}
            </NavLink>
          )
        })}

        <div className="border-t border-white/10 mt-4 pt-4">
          <p className="px-3 mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">
            Sistema
          </p>
          <NavLink to="/app/settings" className={navLinkClass} onClick={onClose}>
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

      {/* Suporte + Sign out */}
      <div className="border-t border-white/10 p-3 flex-none flex flex-col gap-0.5">
        <a
          href="mailto:giuseppe.bertholdi@gmail.com?subject=Suporte%20Plimpost"
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors text-sm font-body"
        >
          <LifeBuoy size={15} />
          Suporte
        </a>
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
    </>
  )
}
