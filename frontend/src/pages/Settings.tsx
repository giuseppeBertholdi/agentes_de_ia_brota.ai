import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Pencil, Check, X as XIcon,
  Smartphone, CheckCircle, XCircle, Loader2,
  Mail, Code2, Bot, Tag, Building2, Sparkles, Lock, ArrowRight,
  MessageSquareText, HandHelping, Heart, Bell, Users, FileText,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'
import { useSubscription } from '@/hooks/useSubscription'
import { useCheckout } from '@/hooks/useCheckout'
import { useWhatsappConnection } from '@/hooks/useWhatsappConnection'

interface Company {
  id: string
  name: string
  voice_tone: string
  business_desc: string
  business_hours?: string
  payment_instructions?: string
  followup_template_name?: string
  followup_template_language?: string
}
interface PriceItem { id?: string; name: string; description?: string; price: number; unit: string; active: boolean }
interface AgentConfig {
  agent_type: string
  enabled: boolean
  system_prompt?: string
  max_discount_pct?: number
  escalation_keywords?: string
}

const WA_STATUS_MAP: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  connected: { label: 'Conectado', variant: 'green' },
  disconnected: { label: 'Desconectado', variant: 'red' },
}

const AGENT_META: Record<string, { label: string; desc: string; icon: string }> = {
  receptionist: { label: 'Recepcionista', desc: 'Recebe mensagens, entende a intenção e roteia para o setor certo', icon: '🤝' },
  quote:        { label: 'Cotação',        desc: 'Coleta dados do cliente e gera orçamentos automaticamente',         icon: '💰' },
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-ink/10 rounded', className)} />
}

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-1">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

