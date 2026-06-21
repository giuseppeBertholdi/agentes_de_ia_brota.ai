import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatPlayer, SCENARIOS } from '@/lib/chatEngine'
import { initAgentPreviews } from '@/lib/agentPreviews'

/* ---- ícones SVG inline ---- */
const IC = {
  arrow: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  check: (size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  smallCheck: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  waBack: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  waBadge: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9.6 4.2 6.4 4l-.6 3.2L3 9l1.6 2.9L3 14.9 5.8 16.7l.6 3.2 3.2-.2L12 22l2.4-2.3 3.2.2.6-3.2L21 14.9l-1.6-2.9L21 9l-2.8-1.8L17.6 4l-3.2.2L12 2Z"/><path d="m8.5 12 2.4 2.4 4.6-4.8" stroke="#155F3B" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  waVideo: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m23 7-7 5 7 5V7Z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  waPhone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z"/></svg>,
  waEmoji: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa89d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/></svg>,
  waSend: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l11 2-11 2Z"/></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  whatsapp: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 5-1.3A10 10 0 1 0 12 2Zm5.7 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.3-4.8-4.2-4.9-4.4-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.5-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>,
  route: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  tag: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.6 11.6A2 2 0 0 1 3 10.2V4a1.4 1.4 0 0 1 1.4-1.4h6.2a2 2 0 0 1 1 .4Z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor"/></svg>,
  calendar: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><path d="m8.5 14.5 2.2 2.2 4-4.4"/></svg>,
  moon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/><path d="M18 4.5v3M16.5 6h3" opacity=".7"/></svg>,
}

const ICONS: Record<string, JSX.Element> = { route: IC.route, tag: IC.tag, calendar: IC.calendar, moon: IC.moon }

/* ---- WhatsApp Phone component ---- */
function WaPhone({ bodyId, statusId }: { bodyId: string; statusId: string }) {
  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="screen" data-wall="classic">
        <div className="wa-head">
          <span className="wa-back">{IC.waBack}</span>
          <div className="wa-av">FT</div>
          <div className="wa-meta">
            <div className="wa-name">FrioTech Climatização {IC.waBadge}</div>
            <div className="wa-status" id={statusId}>online</div>
          </div>
          <div className="wa-headicons">{IC.waVideo}{IC.waPhone}</div>
        </div>
        <div className="wa-body" id={bodyId} />
        <div className="wa-input">
          <div className="field">{IC.waEmoji} Mensagem</div>
          <div className="send">{IC.waSend}</div>
        </div>
      </div>
    </div>
  )
}

