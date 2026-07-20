import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Check, X as XIcon, Users, Building2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useRealtimeTable } from '@/hooks/useRealtime'

interface Department { id: string; name: string; description?: string }
interface Member { id: string; full_name: string; role: string; department_id: string | null }

const ROLE_LABEL: Record<string, string> = { owner: 'Dono', admin: 'Admin', agent: 'Atendente' }

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-cream-2 rounded-md', className)} />
}

export default function Team() {
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [newDept, setNewDept] = useState<Department>({ id: '', name: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  const load = () => {
    Promise.allSettled([
      api.get<Department[]>('/team/departments'),
      api.get<Member[]>('/team/members'),
    ]).then(([d, m]) => {
      if (d.status === 'fulfilled') setDepartments(d.value)
      if (m.status === 'fulfilled') setMembers(m.value)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])
  useRealtimeTable('departments', load)
  useRealtimeTable('profiles', load)

  const addDepartment = async () => {
    if (!newDept.name.trim()) return
    await api.post('/team/departments', { name: newDept.name, description: newDept.description || undefined })
    setNewDept({ id: '', name: '', description: '' })
    load()
  }

  const startEdit = (d: Department) => { setEditingId(d.id); setEditingDept({ ...d }) }
  const cancelEdit = () => { setEditingId(null); setEditingDept(null) }

  const saveEdit = async () => {
    if (!editingDept) return
    await api.put(`/team/departments/${editingDept.id}`, {
      name: editingDept.name,
      description: editingDept.description || undefined,
    })
    cancelEdit()
    load()
  }

  const deleteDepartment = async (id: string) => {
    await api.delete(`/team/departments/${id}`)
    load()
  }

  const assignDepartment = async (memberId: string, departmentId: string) => {
    await api.put(`/team/members/${memberId}`, { department_id: departmentId || null })
    load()
  }

  return (
    <div className="max-w-3xl mx-auto py-4 px-4 sm:py-8 sm:px-6">
      <h1 className="font-display font-bold text-2xl text-ink mb-1">Equipe</h1>
      <p className="text-ink-soft text-sm font-body mb-6">
        Crie setores para que a recepcionista de IA transfira conversas automaticamente
        (ex: cliente pede para falar com o RH) e organize quem atende cada área.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={18} /> Setores
            {departments.length > 0 && (
              <span className="ml-auto font-mono text-[11px] font-bold text-ink-soft border border-ink/15 rounded px-1.5 py-0.5 bg-cream-2">
                {departments.length} {departments.length === 1 ? 'setor' : 'setores'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2 mb-5">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-5">
              {departments.map(d => (
                <div key={d.id} className="border border-ink/10 rounded-md shadow-soft bg-white overflow-hidden">
                  {editingId === d.id && editingDept ? (
                    <div className="p-3 flex flex-col gap-2 bg-cream-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input placeholder="Nome" value={editingDept.name}
                          onChange={e => setEditingDept(v => v ? { ...v, name: e.target.value } : v)} />
                        <Input placeholder="Descrição (opcional)" value={editingDept.description || ''}
                          onChange={e => setEditingDept(v => v ? { ...v, description: e.target.value } : v)} />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={saveEdit}><Check size={13} /> Salvar</Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}><XIcon size={13} /> Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-md bg-green-tint border border-ink/10 flex items-center justify-center flex-none">
                        <Building2 size={13} className="text-green-deep" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-bold text-sm text-ink leading-tight">{d.name}</div>
                        {d.description && (
                          <div className="text-ink-faint text-xs font-body truncate">{d.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-none">
                        <button onClick={() => startEdit(d)}
                          className="w-7 h-7 rounded flex items-center justify-center text-ink-faint hover:text-ink hover:bg-cream-2 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteDepartment(d.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {departments.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 border border-dashed border-ink/20 rounded-md">
                  <Building2 size={28} className="text-ink/20" />
                  <p className="text-ink-faint text-sm font-body text-center">
                    Nenhum setor cadastrado.<br />
                    <span className="text-ink-soft">Adicione pelo formulário ou peça ao assistente de IA.</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="border-t-2 border-ink/10 pt-4 flex flex-col gap-3">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Novo setor</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Nome (ex: RH, Financeiro)" value={newDept.name}
                onChange={e => setNewDept(v => ({ ...v, name: e.target.value }))} />
              <Input placeholder="Descrição (opcional)" value={newDept.description || ''}
                onChange={e => setNewDept(v => ({ ...v, description: e.target.value }))} />
            </div>
            <Button variant="primary" size="sm" onClick={addDepartment} disabled={!newDept.name.trim()}>
              <Plus size={15} /> Adicionar setor
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users size={18} /> Membros da equipe</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map(m => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 border border-ink/10 rounded-md shadow-soft bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-bold text-sm text-ink leading-tight">{m.full_name || '—'}</div>
                    <div className="text-ink-faint text-xs font-mono">{ROLE_LABEL[m.role] || m.role}</div>
                  </div>
                  <select
                    className="border border-ink/10 rounded-md px-3 py-1.5 text-sm font-body text-ink bg-white shadow-soft focus:outline-none"
                    value={m.department_id || ''}
                    onChange={e => assignDepartment(m.id, e.target.value)}
                  >
                    <option value="">Sem setor</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              ))}

              {members.length === 0 && (
                <p className="text-ink-faint text-sm font-body text-center py-6">Nenhum membro encontrado.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
