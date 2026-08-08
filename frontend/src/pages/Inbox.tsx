import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Check, CheckCheck, AlertCircle, ArrowLeft, CheckCircle2, DollarSign, MessageSquare, Paperclip, Download, Zap } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useRealtimeTable } from '@/hooks/useRealtime'

interface Conversation {
  id: string
  contact_name: string
  contact_phone: string
  status: 'bot' | 'human' | 'awaiting_payment' | 'resolved'
  last_message_at: string
  remote_jid: string
  department_id: string | null
}

interface Department {
  id: string
  name: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  sent_by_human: boolean
  delivery_status?: 'sent' | 'delivered' | 'read' | 'failed'
  media_type?: 'image' | 'audio' | 'video' | 'sticker' | 'document' | null
  media_filename?: string | null
}

const microStatus: Record<string, { label: string; className: string }> = {
  bot: { label: 'BOT', className: 'text-green-deep' },
  human: { label: 'PEDIU HUMANO', className: 'text-amber-text' },
  awaiting_payment: { label: 'AGUARDANDO PAGAMENTO', className: 'text-amber-text' },
  resolved: { label: 'RESOLVIDO', className: 'text-ink-faint' },
}

const avatarColor: Record<string, string> = {
  bot: 'bg-green-soft text-green-deep',
  human: 'bg-amber-soft text-amber-text',
  awaiting_payment: 'bg-amber-soft text-amber-text',
  resolved: 'bg-cream-2 text-ink-soft',
}

const SUGGESTIONS = ['Sugerir: agendar ligação', 'Sugerir: tabela de atacado', 'Histórico de pedidos']

