import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Pencil, Check, X as XIcon, Smartphone, CheckCircle, XCircle, Loader2, Mail, Code2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useRealtimeTable } from '@/hooks/useRealtime'

interface Company { id: string; name: string; voice_tone: string; business_desc: string }
interface PriceItem { id?: string; name: string; description?: string; price: number; unit: string; active: boolean }
interface AgentConfig { agent_type: string; enabled: boolean; system_prompt?: string }
interface WaInstance { phone_number_id: string; waba_id: string; status: string; display_phone_number?: string; verified_name?: string }

const WA_STATUS_MAP: Record<string, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  connected: { label: 'Conectado', variant: 'green' },
  disconnected: { label: 'Desconectado', variant: 'red' },
}

declare global {
  interface Window { FB?: any; fbAsyncInit?: () => void }
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID

function loadFacebookSdk(): Promise<void> {
  return new Promise(resolve => {
    if (window.FB) return resolve()
    window.fbAsyncInit = () => {
      window.FB!.init({ appId: META_APP_ID, version: 'v21.0' })
      resolve()
    }
    if (document.getElementById('facebook-jssdk')) return
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.async = true
    document.body.appendChild(script)
  })
}

export default function Settings() {
  const [company, setCompany] = useState<Company | null>(null)
  const [prices, setPrices] = useState<PriceItem[]>([])
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [wa, setWa] = useState<WaInstance | null>(null)
  const [newItem, setNewItem] = useState<PriceItem>({ name: '', price: 0, unit: 'un', active: true })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [waLoading, setWaLoading] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)

  const load = async () => {
    const [c, p, a, w] = await Promise.all([
      api.get<Company>('/settings/company'),
      api.get<PriceItem[]>('/settings/prices'),
      api.get<AgentConfig[]>('/settings/agents'),
      api.get<WaInstance | Record<string, never>>('/settings/whatsapp'),
    ])
    setCompany(c)
    setPrices(p)
    setAgents(a.length ? a : [
      { agent_type: 'receptionist', enabled: true },
      { agent_type: 'quote', enabled: true },
    ])
    setWa(Object.keys(w).length ? w as WaInstance : null)
  }

  useEffect(() => { load().catch(console.error) }, [])
  useRealtimeTable('whatsapp_instances', () => load().catch(console.error))
  useRealtimeTable('companies',    () => load().catch(console.error))
  useRealtimeTable('price_items',  () => load().catch(console.error))
  useRealtimeTable('agent_configs',() => load().catch(console.error))

  // Captura waba_id/phone_number_id emitidos pelo Embedded Signup via postMessage
  const signupDataRef = useRef<{ waba_id: string; phone_number_id: string } | null>(null)
  const readSignupData = () => signupDataRef.current
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH') {
          signupDataRef.current = {
            waba_id: data.data.waba_id,
            phone_number_id: data.data.phone_number_id,
          }
        }
      } catch {
        // ignora mensagens que não são JSON do embedded signup
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const saveCompany = async () => {
    if (!company) return
    setSaving(true)
    await api.patch('/settings/company', {
      name: company.name,
      voice_tone: company.voice_tone,
      business_desc: company.business_desc,
    })
    setSaving(false)
  }

  const saveAgent = async (type: string, enabled: boolean, prompt?: string) => {
    await api.put(`/settings/agents/${type}`, { enabled, system_prompt: prompt })
    load()
  }

  const addPrice = async () => {
    if (!newItem.name || !newItem.price) return
    await api.post('/settings/prices', newItem)
    setNewItem({ name: '', price: 0, unit: 'un', active: true })
    load()
  }

  const deletePrice = async (id?: string) => {
    if (!id) return
    await api.delete(`/settings/prices/${id}`)
    load()
  }

  const startEdit = (item: PriceItem) => {
    setEditingId(item.id ?? null)
    setEditingItem({ ...item })
  }

  const cancelEdit = () => { setEditingId(null); setEditingItem(null) }

  const saveEdit = async () => {
    if (!editingItem?.id) return
    await api.put(`/settings/prices/${editingItem.id}`, editingItem)
    setEditingId(null)
    setEditingItem(null)
    load()
  }

  const connectWa = async () => {
    setWaLoading(true)
    setWaError(null)
    signupDataRef.current = null
    try {
      await loadFacebookSdk()
      const response: any = await new Promise(resolve => {
        window.FB!.login(resolve, {
          config_id: META_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {} },
        })
      })

      const code = response?.authResponse?.code
      const signupData = readSignupData()
      if (!code || !signupData) {
        throw new Error('Conexão cancelada ou incompleta')
      }

      await api.post('/settings/whatsapp/embedded-signup', {
        code,
        waba_id: signupData.waba_id,
        phone_number_id: signupData.phone_number_id,
      })
      await load()
    } catch (e) {
      setWaError(e instanceof Error ? e.message : 'Erro ao conectar')
    } finally {
      setWaLoading(false)
    }
  }

  const disconnectWa = async () => {
    setWaLoading(true)
    try { await api.post('/settings/whatsapp/disconnect'); load() }
    finally { setWaLoading(false) }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-7">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Configurações</h1>
        <p className="text-ink-soft text-sm mt-1 font-body">Configure sua empresa, preços e agentes de IA</p>
      </div>

      {/* WhatsApp */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smartphone size={18} /> WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          {waError && (
            <div className="mb-3 p-3 bg-red-50 border-2 border-red-400 rounded-md text-red-700 text-sm font-body">
              {waError}
            </div>
          )}

          {wa ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Badge variant={WA_STATUS_MAP[wa.status]?.variant ?? 'gray'}>
                  {WA_STATUS_MAP[wa.status]?.label ?? wa.status}
                </Badge>
                {wa.display_phone_number && <span className="text-ink-soft text-sm font-mono">{wa.display_phone_number}</span>}
                {wa.verified_name && <span className="text-ink-faint text-xs font-body">({wa.verified_name})</span>}
              </div>

              {wa.status === 'connected' && (
                <div className="flex items-center gap-2 text-green text-sm font-body font-bold">
                  <CheckCircle size={16} /> Número conectado com sucesso!
                </div>
              )}

              {wa.status === 'disconnected' && (
                <Button variant="primary" onClick={connectWa} disabled={waLoading}>
                  {waLoading ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
                  {waLoading ? 'Conectando…' : 'Conectar WhatsApp'}
                </Button>
              )}

              {wa.status === 'connected' && (
                <Button variant="danger" size="sm" onClick={disconnectWa} disabled={waLoading}>
                  <XCircle size={14} /> Desconectar
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-ink-soft text-sm font-body">Conecte seu número de WhatsApp para o bot começar a atender.</p>
              <Button variant="primary" onClick={connectWa} disabled={waLoading}>
                {waLoading ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
                {waLoading ? 'Conectando…' : 'Conectar WhatsApp'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Dados da empresa</CardTitle></CardHeader>
        <CardContent>
          {company && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Nome da empresa</label>
                <Input value={company.name} onChange={e => setCompany(c => c ? { ...c, name: e.target.value } : c)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Tom de voz dos agentes</label>
                <Input
                  placeholder="Ex: Amigável e descontraído, como se fosse um amigo"
                  value={company.voice_tone}
                  onChange={e => setCompany(c => c ? { ...c, voice_tone: e.target.value } : c)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Descrição do negócio</label>
                <Textarea
                  placeholder="Descreva o que sua empresa faz, produtos, público…"
                  rows={3}
                  value={company.business_desc || ''}
                  onChange={e => setCompany(c => c ? { ...c, business_desc: e.target.value } : c)}
                />
              </div>
              <Button variant="primary" onClick={saveCompany} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price table */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Tabela de preços</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 mb-5">
            {prices.map(item => (
              <div key={item.id} className="border-2 border-ink rounded-md shadow-hard bg-cream-2 overflow-hidden">
                {editingId === item.id && editingItem ? (
                  <div className="p-3 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Nome"
                        value={editingItem.name}
                        onChange={e => setEditingItem(i => i ? { ...i, name: e.target.value } : i)}
                      />
                      <Input
                        placeholder="Descrição (opcional)"
                        value={editingItem.description || ''}
                        onChange={e => setEditingItem(i => i ? { ...i, description: e.target.value } : i)}
                      />
                      <Input
                        type="number"
                        placeholder="Preço (R$)"
                        value={editingItem.price || ''}
                        onChange={e => setEditingItem(i => i ? { ...i, price: Number(e.target.value) } : i)}
                      />
                      <Input
                        placeholder="Unidade"
                        value={editingItem.unit}
                        onChange={e => setEditingItem(i => i ? { ...i, unit: e.target.value } : i)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={saveEdit}><Check size={13} /> Salvar</Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}><XIcon size={13} /> Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1">
                      <span className="font-body font-bold text-sm text-ink">{item.name}</span>
                      {item.description && <span className="text-ink-faint text-xs font-body ml-2">— {item.description}</span>}
                    </div>
                    <span className="font-mono font-bold text-sm text-green whitespace-nowrap">
                      R$ {Number(item.price).toFixed(2)} / {item.unit}
                    </span>
                    <button onClick={() => startEdit(item)} className="text-ink-faint hover:text-ink transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deletePrice(item.id)} className="text-ink-faint hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {prices.length === 0 && (
              <p className="text-ink-faint text-sm font-body py-2">Nenhum item ainda. Adicione abaixo.</p>
            )}
          </div>

          <div className="border-t-2 border-ink/10 pt-4 flex flex-col gap-3">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Novo item</div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome do produto/serviço" value={newItem.name} onChange={e => setNewItem(i => ({ ...i, name: e.target.value }))} />
              <Input placeholder="Descrição (opcional)" value={newItem.description || ''} onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))} />
              <Input type="number" placeholder="Preço (R$)" value={newItem.price || ''} onChange={e => setNewItem(i => ({ ...i, price: Number(e.target.value) }))} />
              <Input placeholder="Unidade (un, m², hora…)" value={newItem.unit} onChange={e => setNewItem(i => ({ ...i, unit: e.target.value }))} />
            </div>
            <Button variant="primary" size="sm" onClick={addPrice}>
              <Plus size={15} /> Adicionar item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agents */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Agentes de IA</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            {agents.map(agent => (
              <div key={agent.agent_type} className="border-2 border-ink rounded-md shadow-hard p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-display font-bold text-base text-ink capitalize">
                      {agent.agent_type === 'receptionist' ? 'Recepcionista' : 'Cotação'}
                    </div>
                    <div className="text-ink-soft text-xs font-body">
                      {agent.agent_type === 'receptionist'
                        ? 'Recebe mensagens, entende a intenção e roteia'
                        : 'Coleta dados e gera orçamentos automaticamente'}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-mono text-ink-soft">{agent.enabled ? 'Ativo' : 'Inativo'}</span>
                    <div
                      className={`w-10 h-5 rounded-full border-2 border-ink relative transition-colors cursor-pointer ${agent.enabled ? 'bg-green' : 'bg-cream-2'}`}
                      onClick={() => {
                        const updated = agents.map(a => a.agent_type === agent.agent_type ? { ...a, enabled: !a.enabled } : a)
                        setAgents(updated)
                        saveAgent(agent.agent_type, !agent.enabled, agent.system_prompt)
                      }}
                    >
                      <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-ink transition-all ${agent.enabled ? 'left-4' : 'left-0.5'}`} />
                    </div>
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                    Prompt personalizado (opcional)
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Deixe em branco para usar o padrão da Plimpost…"
                    value={agent.system_prompt || ''}
                    onChange={e => setAgents(prev => prev.map(a => a.agent_type === agent.agent_type ? { ...a, system_prompt: e.target.value } : a))}
                    onBlur={() => saveAgent(agent.agent_type, agent.enabled, agent.system_prompt)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Developer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code2 size={18} /> Desenvolvedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-5 items-start">
            <div className="w-14 h-14 rounded-full bg-green border-2 border-ink shadow-hard flex items-center justify-center font-display font-bold text-xl text-white flex-none">
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
                  <span key={tag} className="font-mono text-[10px] font-bold px-2 py-1 border-2 border-ink rounded bg-cream-2 shadow-[2px_2px_0_#16241C]">{tag}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <a
                  href="mailto:giuseppe.bertholdi@gmail.com"
                  className="flex items-center gap-1.5 px-3 py-2 bg-ink text-white text-xs font-body font-bold rounded-md border-2 border-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <Mail size={13} /> Email
                </a>
                <a
                  href="https://linkedin.com/in/giuseppe-bertholdi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-tint text-green-deep text-xs font-body font-bold rounded-md border-2 border-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
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
