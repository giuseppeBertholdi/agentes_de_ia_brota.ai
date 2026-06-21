import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, CheckCheck, RefreshCw } from 'lucide-react'
import { cn, fmtDate, initials } from '@/lib/utils'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRealtimeTable } from '@/hooks/useRealtime'

interface Conversation {
  id: string
  contact_name: string
  contact_phone: string
  status: 'bot' | 'human' | 'resolved'
  last_message_at: string
  remote_jid: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  sent_by_human: boolean
}

const statusBadge: Record<string, { label: string; variant: 'green' | 'yellow' | 'gray' }> = {
  bot: { label: 'Bot', variant: 'green' },
  human: { label: 'Humano', variant: 'yellow' },
  resolved: { label: 'Resolvido', variant: 'gray' },
}

export default function Inbox() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [active, setActive] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadConvs = () =>
    api.get<Conversation[]>('/conversations/').then(setConvs).catch(console.error)

  const loadMessages = (id: string) =>
    api.get<Message[]>(`/conversations/${id}/messages`).then(setMessages).catch(console.error)

  useEffect(() => { loadConvs() }, [])
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

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-80 flex-none border-r-2 border-ink bg-white flex flex-col">
        <div className="h-[70px] flex items-center px-5 border-b-2 border-ink">
          <h2 className="font-display font-bold text-lg text-ink">Inbox</h2>
          <Badge className="ml-auto">{convs.filter(c => c.status !== 'resolved').length}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.map(c => (
            <button
              key={c.id}
              onClick={() => selectConv(c)}
              className={cn(
                'w-full text-left px-4 py-4 border-b border-ink/10 flex items-start gap-3 hover:bg-cream transition-colors',
                active?.id === c.id && 'bg-green-tint border-l-4 border-l-green'
              )}
            >
              <div className="w-10 h-10 rounded-full bg-green-soft border-2 border-ink flex-none flex items-center justify-center font-display font-bold text-green-deep text-sm">
                {initials(c.contact_name || c.contact_phone || '?')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body font-bold text-sm text-ink truncate">
                    {c.contact_name || c.contact_phone}
                  </span>
                  <Badge variant={statusBadge[c.status]?.variant ?? 'gray'} className="text-[9px]">
                    {statusBadge[c.status]?.label}
                  </Badge>
                </div>
                {c.last_message_at && (
                  <span className="text-ink-faint text-xs font-mono mt-0.5 block">
                    {new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </button>
          ))}
          {convs.length === 0 && (
            <div className="px-5 py-10 text-center text-ink-soft text-sm font-body">
              Nenhuma conversa ainda.<br />As mensagens chegam aqui automaticamente.
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="h-[70px] flex items-center px-6 bg-white border-b-2 border-ink gap-4">
            <div className="w-10 h-10 rounded-full bg-green-soft border-2 border-ink flex-none flex items-center justify-center font-display font-bold text-green-deep text-sm">
              {initials(active.contact_name || active.contact_phone || '?')}
            </div>
            <div className="flex-1">
              <div className="font-body font-bold text-ink">{active.contact_name || active.contact_phone}</div>
              <div className="text-ink-faint text-xs font-mono">{active.contact_phone}</div>
            </div>
            <div className="flex gap-2">
              {active.status === 'bot' ? (
                <Button variant="ghost" size="sm" onClick={takeover}>
                  <User size={14} /> Assumir conversa
                </Button>
              ) : active.status === 'human' ? (
                <Button variant="ghost" size="sm" onClick={release}>
                  <Bot size={14} /> Devolver ao bot
                </Button>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 bg-cream/50">
            {messages.map(m => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[72%] px-4 py-2.5 rounded-lg border-2 border-ink text-sm font-body shadow-hard',
                  m.role === 'user' ? 'bg-white text-ink' : 'bg-green text-white'
                )}>
                  <p className="leading-relaxed">{m.content}</p>
                  <div className={cn('flex items-center gap-1.5 mt-1.5', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                    <span className="text-[10px] font-mono opacity-60">
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.role === 'assistant' && (
                      <>
                        {m.sent_by_human ? <User size={10} className="opacity-60" /> : <Bot size={10} className="opacity-60" />}
                        <CheckCheck size={12} className="opacity-60" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {active.status === 'human' && (
            <div className="bg-white border-t-2 border-ink p-4 flex gap-3 items-end">
              <textarea
                className="flex-1 resize-none border-2 border-ink rounded-md px-3 py-2.5 text-sm font-body text-ink bg-white shadow-hard focus:outline-none focus:shadow-hard-md transition-all min-h-[44px] max-h-32"
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
            <div className="bg-green-tint border-t-2 border-ink p-4 text-center">
              <p className="text-sm text-green-deep font-body font-bold inline-flex items-center gap-2">
                <Bot size={15} /> O bot está atendendo. Clique em <span className="font-mono">"Assumir conversa"</span> para digitar.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-ink-faint">
          <div className="text-center">
            <RefreshCw size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-body text-sm">Selecione uma conversa</p>
          </div>
        </div>
      )}
    </div>
  )
}
