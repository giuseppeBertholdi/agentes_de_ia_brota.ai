import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export default function Register() {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return }
    if (!acceptedTerms) { setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await signUp(form.email, form.password, {
      full_name: form.name,
      company_name: form.company,
    })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      navigate('/onboarding')
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error: err } = await signInWithGoogle()
    if (err) {
      setError('Erro ao entrar com Google. Tente novamente.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" style={{ backgroundImage: 'url(/doodles.svg)', backgroundSize: '320px' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-3xl text-ink mb-2 hover:opacity-80 transition-opacity">
            <Zap size={28} className="text-green" fill="currentColor" />
            Plimpost<span className="text-green">.</span>
          </Link>
          <p className="text-ink-soft font-body text-sm">Comece grátis agora</p>
        </div>

        <div className="bg-white border border-ink/10 rounded-lg shadow-soft-md p-8">
          <h1 className="font-display font-bold text-xl text-ink mb-6">Criar conta</h1>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-ink/10 rounded-md py-2.5 font-body text-sm font-semibold text-ink bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecionando…' : 'Continuar com Google'}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'name', label: 'Seu nome', type: 'text', placeholder: 'João Silva' },
              { key: 'company', label: 'Nome da empresa', type: 'text', placeholder: 'Minha Empresa' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'seu@email.com' },
              { key: 'password', label: 'Senha', type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</label>
                <Input type={type} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={set(key as keyof typeof form)} required />
              </div>
            ))}

            <label className="flex items-start gap-2.5 text-xs text-ink-soft font-body leading-snug cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-green flex-none"
              />
              <span>
                Li e concordo com os{' '}
                <Link to="/termos" target="_blank" className="text-green font-bold hover:underline">Termos de Uso</Link>
                {' '}e a{' '}
                <Link to="/privacidade" target="_blank" className="text-green font-bold hover:underline">Política de Privacidade</Link>.
              </span>
            </label>

            {error && (
              <p className="text-red-600 text-sm font-body bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading || !acceptedTerms} className="mt-2 w-full">
              {loading ? 'Criando conta…' : 'Criar conta grátis'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft font-body">
            Já tem conta?{' '}
            <Link to="/login" className="text-green font-bold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
