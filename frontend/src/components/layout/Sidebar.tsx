import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, FileText, BarChart3, Heart, Users, Settings, LogOut, Zap, Sparkles, Loader2, LifeBuoy, X, Lock, Smartphone, ArrowRight, ShieldAlert, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useWhatsapp } from '@/hooks/useWhatsapp'
import { useCheckout } from '@/hooks/useCheckout'
import { useHandoffCount } from '@/hooks/useHandoffCount'
import { useApprovalsCount } from '@/hooks/useApprovalsCount'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const BASE_TITLE = 'Plimpost'

const mainNav = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', gated: false },
  { to: '/app/context', icon: Library, label: 'Contexto', gated: false },
  { to: '/app/inbox', icon: MessageSquare, label: 'Inbox', gated: true },
  { to: '/app/approvals', icon: ShieldAlert, label: 'Aprovações', gated: true },
  { to: '/app/quotes', icon: FileText, label: 'Cotações', gated: true },
  { to: '/app/reports', icon: BarChart3, label: 'Relatórios', gated: true },
  { to: '/app/post-sale', icon: Heart, label: 'Pós-venda', gated: true },
  { to: '/app/team', icon: Users, label: 'Equipe', gated: false },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors',
    isActive ? 'bg-green-soft text-green-deep font-semibold' : 'text-ink-soft hover:text-ink hover:bg-cream-2'
  )

interface SidebarProps {
  open: boolean
  onClose: () => void
}

// Duas etapas de liberação: primeiro a assinatura, depois a conexão do WhatsApp.
type GateStage = 'subscribe' | 'connect' | null

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const { active: subscriptionActive, loading: statusLoading } = useSubscription()
  const { connected: waConnected, loading: waLoading } = useWhatsapp()
  const { start, loading: starting } = useCheckout()
  const handoffCount = useHandoffCount()
  const approvalsCount = useApprovalsCount()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const name: string =
    (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'Você'
  const firstName = name.split(' ')[0]
  const nameInitials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  useEffect(() => {
    const total = handoffCount + approvalsCount
    document.title = total > 0 ? `(${total}) ${BASE_TITLE} — precisa de atenção` : BASE_TITLE
  }, [handoffCount, approvalsCount])

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
          className="fixed inset-0 bg-ink/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'w-64 sm:w-[220px] flex-none flex flex-col bg-white border-r border-ink/8',
          'fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out',
          'lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      {/* Logo */}
      <div className="h-[64px] flex items-center justify-between px-5 flex-none">
        <span className="font-bold text-lg tracking-tight flex items-center gap-2 text-ink">
          <Zap size={18} className="text-green" fill="currentColor" />
          Plimpost
        </span>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 -mr-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-cream-2"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Cartão de status — uma única etapa por vez: assinar, depois conectar */}
      {gateStage === 'subscribe' && (
        <div className="px-3 pt-2 flex-none">
          <button
            onClick={() => start()}
            disabled={starting}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-left bg-green-deep disabled:opacity-60 hover:bg-green-700 transition-colors"
          >
            <span className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center flex-none">
              {starting ? <Loader2 size={13} className="animate-spin text-white" /> : <Sparkles size={13} className="text-white" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[12.5px] text-white leading-tight">Ativar WhatsApp com IA</span>
              <span className="block text-white/70 text-[10.5px] mt-0.5">R$127/mês</span>
            </span>
            <ArrowRight size={14} className="text-white flex-none" />
          </button>
        </div>
      )}

      {gateStage === 'connect' && (
        <div className="px-3 pt-2 flex-none">
          <button
            onClick={() => { onClose(); navigate('/app/settings') }}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-left bg-cream-2 hover:bg-cream-3 transition-colors"
          >
            <span className="w-7 h-7 rounded-md bg-green-soft flex items-center justify-center flex-none">
              <Smartphone size={13} className="text-green-deep" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[12.5px] text-ink leading-tight">Falta conectar o WhatsApp</span>
              <span className="block text-ink-faint text-[10.5px] leading-tight mt-0.5">Finalize em Configurações</span>
            </span>
            <ArrowRight size={14} className="text-ink-faint flex-none" />
          </button>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {mainNav.map(({ to, icon: Icon, label, gated }) => {
          const locked = gated && gateStage !== null
          if (locked) {
            return (
              <button
                key={to}
                type="button"
                onClick={handleGatedClick}
                title={gateStage === 'subscribe' ? 'Assine para liberar' : 'Conecte o WhatsApp para liberar'}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm text-ink-faint hover:text-ink-soft hover:bg-cream-2 transition-colors"
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
                  <Icon size={16} className={isActive ? 'text-green-deep' : ''} />
                  {label}
                  {to === '/app/inbox' && handoffCount > 0 && (
                    <span className="ml-auto flex-none min-w-[20px] h-[18px] px-1.5 rounded-full bg-green text-white text-[11px] font-bold flex items-center justify-center">
                      {handoffCount}
                    </span>
                  )}
                  {to === '/app/approvals' && approvalsCount > 0 && (
                    <span className="ml-auto flex-none text-[11px] font-bold text-green-deep">
                      {approvalsCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}

        <div className="mt-3 pt-3 border-t border-ink/8">
          <NavLink to="/app/settings" className={navLinkClass} onClick={onClose}>
            {({ isActive }) => (
              <>
                <Settings size={16} className={isActive ? 'text-green-deep' : ''} />
                Configurações
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Perfil + Suporte + Sign out */}
      <div className="p-3 flex-none flex flex-col gap-2">
        <div className="mx-0 p-3 bg-cream rounded-[10px] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-green-deep text-white grid place-items-center text-xs font-bold flex-none">
            {nameInitials || 'VC'}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[13px] font-semibold text-ink truncate">{firstName}</div>
            <div className="text-[11px] text-ink-soft">{subscriptionActive ? 'Plano Pro' : 'Sem plano ativo'}</div>
          </div>
        </div>
        <a
          href="mailto:giuseppe.bertholdi@gmail.com?subject=Suporte%20Plimpost"
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-ink-soft hover:bg-cream-2 hover:text-ink transition-colors text-sm"
        >
          <LifeBuoy size={15} />
          Suporte
        </a>
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-ink-soft hover:bg-cream-2 hover:text-ink transition-colors text-sm"
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