export default function Inbox() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptFilter, setDeptFilter] = useState<string>('')
  const [active, setActive] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadConvs = () =>
    api.get<Conversation[]>(`/conversations/${deptFilter ? `?department_id=${deptFilter}` : ''}`).then(setConvs).catch(console.error)

  const loadMessages = (id: string) =>
    api.get<Message[]>(`/conversations/${id}/messages`).then(setMessages).catch(console.error)

  useEffect(() => {
    api.get<Department[]>('/team/departments').then(setDepartments).catch(console.error)
  }, [])
  useEffect(() => { loadConvs() }, [deptFilter])
  useRealtimeTable('conversations', loadConvs)
  useRealtimeTable('messages', (payload) => {
    if (active && (payload as { new?: { conversation_id?: string } }).new?.conversation_id === active.id) {
      loadMessages(active.id)
    }
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const selectConv = (c: Conversation) => {
    setActive(c)
    loadMessages(c.id)
  }

  const deptName = (id: string | null) => departments.find(d => d.id === id)?.name

  const statusPriority: Record<Conversation['status'], number> = { awaiting_payment: 0, human: 1, bot: 2, resolved: 3 }
  const sortedConvs = [...convs].sort((a, b) => statusPriority[a.status] - statusPriority[b.status])

  const send = async () => {
    if (!input.trim() || !active) return
    setSending(true)
    try {
      await api.post('/conversations/send', { conversation_id: active.id, content: input.trim() })
      setInput('')
      loadMessages(active.id)
    } finally { setSending(false) }
  }

  const takeover = async () => {
    if (!active) return
    await api.post('/conversations/takeover', { conversation_id: active.id })
    loadConvs()
    setActive(a => a ? { ...a, status: 'human' } : a)
  }

  const release = async () => {
    if (!active) return
    await api.post(`/conversations/${active.id}/release`)
    loadConvs()
    setActive(a => a ? { ...a, status: 'bot' } : a)
  }

  const resolve = async () => {
    if (!active) return
    await api.post(`/conversations/${active.id}/resolve`)
    loadConvs()
    setActive(a => a ? { ...a, status: 'resolved' } : a)
  }

  const downloadMedia = async (m: Message) => {
    setDownloadingId(m.id)
    try {
      await api.download(`/conversations/messages/${m.id}/media`, m.media_filename || 'documento')
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="flex" style={{ height: '100%' }}>
      {/* Conversation list */}
      <div className={cn(
        'w-full md:w-80 flex-none border-r border-ink/8 bg-white flex-col',
        active ? 'hidden md:flex' : 'flex'
      )}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-lg font-extrabold text-ink">Inbox</span>
            <span className="text-xs text-ink-faint">{convs.filter(c => c.status !== 'resolved').length} ativas</span>
          </div>
          {departments.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setDeptFilter('')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                  deptFilter === '' ? 'bg-green-soft text-green-deep' : 'bg-cream-2 text-ink-soft hover:text-ink'
                )}
              >
                Todas
              </button>
              {departments.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDeptFilter(d.id)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                    deptFilter === d.id ? 'bg-green-soft text-green-deep' : 'bg-cream-2 text-ink-soft hover:text-ink'
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedConvs.map(c => (
            <button
              key={c.id}
              onClick={() => selectConv(c)}
              className={cn(
                'w-full text-left px-5 py-3 flex items-start gap-3 border-b border-ink/5 transition-colors',
                active?.id === c.id ? 'bg-[#f0f7f4] border-l-[3px] border-l-green pl-[17px]' : 'hover:bg-cream-2/60'
              )}
            >
              <div className={cn('w-10 h-10 rounded-full flex-none grid place-items-center text-[13px] font-bold', avatarColor[c.status])}>
                {initials(c.contact_name || c.contact_phone || '?')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className="text-[13px] font-bold text-ink truncate">{c.contact_name || c.contact_phone}</span>
                  {c.last_message_at && (
                    <span className="text-[11px] text-ink-faint flex-none">
                      {new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {deptName(c.department_id) && (
                  <div className="text-[11px] text-green-deep font-semibold truncate">{deptName(c.department_id)}</div>
                )}
                <span className={cn('text-[10px] font-bold', microStatus[c.status]?.className)}>
                  {microStatus[c.status]?.label}
                </span>
              </div>
            </button>
          ))}
          {convs.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cream-2 flex items-center justify-center">
                <MessageSquare size={20} className="text-ink-faint" />
              </div>
              <p className="text-ink-soft text-sm font-semibold">Nenhuma conversa ainda</p>
              <p className="text-ink-faint text-xs mt-1">As mensagens chegam aqui automaticamente</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="flex-1 flex flex-col w-full">
          {/* Chat header */}
          <div className="flex items-center px-3 sm:px-6 py-3.5 bg-white border-b border-ink/8 gap-3 sm:gap-4">
            <button
              onClick={() => setActive(null)}
              className="md:hidden p-1.5 -ml-1 rounded-md text-ink-soft hover:bg-cream-2 flex-none"
              aria-label="Voltar para a lista"
            >
              <ArrowLeft size={18} />
            </button>
            <div className={cn('w-10 h-10 rounded-full flex-none grid place-items-center text-[13px] font-bold', avatarColor[active.status])}>
              {initials(active.contact_name || active.contact_phone || '?')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-ink flex items-center gap-2">
                {active.contact_name || active.contact_phone}
              </div>
              <div className="text-ink-soft text-xs truncate">
                {active.contact_phone}{deptName(active.department_id) ? ` · ${deptName(active.department_id)}` : ''}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {active.status === 'bot' ? (
                <Button variant="lime" size="sm" onClick={takeover}>
                  <User size={14} /> Assumir conversa
                </Button>
              ) : active.status === 'awaiting_payment' ? (
                <>
                  <span className="hidden sm:inline-flex items-center text-xs font-semibold text-amber-text bg-amber-soft px-3 py-1.5 rounded-full">aguardando pagamento</span>
                  <Button variant="lime" size="sm" onClick={resolve} className="font-bold">
                    <CheckCircle2 size={14} /> Confirmar pagamento
                  </Button>
                  <Button variant="ghost" size="sm" onClick={release}>
                    <Bot size={14} /> Devolver para IA
                  </Button>
                </>
              ) : active.status === 'human' ? (
                <>
                  <span className="hidden sm:inline-flex items-center text-xs font-semibold text-amber-text bg-amber-soft px-3 py-1.5 rounded-full">bot pausado</span>
                  <Button variant="ghost" size="sm" onClick={release}>
                    <Bot size={14} /> Devolver para IA
                  </Button>
                </>
              ) : active.status === 'resolved' ? (
                <Button variant="ghost" size="sm" onClick={takeover}>
                  <User size={14} /> Falar com o cliente
                </Button>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col gap-3 bg-chat-bg">
            {active.status === 'human' && (
              <div className="self-center flex items-center gap-2 bg-white rounded-2xl px-4 py-1.5 shadow-xs mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green" />
                <span className="text-xs text-green-deep font-semibold">Bot pausou — cliente pediu atendimento humano</span>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[85%] sm:max-w-[520px] px-3.5 py-2.5 rounded-[10px] text-sm shadow-xs',
                  m.role === 'user' ? 'bg-white text-ink rounded-tl-[2px]' : 'bg-chat-bubble text-ink rounded-tr-[2px]'
                )}>
                  <p className="leading-relaxed whitespace-pre-line flex items-start gap-1.5">
                    {m.media_type && <Paperclip size={13} className="mt-0.5 flex-none opacity-60" />}
                    {m.content}
                  </p>
                  {m.media_type === 'document' && (
                    <button
                      onClick={() => downloadMedia(m)}
                      disabled={downloadingId === m.id}
                      className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-md border border-ink/15 bg-cream-2 text-ink text-xs font-bold hover:bg-cream-3 transition-colors disabled:opacity-50"
                    >
                      <Download size={12} /> {downloadingId === m.id ? 'Baixando…' : 'Baixar documento'}
                    </button>
                  )}
                  <div className={cn('flex items-center gap-1.5 mt-1', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                    {m.role === 'assistant' && (
                      <span className="text-[10px] text-chat-meta flex items-center gap-1">
                        {m.sent_by_human ? <User size={9} /> : <Zap size={9} className="text-green" fill="currentColor" />}
                        {m.sent_by_human ? 'você' : 'agente de vendas'} ·
                      </span>
                    )}
                    <span className="text-[10px] text-chat-meta">
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.role === 'assistant' && (
                      m.delivery_status === 'failed' ? (
                        <AlertCircle size={11} className="text-red-500" aria-label="Falha no envio" />
                      ) : m.delivery_status === 'delivered' || m.delivery_status === 'read' ? (
                        <CheckCheck size={12} className="text-chat-meta" />
                      ) : (
                        <Check size={12} className="text-chat-meta" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {(active.status === 'human' || active.status === 'awaiting_payment') && (
            <div className="bg-white border-t border-ink/8 p-3.5 flex flex-col gap-2.5">
              <div className="flex gap-2 flex-wrap">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s.replace(/^Sugerir: /, ''))}
                    className="text-xs text-ink-soft bg-cream-2 hover:bg-cream-3 transition-colors px-3 py-1.5 rounded-full"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2.5">
                <input
                  className="flex-1 border-0 rounded-full px-4 py-2.5 text-sm text-ink bg-cream-2 focus:outline-none focus:ring-2 focus:ring-green-deep/40 transition-all"
                  placeholder="Responder…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
                />
                <Button variant="lime" size="md" className="rounded-full flex-none" onClick={send} disabled={sending || !input.trim()}>
                  <Send size={15} />
                </Button>
                {active.status === 'human' && (
                  <Button variant="ghost" size="md" className="rounded-full flex-none" onClick={release}>
                    Devolver ao bot
                  </Button>
                )}
              </div>
            </div>
          )}

          {active.status === 'bot' && (
            <div className="bg-green-soft border-t border-ink/8 px-4 py-3 flex flex-wrap items-center justify-center gap-2 text-center">
              <span className="relative flex w-2 h-2 flex-none">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green" />
              </span>
              <p className="text-sm text-green-deep font-semibold">
                A IA está atendendo esta conversa automaticamente.
              </p>
              <Button variant="link" size="sm" onClick={takeover} className="font-bold text-green-deep">
                Assumir agora
              </Button>
            </div>
          )}

          {active.status === 'awaiting_payment' && (
            <div className="bg-amber-soft border-t border-ink/8 px-4 py-3 flex flex-wrap items-center justify-center gap-2 text-center">
              <DollarSign size={16} className="text-amber-text flex-none" />
              <p className="text-sm text-amber-text font-semibold">
                Cliente aceitou a cotação — confirme o pagamento assim que ele cair.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-cream">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-soft flex items-center justify-center">
              <MessageSquare size={26} className="text-green-deep opacity-70" />
            </div>
            <p className="font-bold text-sm text-ink">Selecione uma conversa</p>
            <p className="text-xs text-ink-faint mt-1">Escolha um contato na lista ao lado para ver o histórico de mensagens</p>
          </div>
        </div>
      )}
    </div>
  )
}