function TabIntro({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-soft text-sm font-body mb-5 max-w-2xl">{children}</p>
}

export default function Settings() {
  const [loading,     setLoading]     = useState(true)
  const [company,     setCompany]     = useState<Company | null>(null)
  const [prices,      setPrices]      = useState<PriceItem[]>([])
  const [agents,      setAgents]      = useState<AgentConfig[]>([])
  const [newItem,     setNewItem]     = useState<PriceItem>({ name: '', price: 0, unit: 'un', active: true })
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [priceQuestions, setPriceQuestions] = useState<string[]>([])
  const [priceAnswers,   setPriceAnswers]   = useState<Record<number, string>>({})
  const [askingAi,       setAskingAi]       = useState(false)
  const [askAiError,     setAskAiError]     = useState(false)

  const { active: subscriptionActive, loading: subLoading } = useSubscription()
  const { start: startCheckout, loading: startingCheckout } = useCheckout()
  const { wa, waLoading, waError, confirmingPayment, connectWa, disconnectWa } = useWhatsappConnection()

  const receptionist = agents.find(a => a.agent_type === 'receptionist')
  const quoteAgent = agents.find(a => a.agent_type === 'quote')

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    const [cRes, pRes, aRes] = await Promise.allSettled([
      api.get<Company>('/settings/company'),
      api.get<PriceItem[]>('/settings/prices'),
      api.get<AgentConfig[]>('/settings/agents'),
    ])

    if (cRes.status === 'fulfilled') setCompany(cRes.value)
    if (pRes.status === 'fulfilled') setPrices(pRes.value)
    if (aRes.status === 'fulfilled') {
      const loaded = aRes.value
      const defaults = ['receptionist', 'quote']
        .filter(type => !loaded.some(a => a.agent_type === type))
        .map(type => ({ agent_type: type, enabled: true }))
      setAgents([...loaded, ...defaults])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useRealtimeTable('companies',          load)
  useRealtimeTable('price_items',        load)
  useRealtimeTable('agent_configs',      load)

  // ── Company ───────────────────────────────────────────────────────────────
  const saveCompany = async () => {
    if (!company) return
    setSaving(true)
    await api.patch('/settings/company', {
      name: company.name,
      voice_tone: company.voice_tone,
      business_desc: company.business_desc,
      business_hours: company.business_hours,
      payment_instructions: company.payment_instructions,
      followup_template_name: company.followup_template_name,
      followup_template_language: company.followup_template_language,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await load()
  }

  // ── Agents ────────────────────────────────────────────────────────────────
  const saveAgent = async (type: string, patch: Partial<AgentConfig>) => {
    const current = agents.find(a => a.agent_type === type)
    await api.put(`/settings/agents/${type}`, {
      enabled: current?.enabled ?? true,
      system_prompt: current?.system_prompt,
      max_discount_pct: current?.max_discount_pct ?? 0,
      escalation_keywords: current?.escalation_keywords ?? '',
      ...patch,
    })
    await load()
  }

  // ── Prices ────────────────────────────────────────────────────────────────
  const askPriceQuestions = async () => {
    if (!newItem.name) return
    setAskingAi(true)
    setAskAiError(false)
    try {
      const r = await api.post<{ questions: string[] }>('/settings/prices/questions', { name: newItem.name })
      setPriceQuestions(r.questions)
      setPriceAnswers({})
      if (r.questions.length === 0) setAskAiError(true)
    } catch {
      setAskAiError(true)
    } finally {
      setAskingAi(false)
    }
  }

  const applyPriceAnswers = () => {
    const qa = priceQuestions
      .map((q, i) => (priceAnswers[i]?.trim() ? `${q} ${priceAnswers[i].trim()}` : null))
      .filter(Boolean)
      .join(' | ')
    if (!qa) return
    setNewItem(i => ({ ...i, description: i.description ? `${i.description} | ${qa}` : qa }))
    setPriceQuestions([])
    setPriceAnswers({})
  }

  const addPrice = async () => {
    if (!newItem.name || !newItem.price) return
    await api.post('/settings/prices', newItem)
    setNewItem({ name: '', price: 0, unit: 'un', active: true })
    setPriceQuestions([])
    setPriceAnswers({})
    await load()
  }

  const deletePrice = async (id?: string) => {
    if (!id) return
    await api.delete(`/settings/prices/${id}`)
    await load()
  }

  const startEdit = (item: PriceItem) => { setEditingId(item.id ?? null); setEditingItem({ ...item }) }
  const cancelEdit = () => { setEditingId(null); setEditingItem(null) }
  const saveEdit = async () => {
    if (!editingItem?.id) return
    await api.put(`/settings/prices/${editingItem.id}`, editingItem)
    setEditingId(null); setEditingItem(null)
    await load()
  }

  const agentToggle = (agent: AgentConfig) => {
    const meta = AGENT_META[agent.agent_type] ?? { label: agent.agent_type, desc: '', icon: '🤖' }
    return (
      <div
        key={agent.agent_type}
        className={cn(
          'border border-ink/10 rounded-md shadow-soft overflow-hidden',
          agent.enabled ? 'bg-white' : 'bg-cream-2 opacity-75'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-ink/10">
          <div className="w-9 h-9 rounded-md bg-green-tint border border-ink/10 flex items-center justify-center flex-none text-base">
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-sm text-ink">{meta.label}</div>
            <div className="text-ink-soft text-xs font-body leading-tight">{meta.desc}</div>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className={cn(
              'font-mono text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border',
              agent.enabled
                ? 'bg-green text-white border-green-deep'
                : 'bg-cream-2 text-ink-soft border-ink/30'
            )}>
              {agent.enabled ? 'Ativo' : 'Inativo'}
            </span>
            <div
              className={cn(
                'w-10 h-5 rounded-full border border-ink/10 relative transition-colors cursor-pointer',
                agent.enabled ? 'bg-green' : 'bg-cream-2'
              )}
              onClick={() => {
                setAgents(prev => prev.map(a =>
                  a.agent_type === agent.agent_type ? { ...a, enabled: !a.enabled } : a
                ))
                saveAgent(agent.agent_type, { enabled: !agent.enabled })
              }}
            >
              <div className={cn(
                'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white border border-ink/10 transition-all',
                agent.enabled ? 'left-4' : 'left-0.5'
              )} />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-faint">
              Prompt personalizado
            </label>
            {agent.system_prompt ? (
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-lime/50 border border-ink/20 rounded text-ink-soft uppercase tracking-wide">
                customizado
              </span>
            ) : (
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 bg-cream-2 border border-ink/20 rounded text-ink-faint uppercase tracking-wide">
                padrão
              </span>
            )}
          </div>
          <Textarea
            rows={3}
            placeholder="Deixe em branco para usar o padrão da Plimpost…"
            value={agent.system_prompt || ''}
            onChange={e => setAgents(prev => prev.map(a =>
              a.agent_type === agent.agent_type ? { ...a, system_prompt: e.target.value } : a
            ))}
            onBlur={() => saveAgent(agent.agent_type, { system_prompt: agent.system_prompt })}
          />
          <p className="text-ink-faint text-[11px] font-body">Salvo automaticamente ao sair do campo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      {!subLoading && !subscriptionActive && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-ink rounded-xl shadow-soft-md">
          <div className="w-9 h-9 rounded-full bg-green flex items-center justify-center flex-none">
            <Lock size={15} className="text-lime" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-body font-bold text-sm text-white leading-tight">Assinatura ainda não ativa</div>
            <p className="text-white/60 text-xs font-body mt-0.5">
              WhatsApp, Inbox, Pós-venda e Relatórios liberam assim que você assinar. Empresa, preços e agentes você já pode configurar livremente.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => startCheckout()} disabled={startingCheckout} className="flex-none">
            {startingCheckout ? <><Loader2 size={14} className="animate-spin" /> Abrindo…</> : <>Assinar — R$127/mês <ArrowRight size={14} /></>}
          </Button>
        </div>
      )}

      {/* ── WhatsApp — status de conexão, fica sempre visível, fora das categorias ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smartphone size={18} /> WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          {waError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-md text-red-700 text-sm font-body">
              {waError}
            </div>
          )}
          {confirmingPayment ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Loader2 size={22} className="animate-spin text-green" />
              <p className="text-ink-soft text-sm font-body">Confirmando seu pagamento…</p>
            </div>
          ) : subLoading ? null : !subscriptionActive ? (
            <div className="flex flex-col gap-3">
              <p className="text-ink-soft text-sm font-body">
                Assine o plano pra conectar seu número e deixar a IA atendendo de verdade.
              </p>
              <div className="flex items-end gap-2 p-3 bg-cream-2 border border-ink/10 rounded-md w-fit">
                <span className="text-ink-faint text-sm font-body line-through">R$ 207</span>
                <span className="font-display font-bold text-2xl text-ink leading-none">R$ 127</span>
                <span className="text-ink-soft text-xs font-body mb-0.5">/mês</span>
              </div>
              <Button variant="primary" onClick={() => startCheckout()} disabled={startingCheckout} className="w-fit">
                {startingCheckout ? <><Loader2 size={15} className="animate-spin" /> Abrindo…</> : <>Assinar para conectar <ArrowRight size={15} /></>}
              </Button>
            </div>
          ) : wa ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 bg-cream-2 border border-ink/10 rounded-md">
                <Badge variant={WA_STATUS_MAP[wa.status]?.variant ?? 'gray'}>
                  {WA_STATUS_MAP[wa.status]?.label ?? wa.status}
                </Badge>
                {wa.display_phone_number && (
                  <span className="font-mono font-bold text-sm text-ink">{wa.display_phone_number}</span>
                )}
                {wa.verified_name && (
                  <span className="text-ink-soft text-xs font-body">· {wa.verified_name}</span>
                )}
              </div>
              {wa.status === 'connected' && (
                <div className="flex items-center gap-2 text-green text-sm font-body font-bold">
                  <CheckCircle size={16} /> Número conectado e recebendo mensagens
                </div>
              )}
              {wa.status === 'disconnected' ? (
                <Button variant="primary" onClick={connectWa} disabled={waLoading}>
                  {waLoading ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
                  {waLoading ? 'Conectando…' : 'Reconectar WhatsApp'}
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={disconnectWa} disabled={waLoading}>
                  <XCircle size={14} /> Desconectar
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-ink-soft text-sm font-body">
                Conecte seu número de WhatsApp para o bot começar a atender.
              </p>
              <Button variant="primary" onClick={connectWa} disabled={waLoading}>
                {waLoading ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
                {waLoading ? 'Conectando…' : 'Conectar WhatsApp'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="ia">
        <TabsList>
          <TabsTrigger value="ia"><Bot size={13} className="inline mr-1.5 -mt-0.5" />IA</TabsTrigger>
          <TabsTrigger value="negociacao"><MessageSquareText size={13} className="inline mr-1.5 -mt-0.5" />Negociação</TabsTrigger>
          <TabsTrigger value="humano"><HandHelping size={13} className="inline mr-1.5 -mt-0.5" />Atendimento humano</TabsTrigger>
          <TabsTrigger value="vendas"><Tag size={13} className="inline mr-1.5 -mt-0.5" />Vendas</TabsTrigger>
          <TabsTrigger value="followups"><Heart size={13} className="inline mr-1.5 -mt-0.5" />Follow-ups</TabsTrigger>
          <TabsTrigger value="notificacoes"><Bell size={13} className="inline mr-1.5 -mt-0.5" />Notificações</TabsTrigger>
        </TabsList>

        {/* ══════════════ IA ══════════════ */}
        <TabsContent value="ia">
          <TabIntro>
            Quem é sua IA, como ela fala e o que ela sabe sobre o seu negócio. Ela continua
            disponível pro cliente em qualquer momento da conversa — mesmo depois de uma
            cotação aceita ou paga — a não ser que você mesmo assuma a conversa.
          </TabIntro>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 size={18} /> Personalidade e objetivo</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <SectionSkeleton /> : company ? (
                <div className="flex flex-col gap-4">
                  {(company.name || company.voice_tone || company.business_desc) && (
                    <div className="flex items-start gap-2.5 p-3 bg-green-tint border border-green/25 rounded-md">
                      <Sparkles size={14} className="text-green mt-0.5 flex-none" />
                      <div className="text-xs font-body text-green-deep leading-relaxed">
                        <span className="font-bold">Configurado: </span>
                        {[company.name, company.voice_tone && `tom: ${company.voice_tone}`, company.business_desc && 'descrição salva']
                          .filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                      Nome da empresa
                    </label>
                    <Input
                      value={company.name}
                      onChange={e => setCompany(c => c ? { ...c, name: e.target.value } : c)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                      Tom de voz dos agentes
                    </label>
                    <Input
                      placeholder="Ex: Amigável e descontraído, como se fosse um amigo"
                      value={company.voice_tone || ''}
                      onChange={e => setCompany(c => c ? { ...c, voice_tone: e.target.value } : c)}
                    />
                    <p className="text-ink-faint text-[11px] font-body">Define como a IA escreve — formal, descontraída, direta…</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                      Descrição do negócio
                    </label>
                    <Textarea
                      placeholder="Descreva o que sua empresa faz, produtos, público…"
                      rows={3}
                      value={company.business_desc || ''}
                      onChange={e => setCompany(c => c ? { ...c, business_desc: e.target.value } : c)}
                    />
                    <p className="text-ink-faint text-[11px] font-body">O que a IA sabe sobre o seu negócio pra responder dúvidas gerais.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                      Horário de funcionamento
                    </label>
                    <Input
                      placeholder="Ex: Seg a Sex, 8h às 18h · Sáb 8h às 12h"
                      value={company.business_hours || ''}
                      onChange={e => setCompany(c => c ? { ...c, business_hours: e.target.value } : c)}
                    />
                    <p className="text-ink-faint text-[11px] font-body">A IA usa isso pra responder quando o cliente perguntar se você está aberto.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="primary" onClick={saveCompany} disabled={saving}>
                      {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando…</> : 'Salvar'}
                    </Button>
                    {saved && (
                      <span className="flex items-center gap-1 text-green text-sm font-body font-bold">
                        <Check size={14} /> Salvo!
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-ink-faint text-sm font-body py-2">
                  Dados da empresa não disponíveis. Verifique a conexão e recarregue.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot size={18} /> Agentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1,2].map(i => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {agents.map(agentToggle)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ Negociação ══════════════ */}
        <TabsContent value="negociacao">
          <TabIntro>
            O quanto a IA pode ceder sozinha numa negociação de preço. Acima desse limite,
            ela nunca fecha por conta própria — ela avisa o cliente que vai verificar com a
            equipe, e a solicitação aparece em <Link to="/app/approvals" className="text-green-deep font-bold hover:underline">Aprovações</Link> pra
            você aceitar ou recusar.
          </TabIntro>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquareText size={18} /> Desconto máximo</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <SectionSkeleton /> : quoteAgent ? (
                <div className="flex flex-col gap-1.5 max-w-sm">
                  <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                    Desconto máximo que a IA pode oferecer sozinha
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min={0} max={100}
                      value={quoteAgent.max_discount_pct ?? 0}
                      onChange={e => setAgents(prev => prev.map(a =>
                        a.agent_type === 'quote' ? { ...a, max_discount_pct: Number(e.target.value) } : a
                      ))}
                      onBlur={() => saveAgent('quote', { max_discount_pct: quoteAgent.max_discount_pct ?? 0 })}
                    />
                    <span className="text-ink-soft text-sm font-body">%</span>
                  </div>
                  <p className="text-ink-faint text-[11px] font-body mt-1">
                    {quoteAgent.max_discount_pct
                      ? `A IA pode negociar até ${quoteAgent.max_discount_pct}% sozinha. Um pedido de desconto maior fica pendente de aprovação sua.`
                      : 'A IA não negocia sozinha — qualquer pedido de desconto fica pendente de aprovação sua.'}
                  </p>
                </div>
              ) : (
                <p className="text-ink-faint text-sm font-body py-2">Carregando configuração do agente de cotação…</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ Atendimento humano ══════════════ */}
        <TabsContent value="humano">
          <TabIntro>
            Quando a IA para e chama alguém da equipe. Além das regras abaixo, sempre que o
            cliente pedir explicitamente para falar com uma pessoa, a IA transfere na hora —
            não precisa configurar nada pra isso funcionar.
          </TabIntro>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HandHelping size={18} /> Escalonamento automático</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <SectionSkeleton /> : receptionist ? (
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                    Palavras que chamam um humano na hora
                  </label>
                  <Input
                    placeholder="Ex: cancelar, reclamação, advogado, processar"
                    value={receptionist.escalation_keywords || ''}
                    onChange={e => setAgents(prev => prev.map(a =>
                      a.agent_type === 'receptionist' ? { ...a, escalation_keywords: e.target.value } : a
                    ))}
                    onBlur={() => saveAgent('receptionist', { escalation_keywords: receptionist.escalation_keywords || '' })}
                  />
                  <p className="text-ink-faint text-[11px] font-body">
                    Separe por vírgula. Se o cliente mandar uma dessas palavras, a IA para na hora, sem responder mais nada, e chama alguém da equipe.
                  </p>
                </div>
              ) : (
                <p className="text-ink-faint text-sm font-body py-2">Carregando configuração do recepcionista…</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users size={18} /> Setores e equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-ink-soft text-sm font-body mb-3">
                Setores (ex: RH, Financeiro) e quem atende cada área ficam na página <b>Equipe</b> —
                a IA já transfere automaticamente quando o cliente pede um setor específico.
              </p>
              <Link to="/app/team">
                <Button variant="ghost" size="sm"><Users size={14} /> Ir para Equipe</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ Vendas ══════════════ */}
        <TabsContent value="vendas">
          <TabIntro>
            Tabela de preços que a IA usa pra montar cotações, e como o cliente paga depois
            de fechar negócio.
          </TabIntro>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag size={18} /> Tabela de preços
                {prices.length > 0 && (
                  <span className="ml-auto font-mono text-[11px] font-bold text-ink-soft border border-ink/15 rounded px-1.5 py-0.5 bg-cream-2">
                    {prices.length} {prices.length === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-2 mb-5">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-2 mb-5">
                  {prices.map(item => (
                    <div
                      key={item.id}
                      className="border border-ink/10 rounded-md shadow-soft bg-white overflow-hidden"
                    >
                      {editingId === item.id && editingItem ? (
                        <div className="p-3 flex flex-col gap-2 bg-cream-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input placeholder="Nome" value={editingItem.name}
                              onChange={e => setEditingItem(i => i ? { ...i, name: e.target.value } : i)} />
                            <Input placeholder="Descrição (opcional)" value={editingItem.description || ''}
                              onChange={e => setEditingItem(i => i ? { ...i, description: e.target.value } : i)} />
                            <Input type="number" placeholder="Preço (R$)" value={editingItem.price || ''}
                              onChange={e => setEditingItem(i => i ? { ...i, price: Number(e.target.value) } : i)} />
                            <Input placeholder="Unidade" value={editingItem.unit}
                              onChange={e => setEditingItem(i => i ? { ...i, unit: e.target.value } : i)} />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={saveEdit}><Check size={13} /> Salvar</Button>
                            <Button variant="ghost"   size="sm" onClick={cancelEdit}><XIcon size={13} /> Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-md bg-green-tint border border-ink/10 flex items-center justify-center flex-none">
                            <Tag size={13} className="text-green-deep" />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <div className="font-body font-bold text-sm text-ink leading-tight">{item.name}</div>
                            {item.description && (
                              <div className="text-ink-faint text-xs font-body truncate">{item.description}</div>
                            )}
                          </div>
                          <span className="font-mono font-bold text-sm text-green whitespace-nowrap px-2 py-1 bg-green-tint border border-green/40 rounded">
                            R$ {Number(item.price).toFixed(2)}<span className="text-ink-faint font-normal"> /{item.unit}</span>
                          </span>
                          <div className="flex items-center gap-1 flex-none">
                            <button
                              onClick={() => startEdit(item)}
                              className="w-7 h-7 rounded flex items-center justify-center text-ink-faint hover:text-ink hover:bg-cream-2 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => deletePrice(item.id)}
                              className="w-7 h-7 rounded flex items-center justify-center text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {prices.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 border border-dashed border-ink/20 rounded-md">
                      <Tag size={28} className="text-ink/20" />
                      <p className="text-ink-faint text-sm font-body text-center">
                        Nenhum item cadastrado.<br />
                        <span className="text-ink-soft">Adicione pelo formulário ou peça ao assistente de IA.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t-2 border-ink/10 pt-4 flex flex-col gap-3">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Novo item</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Nome do produto/serviço"   value={newItem.name}              onChange={e => setNewItem(i => ({ ...i, name:  e.target.value }))} />
                  <Input placeholder="Descrição (opcional)"      value={newItem.description || ''} onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))} />
                  <Input type="number" placeholder="Preço (R$)"  value={newItem.price || ''}       onChange={e => setNewItem(i => ({ ...i, price: Number(e.target.value) }))} />
                  <Input placeholder="Unidade (un, m², hora…)"   value={newItem.unit}              onChange={e => setNewItem(i => ({ ...i, unit:  e.target.value }))} />
                </div>

                <Button variant="ghost" size="sm" onClick={askPriceQuestions} disabled={!newItem.name || askingAi} className="self-start">
                  {askingAi ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Perguntar à IA o que é importante saber sobre esse item
                </Button>

                {askAiError && (
                  <p className="text-red-600 text-xs font-body">Não consegui gerar sugestões agora, tenta de novo.</p>
                )}

                {priceQuestions.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-cream-2 border border-ink/10 rounded-md">
                    {priceQuestions.map((q, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <label className="text-xs font-body text-ink-soft">{q}</label>
                        <Input
                          value={priceAnswers[i] || ''}
                          onChange={e => setPriceAnswers(a => ({ ...a, [i]: e.target.value }))}
                          placeholder="Sua resposta"
                        />
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={applyPriceAnswers} className="self-start">
                      Adicionar respostas à descrição
                    </Button>
                  </div>
                )}

                <Button variant="primary" size="sm" onClick={addPrice} disabled={!newItem.name || !newItem.price}>
                  <Plus size={15} /> Adicionar item
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText size={18} /> Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <SectionSkeleton /> : company ? (
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                    Instruções de pagamento
                  </label>
                  <Textarea
                    placeholder="Ex: Chave Pix: contato@empresa.com.br — ou link de pagamento"
                    rows={2}
                    value={company.payment_instructions || ''}
                    onChange={e => setCompany(c => c ? { ...c, payment_instructions: e.target.value } : c)}
                  />
                  <p className="text-ink-faint text-[11px] font-body mb-2">
                    Enviado automaticamente ao cliente assim que ele aceita uma cotação.
                  </p>
                  <Button variant="primary" size="sm" onClick={saveCompany} disabled={saving} className="self-start">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando…</> : 'Salvar'}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ Follow-ups ══════════════ */}
        <TabsContent value="followups">
          <TabIntro>
            Mensagens automáticas de pós-venda (satisfação e recompra). Veja e envie
            manualmente em <Link to="/app/post-sale" className="text-green-deep font-bold hover:underline">Pós-venda</Link>.
          </TabIntro>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Heart size={18} /> Template de reengajamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2.5 p-3 bg-cream-2 border border-ink/10 rounded-md mb-4 text-xs font-body text-ink-soft leading-relaxed">
                O WhatsApp só permite mandar mensagem de texto livre até 24h depois da
                última mensagem do cliente. Passado esse prazo — o caso comum de um
                follow-up de 3 ou 30 dias — é obrigatório usar um <b>Message Template</b> aprovado
                pela Meta. Sem isso configurado, o follow-up só é entregue se o cliente
                tiver falado com você recentemente.
              </div>
              {loading ? <SectionSkeleton /> : company ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                      Nome do template aprovado
                    </label>
                    <Input
                      placeholder="Ex: pos_venda_recompra"
                      value={company.followup_template_name || ''}
                      onChange={e => setCompany(c => c ? { ...c, followup_template_name: e.target.value } : c)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                      Idioma do template
                    </label>
                    <Input
                      placeholder="pt_BR"
                      value={company.followup_template_language || 'pt_BR'}
                      onChange={e => setCompany(c => c ? { ...c, followup_template_language: e.target.value } : c)}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-3 mt-1">
                    <Button variant="primary" size="sm" onClick={saveCompany} disabled={saving}>
                      {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando…</> : 'Salvar'}
                    </Button>
                    {saved && (
                      <span className="flex items-center gap-1 text-green text-sm font-body font-bold">
                        <Check size={14} /> Salvo!
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ Notificações ══════════════ */}
        <TabsContent value="notificacoes">
          <TabIntro>
            O que te avisa quando algo precisa da sua atenção — sem precisar ficar
            checando o Inbox o dia todo.
          </TabIntro>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell size={18} /> Alertas ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 p-3 border border-ink/10 rounded-md bg-white">
                  <Badge variant="yellow" className="flex-none mt-0.5">Inbox</Badge>
                  <p className="text-ink-soft text-sm font-body">
                    Toda vez que um cliente aceita uma cotação, aparece um badge no menu
                    "Inbox" e o título da aba do navegador muda — pra você saber que precisa
                    cobrar o pagamento.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 border border-ink/10 rounded-md bg-white">
                  <Badge variant="lime" className="flex-none mt-0.5">Aprovações</Badge>
                  <p className="text-ink-soft text-sm font-body">
                    Quando a IA recebe um pedido de desconto acima do limite configurado em
                    Negociação, aparece um badge no menu "Aprovações" até você decidir.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Suporte / Desenvolvedor ── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code2 size={18} /> Suporte &amp; Desenvolvedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-5 items-start">
            <div className="w-14 h-14 rounded-full bg-green border border-ink/10 shadow-soft flex items-center justify-center font-display font-bold text-xl text-white flex-none">
              GB
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-base text-ink">Giuseppe Bertholdi</div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-green mt-0.5">Fundador &amp; Dev</div>
              <p className="text-ink-soft text-sm font-body mt-2 leading-relaxed">
                Desenvolvedor full-stack e empreendedor brasileiro. A Plimpost nasceu da vontade de trazer IA de verdade pra negócios locais — simples de configurar, poderosa de verdade.
              </p>
              <p className="text-ink-soft text-sm font-body mt-2 leading-relaxed">
                Precisa de ajuda com sua conta, cobrança ou WhatsApp? Fale direto comigo por um dos canais abaixo.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Python · FastAPI', 'React · TypeScript', 'Supabase', 'GPT-4o', 'WhatsApp Cloud API'].map(tag => (
                  <span key={tag} className="font-mono text-[10px] font-bold px-2 py-1 border border-ink/10 rounded bg-cream-2 ">{tag}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <a
                  href="mailto:giuseppe.bertholdi@gmail.com"
                  className="flex items-center gap-1.5 px-3 py-2 bg-ink text-white text-xs font-body font-bold rounded-md border border-ink/10 shadow-soft hover:shadow-soft-md transition-shadow"
                >
                  <Mail size={13} /> Email
                </a>
                <a
                  href="https://linkedin.com/in/giuseppe-bertholdi"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-tint text-green-deep text-xs font-body font-bold rounded-md border border-ink/10 shadow-soft hover:shadow-soft-md transition-shadow"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
