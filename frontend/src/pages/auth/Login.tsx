import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) {
      setError('Email ou senha incorretos.')
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
          <p className="text-ink-soft font-body text-sm">Painel de controle</p>
        </div>

        <div className="bg-white border-2 border-ink rounded-lg shadow-hard-md p-8">
          <h1 className="font-display font-bold text-xl text-ink mb-6">Entrar na conta</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Email</label>
              <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-soft">Senha</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <p className="text-red-600 text-sm font-body bg-red-50 border-2 border-red-200 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading} className="mt-2 w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft font-body">
            Não tem conta?{' '}
            <Link to="/register" className="text-green font-bold hover:underline">Criar agora</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
