import { useEffect, useRef, useState } from 'react'
import { Bot, X, Send, Loader2, Sparkles, ChevronDown, BarChart3, Tag, Settings2, Building2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import PaywallModal from '@/components/PaywallModal'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: Action[]
  isLoading?: boolean
  isInitial?: boolean
  isError?: boolean
}

interface Action {
  label: string
  type: string
}

// ─── Capabilities (shown before first exchange) ───────────────────────────────

export const CAPABILITIES = [
  { label: 'Gerenciar agentes', icon: Bot,       prompt: 'Quais agentes estão disponíveis?' },
  { label: 'Tabela de preços',  icon: Tag,       prompt: 'Quero ver e adicionar preços' },
  { label: 'Criar setor',       icon: Building2, prompt: 'Quero criar um setor de atendimento' },
  { label: 'Ver estatísticas',  icon: BarChart3, prompt: 'Quais são as estatísticas do meu negócio?' },
  { label: 'Configurar empresa',icon: Settings2, prompt: 'Quero configurar os dados da minha empresa' },
]

// ─── Contextual suggestions ───────────────────────────────────────────────────

function getSuggestions(actions: Action[]): string[] {
  if (actions.some(a => a.type === 'update_agent'))     return ['Ver todos os agentes', 'Personalizar o prompt', 'Adicionar preço']
  if (actions.some(a => a.type === 'create_price_item'))return ['Adicionar mais itens', 'Ver estatísticas', 'Configurar agentes']
  if (actions.some(a => a.type === 'create_department'))return ['Criar outro setor', 'Configurar agentes', 'Ver estatísticas']
  if (actions.some(a => a.type === 'update_company'))   return ['Configurar agentes', 'Adicionar preços', 'Ver estatísticas']
  if (actions.some(a => a.type === 'get_stats'))        return ['Como melhorar minhas vendas?', 'Ver agentes ativos', 'Adicionar preço']
  return ['Adicionar preço', 'Criar setor', 'Ver estatísticas']
}

// ─── Action badges ─────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { color: string; icon: string }> = {
  update_company:   { color: 'bg-cream-2 border-ink/30 text-ink',          icon: '🏢' },
  create_price_item:{ color: 'bg-green-tint border-green/60 text-green-700',icon: '✅' },
  delete_price_item:{ color: 'bg-red-50 border-red-200 text-red-600',       icon: '🗑️' },
  update_agent:     { color: 'bg-lime/40 border-ink/20 text-ink',           icon: '🤖' },
  create_department:{ color: 'bg-green-tint border-green/60 text-green-700',icon: '🏬' },
  get_stats:        { color: 'bg-cream-2 border-ink/20 text-ink-soft',      icon: '📊' },
}

function ActionBadge({ action }: { action: Action }) {
  const meta = ACTION_META[action.type] || { color: 'bg-cream-2 border-ink/20 text-ink', icon: '✓' }
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold',
      meta.color
    )}>
      <span className="text-[11px]">{meta.icon}</span>
      <span>{action.label}</span>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BotAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={cn(
      'rounded-full bg-green flex items-center justify-center flex-none',
      size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
    )}>
      <Sparkles size={size === 'sm' ? 9 : 11} className="text-lime" />
    </div>
  )
}

