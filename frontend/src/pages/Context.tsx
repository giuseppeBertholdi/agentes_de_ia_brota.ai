import { useEffect, useRef, useState } from 'react'
import { Library, Upload, FileText, FileSpreadsheet, File as FileIcon, Trash2, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { api, ApiError } from '@/lib/api'
import { cn, fmtDate } from '@/lib/utils'
import { useRealtimeTable } from '@/hooks/useRealtime'

interface ContextDocument {
  id: string
  filename: string
  file_type: string
  size_bytes: number
  created_at: string
}

const ACCEPTED = '.pdf,.docx,.xlsx,.csv,.txt,.md'

const TYPE_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ContextLibrary() {
  const [docs, setDocs] = useState<ContextDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ContextDocument | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    api.get<ContextDocument[]>('/context/documents').then(setDocs).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useRealtimeTable('context_documents', load)

  const uploadFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      await api.upload('/context/documents', file)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao enviar o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await api.delete(`/context/documents/${pendingDelete.id}`)
    setPendingDelete(null)
    load()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center flex-none">
          <Library size={17} className="text-lime" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-ink tracking-tight">Central de Contexto</h1>
          <p className="text-ink-soft text-sm font-body mt-1 max-w-2xl">
            Envie tabela de preços, política de troca, FAQ, catálogo — qualquer material que
            descreva o seu negócio. Tudo aqui vira conhecimento direto pros agentes de IA,
            junto com o que já está configurado em Configurações.
          </p>
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-6',
          dragOver ? 'border-green bg-green-tint' : 'border-ink/15 bg-white hover:border-ink/30'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
        />
        <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-green-tint flex items-center justify-center">
          {uploading ? <Loader2 size={18} className="text-green-deep animate-spin" /> : <Upload size={18} className="text-green-deep" />}
        </div>
        <p className="font-body font-bold text-sm text-ink">
          {uploading ? 'Enviando…' : 'Arraste um arquivo aqui, ou clique pra escolher'}
        </p>
        <p className="text-ink-faint text-xs font-body mt-1">PDF, Word, Excel, CSV ou texto — até 5MB</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-md text-red-700 text-sm font-body">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-ink/5 animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center text-center gap-2 py-12">
            <Sparkles size={22} className="text-ink/20" />
            <p className="text-ink-soft text-sm font-body font-semibold">Nenhum documento enviado ainda</p>
            <p className="text-ink-faint text-xs font-body max-w-sm">
              Assim que você enviar algo, a IA já passa a usar esse conteúdo nas próximas conversas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map(doc => {
            const Icon = TYPE_ICON[doc.file_type] || FileIcon
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-ink/10 rounded-lg shadow-xs"
              >
                <div className="w-9 h-9 rounded-md bg-cream-2 flex items-center justify-center flex-none">
                  <Icon size={15} className="text-ink-soft" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body font-bold text-sm text-ink truncate">{doc.filename}</div>
                  <div className="text-ink-faint text-xs font-mono mt-0.5">
                    {fmtDate(doc.created_at)} · {fmtSize(doc.size_bytes)}
                  </div>
                </div>
                <Badge variant="default" className="flex-none uppercase">{doc.file_type}</Badge>
                <Button variant="ghost" size="sm" className="flex-none" onClick={() => setPendingDelete(doc)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remover documento?"
        message={`"${pendingDelete?.filename}" deixa de fazer parte do conhecimento da IA imediatamente.`}
        confirmLabel="Remover"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
