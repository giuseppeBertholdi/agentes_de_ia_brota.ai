import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Check, CheckCheck, AlertCircle, ArrowLeft, CheckCircle2, DollarSign, MessageSquare } from 'lucide-react'
import { cn, fmtDate, initials } from '@/lib/utils'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
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
}

const statusBadge: Record<string, { label: string; variant: 'green' | 'yellow' | 'gray' }> = {
  bot: { label: 'Bot', variant: 'green' },
  human: { label: 'Humano', variant: 'yellow' },
  awaiting_payment: { label: 'Aguardando pagamento', variant: 'yellow' },
  resolved: { label: 'Resolvido', variant: 'gray' },
}

export default function Inbox() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptFilter, setDeptFilter] = useState<string>('')
  const [active, setActive] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
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
  const awaitingCount = convs.filter(c => c.status === 'awaiting_payment').length

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

  return (
    <div className="flex" style={{ height: '100%' }}>
      {/* Conversation list */}
      <div className={cn(
        'w-full md:w-80 flex-none border-r border-ink/10 bg-white flex-col',
        active ? 'hidden md:flex' : 'flex'
      )}>
        <div className="h-[64px] flex items-center px-4 border-b border-ink/10 bg-white flex-none gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint">Conversas</span>
          <div className="ml-auto flex items-center gap-1.5">
            {awaitingCount > 0 && (
              <Badge variant="lime" className="gap-1">
                <DollarSign size={10} /> {awaitingCount} aguardando
              </Badge>
            )}
            <Badge>{convs.filter(c => c.status !== 'resolved').length} ativas</Badge>
          </div>
        </div>
        {departments.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ink/10 bg-white overflow-x-auto">
            <button
              onClick={() => setDeptFilter('')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-body font-semibold whitespace-nowrap border transition-colors',
                deptFilter === '' ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-ink/15 hover:border-ink/30'
              )}
            >
              Todos
            </button>
            {departments.map(d => (
              <button
                key={d.id}
                onClick={() => setDeptFilter(d.id)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-body font-semibold whitespace-nowrap border transition-colors',
                  deptFilter === d.id ? 'bg-green text-white border-green' : 'bg-white text-ink-soft border-ink/15 hover:border-ink/30'
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {sortedConvs.map(c => (
            <button
              key={c.id}
              onClick={() => selectConv(c)}
              className={cn(
                'w-full text-left px-4 py-4 border-b border-ink/10 flex items-start gap-3 hover:bg-cream transition-colors',
                active?.id === c.id && 'bg-green-tint border-l-4 border-l-green',
                c.status === 'awaiting_payment' && active?.id !== c.id && 'bg-lime/10'
              )}
            >
              <div className="relative flex-none">
                <div className="w-10 h-10 rounded-full bg-green-soft flex items-center justify-center font-display font-bold text-green-deep text-sm">
                  {initials(c.contact_name || c.contact_phone || '?')}
                </div>
                {c.status === 'awaiting_payment' && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-lime border-2 border-white animate-pulse" aria-hidden />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body font-bold text-sm text-ink truncate">
                    {c.contact_name || c.contact_phone}
                  </span>
                  <Badge variant={statusBadge[c.status]?.variant ?? 'gray'} className="text-[9px] flex-none">
                    {statusBadge[c.status]?.label}
                  </Badge>
                </div>
                {deptName(c.department_id) && (
                  <span className="text-green-deep text-[10px] font-mono font-bold block mt-0.5">
                    {deptName(c.department_id)}
                  </span>
                )}
                {c.last_message_at && (
                  <span className="text-ink-faint text-xs font-mono mt-0.5 block">
                    {new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </button>
          ))}
          {convs.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cream-2 flex items-center justify-center">
                <MessageSquare size={20} className="text-ink-faint" />
              </div>
              <p className="text-ink-soft text-sm font-body font-semibold">Nenhuma conversa ainda</p>
              <p className="text-ink-faint text-xs font-body mt-1">As mensagens chegam aqui automaticamente</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="flex-1 flex flex-col w-full">
          {/* Chat header */}
          <div className="h-[64px] flex items-center px-3 sm:px-6 bg-white border-b border-ink/10 gap-3 sm:gap-4">
            <button
              onClick={() => setActive(null)}
              className="md:hidden p-1.5 -ml-1 rounded-md text-ink-soft hover:bg-cream-2 flex-none"
              aria-label="Voltar para a lista"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-full bg-green-soft flex-none flex items-center justify-center font-display font-bold text-green-deep text-sm">
              {initials(active.contact_name || active.contact_phone || '?')}
            </div>
            <div className="flex-1">
              <div className="font-body font-bold text-ink flex items-center gap-2">
                {active.contact_name || active.contact_phone}
                {deptName(active.department_id) && (
                  <Badge variant="green" className="text-[9px]">{deptName(active.department_id)}</Badge>
                )}
              </div>
              <div className="text-ink-faint text-xs font-mono">{active.contact_phone}</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {active.status === 'bot' ? (
                <Button variant="primary" size="sm" onClick={takeover}>
                  <User size={14} /> Assumir conversa
                </Button>
              ) : active.status === 'awaiting_payment' ? (
                <>
                  <Button variant="lime" size="sm" onClick={resolve} className="shadow-xs font-bold">
                    <CheckCircle2 size={14} /> Confirmar pagamento
                  </Button>
                  <Button variant="ghost" size="sm" onClick={release}>
                    <Bot size={14} /> Devolver para IA
                  </Button>
                </>
              ) : active.status === 'human' ? (
                <Button variant="ghost" size="sm" onClick={release}>
                  <Bot size={14} /> Devolver para IA
                </Button>
              ) : active.status === 'resolved' ? (
                <Button variant="ghost" size="sm" onClick={takeover}>
                  <User size={14} /> Falar com o cliente
                </Button>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 bg-cream/50">
            {messages.map(m => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[72%] px-4 py-2.5 rounded-lg border border-ink/10 text-sm font-body shadow-soft',
                  m.role === 'user' ? 'bg-white text-ink' : 'bg-green text-white'
                )}>
                  <p className="leading-relaxed">{m.content}</p>
                  <div className={cn('flex items-center gap-1.5 mt-1.5', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                    <span className="text-[10px] font-mono opacity-60">
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.role === 'assistant' && (
                      <>
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/15">
                          {m.sent_by_human ? <User size={9} /> : <Bot size={9} />}
                        </span>
                        {m.delivery_status === 'failed' ? (
                          <AlertCircle size={12} className="text-red-300" aria-label="Falha no envio" />
                        ) : m.delivery_status === 'delivered' || m.delivery_status === 'read' ? (
                          <CheckCheck size={12} className="opacity-60" />
                        ) : (
                          <Check size={12} className="opacity-60" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {(active.status === 'human' || active.status === 'awaiting_payment') && (
            <div className="bg-white border-t-2 border-ink p-4 flex gap-3 items-end">
              <textarea
                className="flex-1 resize-none border border-ink/10 rounded-md px-3 py-2.5 text-sm font-body text-ink bg-white shadow-soft focus:outline-none focus:shadow-soft-md transition-all min-h-[44px] max-h-32"
                placeholder="Digite sua mensagem…"
                value={input}
                rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              />
              <Button variant="primary" size="md" onClick={send} disabled={sending || !input.trim()}>
                <Send size={16} />
              </Button>
            </div>
          )}

          {active.status === 'bot' && (
            <div className="bg-green-tint border-t-2 border-green/30 px-4 py-3 flex flex-wrap items-center justify-center gap-2 text-center">
              <span className="relative flex w-2 h-2 flex-none">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green" />
              </span>
              <p className="text-sm text-green-deep font-body font-semibold">
                A IA está atendendo esta conversa automaticamente.
              </p>
              <Button variant="link" size="sm" onClick={takeover} className="font-bold text-green-deep">
                Assumir agora
              </Button>
            </div>
          )}

          {active.status === 'awaiting_payment' && (
            <div className="bg-lime/15 border-t-2 border-lime px-4 py-3 flex flex-wrap items-center justify-center gap-2 text-center">
              <DollarSign size={16} className="text-green-deep flex-none" />
              <p className="text-sm text-ink font-body font-semibold">
                Cliente aceitou a cotação — confirme o pagamento assim que ele cair.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-cream/40">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-tint flex items-center justify-center">
              <MessageSquare size={26} className="text-green-deep opacity-70" />
            </div>
            <p className="font-body font-bold text-sm text-ink">Selecione uma conversa</p>
            <p className="font-body text-xs text-ink-faint mt-1">Escolha um contato na lista ao lado para ver o histórico de mensagens</p>
          </div>
        </div>
      )}
    </div>
  )
}
