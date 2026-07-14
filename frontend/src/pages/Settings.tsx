import { useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, Pencil, Check, X as XIcon,
  Smartphone, CheckCircle, XCircle, Loader2,
  Mail, Code2, Bot, Tag, Building2, Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'
import PaywallModal from '@/components/PaywallModal'

interface Company { id: string; name: string; voice_tone: string; business_desc: string }
interface PriceItem { id?: string; name: string; description?: string; price: number; unit: string; active: boolean }
interface AgentConfig { agent_type: string; enabled: boolean; system_prompt?: string }
interface WaInstance { phone_number_id: string; waba_id: string; status: string; display_phone_number?: string; verified_name?: string }

const WA_STATUS_MAP: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  connected: { label: 'Conectado', variant: 'green' },
  disconnected: { label: 'Desconectado', variant: 'red' },
}

const AGENT_META: Record<string, { label: string; desc: string; icon: string }> = {
  receptionist: { label: 'Recepcionista', desc: 'Recebe mensagens, entende a intenção e roteia para o setor certo', icon: '🤝' },
  quote:        { label: 'Cotação',        desc: 'Coleta dados do cliente e gera orçamentos automaticamente',         icon: '💰' },
}

declare global { interface Window { FB?: any; fbAsyncInit?: () => void } }

type SignupData = { waba_id: string; phone_number_id: string }

const META_APP_ID    = import.meta.env.VITE_META_APP_ID
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID

