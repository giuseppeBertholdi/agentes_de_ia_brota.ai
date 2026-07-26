import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useRealtimeTable } from '@/hooks/useRealtime'

export interface WaInstance {
  phone_number_id: string
  waba_id: string
  status: string
  display_phone_number?: string
  verified_name?: string
}

type SignupData = { waba_id: string; phone_number_id: string }

declare global { interface Window { FB?: any; fbAsyncInit?: () => void } }

const META_APP_ID = import.meta.env.VITE_META_APP_ID
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

/**
 * Encapsula a conexão com o WhatsApp (Embedded Signup da Meta) e o retorno do
 * Stripe Checkout (?checkout=success) — usado tanto em Configurações quanto na
 * etapa de ativação do onboarding, pra manter o mesmo comportamento nos dois lugares.
 */
export function useWhatsappConnection() {
  const [wa, setWa] = useState<WaInstance | null>(null)
  const [loading, setLoading] = useState(true)
  const [waLoading, setWaLoading] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const signupDataRef = useRef<SignupData | null>(null)

  const load = useCallback(async () => {
    try {
      const w = await api.get<WaInstance | Record<string, never>>('/settings/whatsapp')
      setWa(Object.keys(w).length ? (w as WaInstance) : null)
    } catch {
      setWa(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useRealtimeTable('whatsapp_instances', load)

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

  const connectWa = useCallback(async () => {
    setWaLoading(true); setWaError(null); signupDataRef.current = null
    try {
      await loadFacebookSdk()
      const response: any = await new Promise(resolve =>
        window.FB!.login(resolve, {
          config_id: META_CONFIG_ID, response_type: 'code',
          override_default_response_type: true, extras: { setup: {} },
        })
      )
      const code: string | undefined = response?.authResponse?.code
      if (!code || !signupDataRef.current) throw new Error('Conexão cancelada ou incompleta')
      const sd = signupDataRef.current as SignupData
      await api.post('/settings/whatsapp/embedded-signup', {
        code, waba_id: sd.waba_id, phone_number_id: sd.phone_number_id,
      })
      await load()
    } catch (e) {
      setWaError(e instanceof Error ? e.message : 'Erro ao conectar')
    } finally {
      setWaLoading(false)
    }
  }, [load])

  const disconnectWa = useCallback(async () => {
    setWaLoading(true)
    try { await api.post('/settings/whatsapp/disconnect'); await load() }
    finally { setWaLoading(false) }
  }, [load])

  // Volta do Stripe Checkout: confirma a assinatura por polling e já emenda
  // pro login da Meta, pra pessoa não precisar clicar duas vezes.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('checkout') !== 'success') return
    window.history.replaceState({}, '', window.location.pathname)

    let cancelled = false
    setConfirmingPayment(true)

    const poll = async () => {
      for (let i = 0; i < 8 && !cancelled; i++) {
        const r = await api.get<{ status: string }>('/billing/status').catch(() => null)
        if (r?.status === 'active') return true
        await new Promise(res => setTimeout(res, 1200))
      }
      return false
    }

    poll().then(confirmed => {
      if (cancelled) return
      setConfirmingPayment(false)
      if (confirmed) connectWa() // pode ser bloqueado pelo navegador — sempre há um botão manual de fallback na tela
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { wa, loading, waLoading, waError, confirmingPayment, connectWa, disconnectWa }
}