/* ---- Bullet item ---- */
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="bullet">{IC.smallCheck}</span>
      <span>{children}</span>
    </li>
  )
}

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<string>('roteamento')
  const heroPlayerRef = useRef<ChatPlayer | null>(null)
  const demoPlayerRef = useRef<ChatPlayer | null>(null)

  /* ---- scroll reveal ---- */
  useEffect(() => {
    const tick = () => {
      document.querySelectorAll('.landing-root .reveal:not(.in)').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight * 0.9 && r.bottom > 0) el.classList.add('in')
      })
    }
    tick()
    window.addEventListener('scroll', tick, { passive: true })
    window.addEventListener('resize', tick)
    const t1 = setTimeout(tick, 300)
    const t2 = setTimeout(tick, 1200)
    return () => {
      window.removeEventListener('scroll', tick)
      window.removeEventListener('resize', tick)
      clearTimeout(t1); clearTimeout(t2)
    }
  }, [])

  /* ---- nav scrolled ---- */
  useEffect(() => {
    const nav = document.getElementById('l-nav')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ---- hero chat player ---- */
  useEffect(() => {
    const body = document.getElementById('heroBody')
    const status = document.getElementById('heroStatus')
    if (!body || !status) return
    const p = new ChatPlayer(body, status, { scenario: 'cotacao', speed: 1 })
    heroPlayerRef.current = p
    p.play()
    return () => p.stop()
  }, [])

  /* ---- demo chat player ---- */
  useEffect(() => {
    const body = document.getElementById('demoBody')
    const status = document.getElementById('demoStatus')
    if (!body || !status) return
    const p = new ChatPlayer(body, status, { scenario: activeTab, speed: 1 })
    demoPlayerRef.current = p
    let started = false
    const check = () => {
      if (started) return
      const r = body.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.85 && r.bottom > 0) { started = true; p.play() }
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => { window.removeEventListener('scroll', check); p.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- demo tab switch ---- */
  const switchTab = (key: string) => {
    setActiveTab(key)
    demoPlayerRef.current?.play(key)
  }

  /* ---- agent previews ---- */
  useEffect(() => {
    const container = rootRef.current
    if (!container) return
    const cleanup = initAgentPreviews(container)
    return cleanup
  }, [])

  const tabs = ['roteamento', 'cotacao', 'agendamento', 'suporte'] as const

  return (
    <div className="landing-root" ref={rootRef}>

      {/* ---- NAV ---- */}
      <nav className="l-nav" id="l-nav">
        <div className="wrap l-nav-inner">
          <a className="l-brand" href="#top">Brota<span className="dotmark">.</span></a>
          <div className="l-nav-links">
            <a href="#capacidades">Capacidades</a>
            <a href="#demo">Veja em ação</a>
            <a href="#como">Como funciona</a>
          </div>
          <div className="l-nav-cta">
            <Link to="/login" className="btn btn-ghost" style={{ padding: '11px 20px' }}>Entrar</Link>
            <a href="#cta" className="btn btn-primary" style={{ padding: '12px 22px' }}>Começar de graça</a>
          </div>
        </div>
      </nav>

      <a id="top" />

      {/* ---- HERO ---- */}
      <header className="l-hero">
        <div className="wrap hero-grid">
          <div className="hero-copy reveal">
            <span className="eyebrow"><span className="dot" /> Agentes de IA · seu negócio no automático</span>
            <h1>Uma equipe de IA cuidando do seu <span className="hl">negócio inteiro</span>.</h1>
            <p className="hero-sub">A Brota atende no WhatsApp, fecha vendas, cobra quem deve, emite nota, monta relatório e cuida do pós-venda — agentes que trabalham juntos, 24h, sem time de TI.</p>
            <div className="hero-cta">
              <a href="#cta" className="btn btn-primary btn-lg">Começar de graça {IC.arrow}</a>
              <a href="#demo" className="btn btn-ghost btn-lg">Ver funcionando</a>
            </div>
            <div className="hero-trust">
              <span>{IC.check()} Pronto em minutos</span>
              <span>{IC.check()} Conecta com o que você já usa</span>
              <span>{IC.check()} Cancele quando quiser</span>
            </div>
          </div>

          <div className="hero-phone reveal">
            <div className="phone-stage">
              <div className="phone-badge pb-1 ia-flag">
                <span className="ic">{IC.clock}</span>
                <span>Responde na hora<small>de dia e de madrugada</small></span>
              </div>
              <div className="phone-badge pb-2">
                <span className="ic">{IC.whatsapp}</span>
                <span>No seu número<small>de WhatsApp de sempre</small></span>
              </div>
              <WaPhone bodyId="heroBody" statusId="heroStatus" />
            </div>
          </div>
        </div>
      </header>

      {/* ---- CAPACIDADES ---- */}
      <section className="section-pad" id="capacidades">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="sec-tag">Tudo num lugar só</span>
            <h2>Começa no WhatsApp. <span style={{ color: 'var(--green)' }}>Não para por aí.</span></h2>
            <p>O atendimento é a porta de entrada. Por trás dela, a Brota cuida de vendas, finanças, equipe e pós-venda — no automático, conversando com as ferramentas que você já usa.</p>
          </div>

          <div className="pillars">
            {/* 1 - Atendimento (destaque) */}
            <div className="pillar feat reveal">
              <div className="pillar-top">
                <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 4v-4H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M7 9h9M7 12h6"/></svg></div>
                <h3>Atendimento no WhatsApp</h3>
                <span className="tagline">Principal</span>
              </div>
              <p className="lead">A porta de entrada do seu negócio, aberta 24 horas por dia.</p>
              <ul>
                <Bullet><b>Roteamento inteligente</b> <span className="mut">— manda cada cliente pra pessoa certa</span></Bullet>
                <Bullet><b>Cotações automáticas</b> <span className="mut">na hora, sem deixar o cliente esfriar</span></Bullet>
                <Bullet><b>Agendamentos</b> <span className="mut">sem trocar mil mensagens</span></Bullet>
                <Bullet><b>Suporte 24h</b> <span className="mut">— todo dia, até de madrugada</span></Bullet>
              </ul>
            </div>

            {/* 2 - Vendas */}
            <div className="pillar reveal">
              <div className="pillar-top">
                <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/></svg></div>
                <h3>Vendas &amp; Relacionamento</h3>
              </div>
              <p className="lead">Tira o lead da conversa e leva até a venda — e além.</p>
              <ul>
                <Bullet><b>E-mail marketing automatizado</b> <span className="mut">— sequências pós-cotação, follow-up e reativação de clientes sumidos</span></Bullet>
                <Bullet><b>CRM leve</b> <span className="mut">— registra cada lead, atualiza o status e avisa o vendedor na hora certa</span></Bullet>
                <Bullet><b>Proposta comercial por IA</b> <span className="mut">— gerada e enviada em PDF direto pro cliente</span></Bullet>
              </ul>
            </div>

            {/* 3 - Operação */}
            <div className="pillar reveal">
              <div className="pillar-top">
                <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg></div>
                <h3>Operação Interna</h3>
              </div>
              <p className="lead">Você enxerga tudo sem precisar perguntar pra ninguém.</p>
              <ul>
                <Bullet><b>Relatórios semanais automáticos</b> <span className="mut">— suas vendas, seus gargalos e sua equipe em 1 parágrafo</span></Bullet>
                <Bullet><b>Integração com Google Calendar</b> <span className="mut">— agendamento sem troca de mensagem</span></Bullet>
                <Bullet><b>Alertas internos</b> <span className="mut">quando algo foge do padrão — estoque baixo, prazo vencendo, cliente parado há 3 dias</span></Bullet>
              </ul>
            </div>

            {/* 4 - Financeiro */}
            <div className="pillar reveal">
              <div className="pillar-top">
                <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h5"/></svg></div>
                <h3>Financeiro</h3>
              </div>
              <p className="lead">O dinheiro entra mais rápido e ninguém esquece de cobrar.</p>
              <ul>
                <Bullet><b>Boletos e NF-e</b> <span className="mut">— emissão e envio automáticos</span></Bullet>
                <Bullet><b>Lembretes de cobrança escalonados</b> <span className="mut">— do amigável ao formal ao urgente</span></Bullet>
                <Bullet><b>Conciliação simples</b> <span className="mut">— recebeu, atualiza a planilha e avisa o responsável</span></Bullet>
              </ul>
            </div>

            {/* 5 - RH */}
            <div className="pillar reveal">
              <div className="pillar-top">
                <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.6-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.8M21 20c0-2.6-1.4-4.6-3.6-5.3"/></svg></div>
                <h3>RH &amp; Equipe</h3>
              </div>
              <p className="lead">Menos papelada, mais gente no lugar certo.</p>
              <ul>
                <Bullet><b>Triagem de currículos</b> <span className="mut">por formulário inteligente</span></Bullet>
                <Bullet><b>Onboarding automatizado</b> <span className="mut">— envia documentos e agenda treinamentos</span></Bullet>
                <Bullet><b>Ponto e escala</b> <span className="mut">direto pelo WhatsApp</span></Bullet>
              </ul>
            </div>

            {/* 6 - Pós-venda */}
            <div className="pillar reveal">
              <div className="pillar-top">
                <div className="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11a6 6 0 0 1 6-6h9"/><path d="M15 2l3 3-3 3"/><path d="M21 13a6 6 0 0 1-6 6H6"/><path d="M9 22l-3-3 3-3"/></svg></div>
                <h3>Pós-venda</h3>
              </div>
              <p className="lead">Quem já comprou é o mais fácil de vender de novo.</p>
              <ul>
                <Bullet><b>Pesquisa de satisfação automática</b> <span className="mut">alguns dias após a compra</span></Bullet>
                <Bullet><b>Fluxo de recompra</b> <span className="mut">pra produtos com ciclo previsível</span></Bullet>
                <Bullet><b>Detecção de churn</b> <span className="mut">— cliente que sumiu, reclamou ou atrasou pagamento</span></Bullet>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DEMO ---- */}
      <section className="l-demo section-pad" id="demo">
        <div className="wrap demo-grid">
          <div className="demo-copy reveal">
            <span className="sec-tag">Veja em ação</span>
            <h2 style={{ fontSize: 'clamp(28px,3.4vw,42px)' }}>Conversa de verdade, não robô travado</h2>
            <p style={{ marginTop: 16, fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.55 }}>Cada negócio fala de um jeito. A Brota aprende o seu — preços, produtos, tom — e responde como gente. Toca num caso pra ver acontecendo:</p>
            <div className="demo-tabs">
              {tabs.map((k) => {
                const s = SCENARIOS[k]
                return (
                  <button key={k} className={`tab${activeTab === k ? ' active' : ''}`} onClick={() => switchTab(k)}>
                    <span className="ic">{ICONS[s.icon]}</span>
                    <span className="tx"><b>{s.label}</b><span>{s.desc}</span></span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="demo-phone reveal">
            <div className="phone-stage">
              <WaPhone bodyId="demoBody" statusId="demoStatus" />
            </div>
          </div>
        </div>
      </section>

      {/* ---- OUTROS AGENTES ---- */}
      <section className="section-pad" id="agentes">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="sec-tag">Os outros agentes</span>
            <h2>Não é só no WhatsApp que <span style={{ color: 'var(--green)' }}>eles trabalham</span>.</h2>
            <p>Cada agente tem a sua telinha — e todos rodam no automático, conversando entre si e com as ferramentas que você já usa. Dá uma olhada neles em ação:</p>
          </div>
          <div className="agents-grid">
            {[
              { key: 'crm', label: 'CRM · Vendas' },
              { key: 'doc', label: 'Proposta · IA' },
              { key: 'report', label: 'Relatório · Operação' },
              { key: 'dun', label: 'Cobrança · Financeiro' },
            ].map(({ key, label }) => (
              <div key={key} className="agent-card reveal">
                <div className="agent-bar">
                  <span className="dot" />
                  <span className="lbl">{label}</span>
                  <span className="live"><i /> Ao vivo</span>
                </div>
                <div className="agent-screen" data-agent={key} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- COMO FUNCIONA ---- */}
      <section className="section-pad" id="como">
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="sec-tag">Como funciona</span>
            <h2>Do zero ao atendendo em um dia</h2>
            <p style={{ marginLeft: 'auto', marginRight: 'auto' }}>Sem instalar nada, sem manual de mil páginas. A gente faz o trabalho chato — você só aprova.</p>
          </div>
          <div className="steps">
            {[
              { n: '1', title: 'Conta pra gente sobre seu negócio', body: 'Numa conversa rápida, a Brota aprende seus produtos, seus preços e o seu jeito de falar com o cliente.' },
              { n: '2', title: 'A gente conecta no seu WhatsApp', body: 'No seu número de sempre, em minutos. Seus clientes nem percebem que tem IA do outro lado.' },
              { n: '3', title: 'Seu agente começa a atender', body: 'Ele responde, orça e agenda dia e noite. Você acompanha tudo e entra na conversa quando quiser.' },
            ].map((s) => (
              <div key={s.n} className="step reveal">
                <div className="num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA FINAL ---- */}
      <section className="cta-final" id="cta">
        <div className="wrap">
          <div className="cta-card reveal">
            <span className="deco d1" />
            <span className="deco d2" />
            <h2>Pronto pra deixar seu WhatsApp<br />trabalhar por você?</h2>
            <p>Comece de graça hoje. Se não fizer sentido pro seu negócio, é só sair — sem multa, sem letra miúda.</p>
            <div className="hero-cta">
              <Link to="/register" className="btn btn-primary btn-lg">Criar meu agente {IC.arrow}</Link>
              <a href="#demo" className="btn btn-ghost btn-lg">Falar com a gente</a>
            </div>
            <p className="cta-mini">Leva uns 10 minutos pra colocar de pé.</p>
          </div>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="l-footer">
        <div className="wrap footer-inner">
          <a className="l-brand" href="#top">Brota<span className="dotmark">.</span></a>
          <div className="footer-links">
            <a href="#capacidades">Capacidades</a>
            <a href="#demo">Veja em ação</a>
            <a href="#como">Como funciona</a>
            <a href="#cta">Começar</a>
          </div>
          <div className="copy">© 2025 Brota · Feito no Brasil 💚</div>
        </div>
      </footer>

    </div>
  )
}