function loadFacebookSdk(): Promise<void> {
  return new Promise(resolve => {
    if (window.FB) return resolve()
    window.fbAsyncInit = () => { window.FB!.init({ appId: META_APP_ID, version: 'v21.0' }); resolve() }
    if (document.getElementById('facebook-jssdk')) return
    const s = document.createElement('script')
    s.id = 'facebook-jssdk'; s.src = 'https://connect.facebook.net/pt_BR/sdk.js'; s.async = true
    document.body.appendChild(s)
  })
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

export default function Settings() {
  const [loading,     setLoading]     = useState(true)
  const [company,     setCompany]     = useState<Company | null>(null)
  const [prices,      setPrices]      = useState<PriceItem[]>([])
  const [agents,      setAgents]      = useState<AgentConfig[]>([])
  const [wa,          setWa]          = useState<WaInstance | null>(null)
  const [newItem,     setNewItem]     = useState<PriceItem>({ name: '', price: 0, unit: 'un', active: true })
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [waLoading,   setWaLoading]   = useState(false)
  const [waError,     setWaError]     = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    const [cRes, pRes, aRes, wRes] = await Promise.allSettled([
      api.get<Company>('/settings/company'),
      api.get<PriceItem[]>('/settings/prices'),
      api.get<AgentConfig[]>('/settings/agents'),
      api.get<WaInstance | Record<string, never>>('/settings/whatsapp'),
    ])

    if (cRes.status === 'fulfilled') setCompany(cRes.value)
    if (pRes.status === 'fulfilled') setPrices(pRes.value)
    if (aRes.status === 'fulfilled') {
      setAgents(aRes.value.length ? aRes.value : [
        { agent_type: 'receptionist', enabled: true },
        { agent_type: 'quote',        enabled: true },
      ])
    }
    if (wRes.status === 'fulfilled') {
      const w = wRes.value
      setWa(Object.keys(w).length ? w as WaInstance : null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useRealtimeTable('whatsapp_instances', load)
  useRealtimeTable('companies',          load)
  useRealtimeTable('price_items',        load)
  useRealtimeTable('agent_configs',      load)

  // WhatsApp postMessage
  const signupDataRef = useRef<SignupData | null>(null)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.origin.endsWith('facebook.com')) return
      try {
        const d = JSON.parse(e.data)
        if (d.type === 'WA_EMBEDDED_SIGNUP' && d.event === 'FINISH')
          signupDataRef.current = { waba_id: d.data.waba_id, phone_number_id: d.data.phone_number_id }
      } catch { /* non-JSON */ }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // ── Company ───────────────────────────────────────────────────────────────
  const saveCompany = async () => {
    if (!company) return
    setSaving(true)
    await api.patch('/settings/company', {
      name: company.name, voice_tone: company.voice_tone, business_desc: company.business_desc,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await load()
  }

  // ── Agents ────────────────────────────────────────────────────────────────
  const saveAgent = async (type: string, enabled: boolean, prompt?: string) => {
    await api.put(`/settings/agents/${type}`, { enabled, system_prompt: prompt })
    await load()
  }

  // ── Prices ────────────────────────────────────────────────────────────────
  const addPrice = async () => {
    if (!newItem.name || !newItem.price) return
    await api.post('/settings/prices', newItem)
    setNewItem({ name: '', price: 0, unit: 'un', active: true })
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

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const connectWa = async () => {
    setWaLoading(true); setWaError(null); signupDataRef.current = null
    try {
      await loadFacebookSdk()
      const response: any = await new Promise(resolve =>
        window.FB!.login(resolve, {
          config_id: META_CONFIG_ID, response_type: 'code',
          override_default_response_type: true, extras: { setup: {} },
        })
      )
      const code = response?.authResponse?.code
      const sd = signupDataRef.current
      if (!code || !sd) throw new Error('Conexão cancelada ou incompleta')
      await api.post('/settings/whatsapp/embedded-signup', {
        code, waba_id: (sd as SignupData).waba_id, phone_number_id: (sd as SignupData).phone_number_id,
      })
      await load()
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setPaywallOpen(true)
      } else {
        setWaError(e instanceof Error ? e.message : 'Erro ao conectar')
      }
    } finally { setWaLoading(false) }
  }

  const disconnectWa = async () => {
    setWaLoading(true)
    try { await api.post('/settings/whatsapp/disconnect'); await load() }
    finally { setWaLoading(false) }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-7">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Configurações</h1>
        <p className="text-ink-soft text-sm mt-1 font-body">Configure sua empresa, preços e agentes de IA</p>
      </div>

      {/* ── WhatsApp ── */}
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
          {wa ? (
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

      {/* ── Empresa ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={18} /> Dados da empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <SectionSkeleton /> : company ? (
            <div className="flex flex-col gap-4">
              {/* Preview do que o bot sabe */}
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

      {/* ── Preços ── */}
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
                      <div className="grid grid-cols-2 gap-2">
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
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-md bg-green-tint border border-ink/10 flex items-center justify-center flex-none">
                        <Tag size={13} className="text-green-deep" />
                      </div>
                      <div className="flex-1 min-w-0">
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
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome do produto/serviço"   value={newItem.name}              onChange={e => setNewItem(i => ({ ...i, name:  e.target.value }))} />
              <Input placeholder="Descrição (opcional)"      value={newItem.description || ''} onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))} />
              <Input type="number" placeholder="Preço (R$)"  value={newItem.price || ''}       onChange={e => setNewItem(i => ({ ...i, price: Number(e.target.value) }))} />
              <Input placeholder="Unidade (un, m², hora…)"   value={newItem.unit}              onChange={e => setNewItem(i => ({ ...i, unit:  e.target.value }))} />
            </div>
            <Button variant="primary" size="sm" onClick={addPrice} disabled={!newItem.name || !newItem.price}>
              <Plus size={15} /> Adicionar item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Agentes ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot size={18} /> Agentes de IA</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1,2].map(i => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {agents.map(agent => {
                const meta = AGENT_META[agent.agent_type] ?? { label: agent.agent_type, desc: '', icon: '🤖' }
                return (
                  <div
                    key={agent.agent_type}
                    className={cn(
                      'border border-ink/10 rounded-md shadow-soft overflow-hidden',
                      agent.enabled ? 'bg-white' : 'bg-cream-2 opacity-75'
                    )}
                  >
                    {/* Header do agente */}
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
                            saveAgent(agent.agent_type, !agent.enabled, agent.system_prompt)
                          }}
                        >
                          <div className={cn(
                            'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white border border-ink/10 transition-all',
                            agent.enabled ? 'left-4' : 'left-0.5'
                          )} />
                        </div>
                      </div>
                    </div>

                    {/* Prompt */}
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
                        onBlur={() => saveAgent(agent.agent_type, agent.enabled, agent.system_prompt)}
                      />
                      <p className="text-ink-faint text-[11px] font-body">Salvo automaticamente ao sair do campo.</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Desenvolvedor ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code2 size={18} /> Desenvolvedor</CardTitle>
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

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
