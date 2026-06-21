import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return }
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
      navigate('/app/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" style={{ backgroundImage: 'url(/doodles.svg)', backgroundSize: '320px' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-display font-bold text-3xl text-ink mb-2">
            <Zap size={28} className="text-green" fill="currentColor" />
            Brota<span className="text-green">.</span>
          </div>
          <p className="text-ink-soft font-body text-sm">Comece grátis agora</p>
        </div>

        <div className="bg-white border-2 border-ink rounded-lg shadow-hard-md p-8">
          <h1 className="font-display font-bold text-xl text-ink mb-6">Criar conta</h1>

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

            {error && (
              <p className="text-red-600 text-sm font-body bg-red-50 border-2 border-red-200 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading} className="mt-2 w-full">
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