function Msg({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end msg-in">
        <div className="max-w-[82%] px-3 py-2 rounded-xl rounded-br-sm bg-ink text-white text-sm font-body leading-relaxed shadow-soft">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-start msg-in">
      <BotAvatar />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className={cn(
          'inline-block max-w-full px-3 py-2 rounded-xl rounded-bl-sm text-sm font-body leading-relaxed',
          msg.isError
            ? 'bg-red-50 border border-red-200 text-red-600'
            : 'bg-white border border-ink/10 shadow-soft text-ink'
        )}>
          {msg.isLoading ? (
            <span className="flex items-center gap-1 py-0.5 text-ink-faint">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          ) : (
            <ReactMarkdown
              components={{
                p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em:     ({ children }) => <em className="italic">{children}</em>,
                ul:     ({ children }) => <ul className="list-disc pl-4 my-1 flex flex-col gap-0.5">{children}</ul>,
                ol:     ({ children }) => <ol className="list-decimal pl-4 my-1 flex flex-col gap-0.5">{children}</ol>,
                li:     ({ children }) => <li>{children}</li>,
                code:   ({ children }) => <code className="bg-ink/10 px-1 rounded text-xs font-mono">{children}</code>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-1 pl-0.5">
            {msg.actions.map((a, i) => <ActionBadge key={i} action={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function CapCard({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 bg-white border border-ink/10 rounded-lg shadow-soft text-left hover:shadow-soft-md transition-shadow w-full"
    >
      <div className="w-7 h-7 rounded-md bg-green-tint border border-ink/10 flex items-center justify-center flex-none">
        <Icon size={13} className="text-green-deep" />
      </div>
      <span className="text-xs font-body font-semibold text-ink leading-tight">{label}</span>
    </button>
  )
}

function SugChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-none px-3 py-1.5 bg-white border border-ink/10 rounded-full text-xs font-body font-semibold text-ink hover:bg-green hover:text-white hover:border-green-deep transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  )
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: ChatMessage[]
  input: string
  loading: boolean
  onInputChange: (v: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onQuickSend: (text: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  bottomRef: React.RefObject<HTMLDivElement>
  showHeader?: boolean
  onClose?: () => void
  className?: string
}

export function AiChatPanel({
  messages, input, loading, onInputChange, onSend, onKeyDown, onQuickSend,
  inputRef, bottomRef, showHeader, onClose, className,
}: ChatPanelProps) {
  const realMsgs = messages.filter(m => !m.isInitial)
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && !m.isInitial && !m.isLoading)
  const suggestions = lastAssistant?.actions ? getSuggestions(lastAssistant.actions) : getSuggestions([])
  const showCaps = realMsgs.length === 0

  return (
    <div className={cn('flex flex-col bg-cream border border-ink/10 rounded-xl overflow-hidden shadow-soft', className)}>

      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-ink border-b-2 border-ink flex-none">
          <div className="w-7 h-7 rounded-full bg-green flex items-center justify-center">
            <Sparkles size={14} className="text-lime" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-sm text-white leading-none">Assistente Plimpost</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse flex-none" />
              <span className="font-mono text-[10px] text-white/50 uppercase tracking-wide">online agora</span>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">

        {/* Initial message */}
        {messages.filter(m => m.isInitial).map((msg, i) => (
          <div key={i} className="flex gap-2 items-start msg-in">
            <BotAvatar />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="inline-block max-w-full px-3 py-2 rounded-xl rounded-bl-sm text-sm font-body leading-relaxed bg-white border border-ink/10 shadow-soft text-ink">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* Capability cards */}
              {showCaps && (
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {CAPABILITIES.map(cap => (
                    <CapCard
                      key={cap.label}
                      label={cap.label}
                      icon={cap.icon}
                      onClick={() => onQuickSend(cap.prompt)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Conversation messages */}
        {realMsgs.map((msg, i) => <Msg key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {!showCaps && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-t border-ink/10 flex-none scrollbar-hide">
          {suggestions.map(s => (
            <SugChip key={s} label={s} onClick={() => onQuickSend(s)} />
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t-2 border-ink px-3 py-2.5 flex items-center gap-2 bg-white flex-none">
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm font-body text-ink placeholder:text-ink-faint outline-none"
          placeholder="Pergunte ou peça algo…"
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || loading}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-none',
            input.trim() && !loading
              ? 'bg-green text-white hover:bg-green-deep'
              : 'bg-cream-2 text-ink-faint cursor-not-allowed'
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAiChat(isFirstTime = false, onConfigChanged?: () => void) {
  const ONBOARDING =
    'Olá! Sou o assistente da Plimpost. 👋 Vou te fazer algumas perguntas rápidas pra já deixar os preços, o tom de atendimento e os setores certos configurados — sem formulário, e dá pra ajustar qualquer coisa depois.\n\nPra começar: me conta, qual é o seu negócio? O que você vende ou oferece?'
  const WELCOME =
    'Olá! Posso ajudar a configurar agentes, adicionar preços, consultar dados do negócio ou responder qualquer dúvida. O que você precisa?'

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: isFirstTime ? ONBOARDING : WELCOME, isInitial: true },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [paywallRequired, setPaywallRequired] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const historyForApi = messages
    .filter((m, i, arr) => {
      if (m.isLoading || m.isInitial || m.isError) return false
      if (m.role === 'user') {
        const next = arr[i + 1]
        if (next?.isError || next?.isLoading) return false
      }
      return true
    })
    .map(m => ({ role: m.role, content: m.content }))

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'assistant', content: '', isLoading: true },
    ])
    setLoading(true)
    try {
      const res = await api.post<{ message: string; actions: Action[] }>('/assistant/chat', {
        message: msg,
        history: historyForApi,
      })
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: res.message, actions: res.actions },
      ])
      const configActions = ['update_company', 'create_price_item', 'delete_price_item', 'update_agent']
      if (res.actions?.some(a => configActions.includes(a.type))) {
        onConfigChanged?.()
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setMessages(prev => prev.slice(0, -1))
        setPaywallRequired(true)
      } else {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: 'Ops, algo deu errado. Tente novamente.', isError: true },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const quickSend = (text: string) => {
    setInput(text)
    send(text)
  }

  const dismissPaywall = () => setPaywallRequired(false)

  return {
    messages, input, loading, setInput, send, onSend: send, onKeyDown, quickSend, bottomRef, inputRef,
    paywallRequired, dismissPaywall,
  }
}

// ─── Floating assistant ────────────────────────────────────────────────────────

interface FloatProps {
  isFirstTime?: boolean
  onConfigChanged?: () => void
}

export default function AiAssistant({ isFirstTime = false, onConfigChanged }: FloatProps) {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(isFirstTime)
  const chat = useAiChat(isFirstTime, onConfigChanged)

  useEffect(() => {
    if (open) {
      setHasUnread(false)
      setTimeout(() => chat.inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (isFirstTime) {
      const t = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(t)
    }
  }, [isFirstTime])

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-soft-md hover:shadow-soft-lg',
          open ? 'bg-ink text-white' : 'bg-green text-white hover:bg-green-deep',
        )}
        aria-label="Assistente de IA"
      >
        {open ? <ChevronDown size={22} /> : <Sparkles size={20} />}
        {hasUnread && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-lime border-2 border-white rounded-full animate-pulse" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[390px] max-w-[calc(100vw-3rem)] flex flex-col msg-in">
          <AiChatPanel
            {...chat}
            onInputChange={chat.setInput}
            onQuickSend={chat.quickSend}
            showHeader
            onClose={() => setOpen(false)}
            className="min-h-[420px] max-h-[560px]"
          />
        </div>
      )}

      <PaywallModal open={chat.paywallRequired} onClose={chat.dismissPaywall} />
    </>
  )
}
