import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function LegalLayout({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <div className="border-b border-ink/10 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-lg text-ink hover:opacity-80 transition-opacity">
            <Zap size={18} className="text-green" fill="currentColor" />
            Plimpost<span className="text-green">.</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-body">
            <Link to="/termos" className="text-ink-soft hover:text-ink">Termos de Uso</Link>
            <Link to="/privacidade" className="text-ink-soft hover:text-ink">Privacidade</Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight mb-2">{title}</h1>
        <p className="text-ink-faint text-sm font-mono mb-10">Última atualização: {updatedAt}</p>
        <div className="legal-content flex flex-col gap-6 text-ink-soft text-[15px] leading-relaxed font-body">
          {children}
        </div>
      </div>
    </div>
  )
}
