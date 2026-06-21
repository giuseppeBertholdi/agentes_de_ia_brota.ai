const CK =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

class Player {
  protected root: HTMLElement
  protected timers: ReturnType<typeof setTimeout>[]
  protected _token: symbol | null

  constructor(root: HTMLElement) {
    this.root = root
    this.timers = []
    this._token = null
  }

  wait(ms: number): Promise<void> {
    return new Promise((r) => this.timers.push(setTimeout(r, ms)))
  }

  clear() { this.timers.forEach(clearTimeout); this.timers = [] }

  play() {
    this.clear()
    const token = (this._token = Symbol())
    this.run(token).catch(() => {})
  }

  alive(token: symbol) { return token === this._token }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(_token: symbol): Promise<void> {}
}

class CrmPlayer extends Player {
  build() {
    this.root.innerHTML = `
      <div class="crm">
        <div class="crm-lead">
          <span class="crm-av">M</span>
          <div class="crm-who"><b>Marina Souza</b><small>Split 12.000 BTUs · FrioTech</small></div>
          <span class="crm-pill" data-pill>Novo lead</span>
        </div>
        <div class="crm-track"><span class="crm-bar" data-bar></span></div>
        <div class="crm-stages">
          <span data-st="0">Novo</span><span data-st="1">Contato</span><span data-st="2">Proposta</span><span data-st="3">Ganhou</span>
        </div>
        <div class="crm-log" data-log></div>
      </div>`
  }

  async run(token: symbol) {
    this.build()
    const pill = this.root.querySelector('[data-pill]') as HTMLElement
    const bar = this.root.querySelector('[data-bar]') as HTMLElement
    const log = this.root.querySelector('[data-log]') as HTMLElement
    const stEls = this.root.querySelectorAll('[data-st]')
    const stages = [
      { label: 'Novo lead', pct: 16, cls: 's0', log: 'Lead registrado automaticamente' },
      { label: 'Em contato', pct: 44, cls: 's1', log: 'Follow-up enviado por e-mail' },
      { label: 'Proposta enviada', pct: 72, cls: 's2', log: 'Proposta em PDF enviada' },
      { label: 'Ganhou 🎉', pct: 100, cls: 's3', log: '🔔 Vendedor avisado: hora de fechar!' },
    ]
    await this.wait(450)
    for (let i = 0; i < stages.length; i++) {
      if (!this.alive(token)) return
      const s = stages[i]
      pill.textContent = s.label
      pill.className = 'crm-pill ' + s.cls
      bar.style.width = s.pct + '%'
      stEls.forEach((e, j) => e.classList.toggle('on', j <= i))
      const line = document.createElement('div')
      line.className = 'crm-line'
      line.innerHTML = `<span class="crm-dot">${CK}</span>${esc(s.log)}`
      log.appendChild(line)
      await this.wait(1500)
    }
    await this.wait(2600)
    if (this.alive(token)) this.play()
  }
}

class DocPlayer extends Player {
  build() {
    this.root.innerHTML = `
      <div class="doc">
        <div class="doc-head"><b>Proposta comercial</b><span class="doc-tag">PDF</span></div>
        <div class="doc-sub">Cliente: Marina Souza · FrioTech Climatização</div>
        <div class="doc-rows" data-rows></div>
        <div class="doc-stamp" data-stamp><span>${CK}</span> PDF gerado e enviado</div>
      </div>`
  }

  async run(token: symbol) {
    this.build()
    const rows = this.root.querySelector('[data-rows]') as HTMLElement
    const stamp = this.root.querySelector('[data-stamp]') as HTMLElement
    const items = [
      { t: 'Instalação split 12.000 BTUs', v: 'R$ 450' },
      { t: 'Material + tubulação', v: 'incluso' },
      { t: 'Limpeza e higienização', v: 'R$ 80' },
      { t: 'Garantia 90 dias', v: 'incluso' },
    ]
    await this.wait(400)
    for (const it of items) {
      if (!this.alive(token)) return
      const r = document.createElement('div')
      r.className = 'doc-row'
      r.innerHTML = `<span>${esc(it.t)}</span><b>${esc(it.v)}</b>`
      rows.appendChild(r)
      await this.wait(620)
    }
    if (!this.alive(token)) return
    const total = document.createElement('div')
    total.className = 'doc-row doc-total'
    total.innerHTML = `<span>Total</span><b>R$ 530</b>`
    rows.appendChild(total)
    await this.wait(700)
    if (!this.alive(token)) return
    stamp.classList.add('show')
    await this.wait(2800)
    if (this.alive(token)) this.play()
  }
}

