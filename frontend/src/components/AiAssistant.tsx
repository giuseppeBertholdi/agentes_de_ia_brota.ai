import { useEffect, useRef, useState } from 'react'
import { Bot, X, Send, Loader2, Sparkles, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: Action[]
  isLoading?: boolean
}

interface Action {
  label: string
  type: string
}

interface ChatPanelProps {
  messages: ChatMessage[]
  input: string
  loading: boolean
  onInputChange: (v: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  inputRef: React.RefObject<HTMLInputElement>
  bottomRef: React.RefObject<HTMLDivElement>
  /** Se true, o painel tem header com botão de fechar */
  showHeader?: boolean
  onClose?: () => void
  className?: string
}

const ACTION_ICONS: Record<string, string> = {
  update_company: '🏢',
  create_price_item: '➕',
  delete_price_item: '🗑️',
  update_agent: '🤖',
  get_stats: '📊',
}

function ActionBadge({ action }: { action: Action }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-tint border border-green rounded-md text-xs font-body text-green-700 font-semibold">
      <span>{ACTION_ICONS[action.type] || '✓'}</span>
      <span>{action.label}</span>
    </div>
  )
}

function Msg({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[82%] px-3 py-2 rounded-lg text-sm font-body leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-ink text-white rounded-br-none'
            : 'bg-white border-2 border-ink text-ink rounded-bl-none shadow-hard'
        )}
      >
        {msg.isLoading ? (
          <span className="flex items-center gap-2 text-ink-soft">
            <Loader2 size={13} className="animate-spin" />
            Pensando…
          </span>
        ) : msg.content}
      </div>
      {msg.actions && msg.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-w-[90%]">
          {msg.actions.map((a, i) => <ActionBadge key={i} action={a} />)}
        </div>
      )}
    </div>
  )
}

export function AiChatPanel({
  messages, input, loading, onInputChange, onSend, onKeyDown,
  inputRef, bottomRef, showHeader, onClose, className,
}: ChatPanelProps) {
  return (
    <div className={cn('flex flex-col bg-cream border-2 border-ink rounded-xl overflow-hidden shadow-hard', className)}>
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 bg-ink border-b-2 border-ink flex-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green border-2 border-lime/40 flex items-center justify-center">
              <Sparkles size={14} className="text-lime" />
            </div>
            <div>
              <div className="font-display font-bold text-sm text-white leading-none">Assistente Brota</div>
              <div className="font-mono text-[10px] text-white/40 mt-0.5">IA · Configuração & Dados</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg, i) => <Msg key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

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
            'w-8 h-8 rounded-md flex items-center justify-center border-2 border-ink transition-all flex-none',
            input.trim() && !loading
              ? 'bg-green text-white hover:bg-green-deep shadow-hard'
              : 'bg-cream-2 text-ink-faint cursor-not-allowed'
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}

export function useAiChat(isFirstTime = false, onConfigChanged?: () => void) {
  const ONBOARDING =
    'Olá! Sou o assistente da Brota. Vou te ajudar a configurar tudo para o seu WhatsApp. 👋\n\nMe conta: qual é o seu negócio? O que você vende ou oferece?'
  const WELCOME =
    'Olá! Posso ajudar a configurar agentes, adicionar preços, consultar dados do negócio ou responder qualquer dúvida. O que você precisa?'

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: isFirstTime ? ONBOARDING : WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const historyForApi = messages
    .filter(m => !m.isLoading)
    .map(m => ({ role: m.role, content: m.content }))

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', isLoading: true },
    ])
    setLoading(true)
    try {
      const res = await api.post<{ message: string; actions: Action[] }>('/assistant/chat', {
        message: text,
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
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Ops, algo deu errado. Tente novamente.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return { messages, input, loading, setInput, send, onSend: send, onKeyDown, bottomRef, inputRef }
}

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
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-hard-md transition-all border-2 border-ink',
          open ? 'bg-ink text-white' : 'bg-green text-white hover:bg-green-deep',
        )}
        aria-label="Assistente de IA"
      >
        {open ? <ChevronDown size={22} /> : <Bot size={22} />}
        {hasUnread && !open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-lime border-2 border-white rounded-full" />
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] flex flex-col">
          <AiChatPanel
            {...chat}
            onInputChange={chat.setInput}
            showHeader
            onClose={() => setOpen(false)}
            className="min-h-[400px] max-h-[500px]"
          />
        </div>
      )}
    </>
  )
}
