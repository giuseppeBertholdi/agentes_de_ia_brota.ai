import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'primary', onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white border border-ink/10 rounded-xl shadow-soft-lg p-6 msg-in"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-display font-bold text-lg text-ink tracking-tight">{title}</h2>
        <p className="text-ink-soft text-sm font-body mt-2 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