class ReportPlayer extends Player {
  build() {
    this.root.innerHTML = `
      <div class="rep">
        <div class="rep-top"><span class="rep-kicker">Resumo da semana</span><span class="rep-when">seg, 08h00</span></div>
        <div class="rep-chips" data-chips></div>
        <div class="rep-text" data-text></div><span class="rep-caret" data-caret>▍</span>
      </div>`
  }

  async typeInto(el: HTMLElement, text: string, token: symbol, speed = 22): Promise<boolean> {
    for (let i = 0; i < text.length; i++) {
      if (!this.alive(token)) return false
      el.textContent += text[i]
      await this.wait(speed)
    }
    return true
  }

  async run(token: symbol) {
    this.build()
    const chips = this.root.querySelector('[data-chips]') as HTMLElement
    const text = this.root.querySelector('[data-text]') as HTMLElement
    const caret = this.root.querySelector('[data-caret]') as HTMLElement
    const chipData = [
      { t: 'Vendas R$ 18,4k', c: 'up', s: '▲ 12%' },
      { t: '7 cotações paradas', c: 'warn', s: '+2 dias' },
      { t: 'Top: Marina', c: 'ok', s: '4 vendas' },
    ]
    await this.wait(400)
    for (const c of chipData) {
      if (!this.alive(token)) return
      const el = document.createElement('span')
      el.className = 'rep-chip ' + c.c
      el.innerHTML = `${esc(c.t)} <i>${esc(c.s)}</i>`
      chips.appendChild(el)
      await this.wait(420)
    }
    await this.wait(300)
    text.textContent = ''
    caret.style.display = 'inline'
    const ok = await this.typeInto(
      text,
      'Boa semana: faturamento subiu 12%. Atenção: 7 cotações sem resposta há mais de 2 dias — já cobrei follow-up. Destaque pra Marina, que fechou 4 vendas.',
      token
    )
    if (!ok || !this.alive(token)) return
    caret.style.display = 'none'
    await this.wait(3200)
    if (this.alive(token)) this.play()
  }
}

class DunPlayer extends Player {
  build() {
    this.root.innerHTML = `
      <div class="dun">
        <div class="dun-head"><span class="dun-doc">Boleto #8842</span><span class="dun-amt">R$ 530,00</span></div>
        <div class="dun-msgs" data-msgs></div>
        <div class="dun-status" data-status><span>${CK}</span> Pago — planilha atualizada</div>
      </div>`
  }

  async run(token: symbol) {
    this.build()
    const msgs = this.root.querySelector('[data-msgs]') as HTMLElement
    const status = this.root.querySelector('[data-status]') as HTMLElement
    const steps = [
      { tone: 'Amigável', c: 't1', t: 'Oi! 😊 Passando só pra lembrar do boleto que vence amanhã.' },
      { tone: 'Formal', c: 't2', t: 'Seu boleto venceu ontem. Consegue regularizar hoje?' },
      { tone: 'Urgente', c: 't3', t: 'Pagamento em atraso. Evite juros — pague até as 18h.' },
    ]
    await this.wait(450)
    for (const s of steps) {
      if (!this.alive(token)) return
      const el = document.createElement('div')
      el.className = 'dun-msg'
      el.innerHTML = `<span class="dun-tone ${s.c}">${esc(s.tone)}</span><p>${esc(s.t)}</p>`
      msgs.appendChild(el)
      await this.wait(1450)
    }
    if (!this.alive(token)) return
    status.classList.add('show')
    await this.wait(2800)
    if (this.alive(token)) this.play()
  }
}

const BUILDERS: Record<string, new (root: HTMLElement) => Player> = {
  crm: CrmPlayer,
  doc: DocPlayer,
  report: ReportPlayer,
  dun: DunPlayer,
}

export function initAgentPreviews(container: HTMLElement) {
  const nodes = container.querySelectorAll<HTMLElement>('[data-agent]')
  const players: { el: HTMLElement; p: Player; started: boolean }[] = []

  nodes.forEach((n) => {
    const key = n.getAttribute('data-agent') ?? ''
    const Cls = BUILDERS[key]
    if (Cls) players.push({ el: n, p: new Cls(n), started: false })
  })

  function check() {
    players.forEach((it) => {
      if (it.started) return
      const r = it.el.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) {
        it.started = true
        it.p.play()
      }
    })
  }

  check()
  window.addEventListener('scroll', check, { passive: true })
  window.addEventListener('resize', check)
  const t1 = setTimeout(check, 400)
  const t2 = setTimeout(check, 1400)
  const t3 = setTimeout(() => {
    players.forEach((it) => { if (!it.started) { it.started = true; it.p.play() } })
  }, 2200)

  return () => {
    window.removeEventListener('scroll', check)
    window.removeEventListener('resize', check)
    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
    players.forEach((it) => it.p.clear())
  }
}
