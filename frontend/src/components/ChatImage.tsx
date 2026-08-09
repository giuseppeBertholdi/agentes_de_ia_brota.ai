import { useEffect, useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

export default function ChatImage({ messageId }: { messageId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    api.getObjectUrl(`/conversations/messages/${messageId}/media`)
      .then(u => { if (!cancelled) { objectUrl = u; setUrl(u) } })
      .catch(() => { if (!cancelled) setError(true) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [messageId])

  if (error) {
    return (
      <div className="w-48 h-36 rounded-md bg-cream-2 flex flex-col items-center justify-center gap-1.5 text-ink-faint">
        <ImageOff size={18} />
        <span className="text-[11px]">Foto indisponível</span>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="w-48 h-36 rounded-md bg-cream-2 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-ink-faint" />
      </div>
    )
  }

  return (
    <>
      <img
        src={url}
        onClick={() => setOpen(true)}
        className="max-w-full sm:max-w-[280px] max-h-72 rounded-md cursor-pointer object-cover"
        alt="Foto"
      />
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img src={url} className="max-w-full max-h-full rounded-md" alt="Foto ampliada" />
        </div>
      )}
    </>
  )
}
