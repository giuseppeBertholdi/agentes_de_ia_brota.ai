export interface ChatMessage {
  f: 'm' | 'b'
  t: string
  time: string
  typ?: number
}

export interface Scenario {
  label: string
  desc: string
  icon: string
  day: string
  msgs: ChatMessage[]
}

export const SCENARIOS: Record<string, Scenario> = {
  roteamento: {
    label: 'Roteamento inteligente',
    desc: 'Manda cada cliente pra pessoa certa, na hora.',
    icon: 'route',
    day: 'HOJE',
    msgs: [
      { f: 'm', t: 'Oi, comprei um ar-condicionado aí e queria a 2ª via da nota fiscal', time: '14:02' },
      { f: 'b', t: 'Oi! 😊 Isso é com o nosso financeiro. Já te passo pra Marina, um segundinho…', time: '14:02', typ: 1200 },
      { f: 'b', t: 'Prontinho! A Marina vai te mandar a nota no seu e-mail ainda hoje. Mais alguma coisa?', time: '14:03', typ: 1500 },
      { f: 'm', t: 'Era só isso, valeu!', time: '14:03' },
      { f: 'b', t: 'Disponha 💚', time: '14:03', typ: 700 },
    ],
  },
  cotacao: {
    label: 'Cotação automática',
    desc: 'Responde preço na hora, sem deixar o cliente esfriar.',
    icon: 'tag',
    day: 'HOJE',
    msgs: [
      { f: 'm', t: 'Bom dia! Quanto fica pra instalar um split de 12.000 BTUs?', time: '09:14' },
      { f: 'b', t: 'Bom dia! A instalação completa do 12.000 fica em R$ 450 — já com material e 90 dias de garantia.', time: '09:14', typ: 1600 },
      { f: 'b', t: 'Se quiser, incluo a limpeza por +R$ 80. Te mando o orçamento por aqui?', time: '09:14', typ: 1400 },
      { f: 'm', t: 'Pode mandar!', time: '09:15' },
      { f: 'b', t: 'Enviado ✅ Quer já deixar a visita agendada?', time: '09:15', typ: 1100 },
    ],
  },
  agendamento: {
    label: 'Agendamento',
    desc: 'Marca, confirma e lembra — sozinho.',
    icon: 'calendar',
    day: 'HOJE',
    msgs: [
      { f: 'm', t: 'Queria marcar uma visita técnica essa semana', time: '16:40' },
      { f: 'b', t: 'Claro! Tenho quinta às 9h ou sexta às 14h. Qual fica melhor pra você?', time: '16:40', typ: 1400 },
      { f: 'm', t: 'Sexta às 14h', time: '16:41' },
      { f: 'b', t: 'Agendado pra sexta, 14h 📅 Vou te lembrar um dia antes. Me passa o endereço?', time: '16:41', typ: 1500 },
      { f: 'm', t: 'Rua das Acácias, 120 — Centro', time: '16:42' },
      { f: 'b', t: 'Anotado! Até sexta 💚', time: '16:42', typ: 800 },
    ],
  },
  suporte: {
    label: 'Suporte 24h',
    desc: 'Atende de madrugada, fim de semana, feriado.',
    icon: 'moon',
    day: 'ONTEM',
    msgs: [
      { f: 'm', t: 'Meu ar tá pingando água por dentro, é normal isso?', time: '23:47' },
      { f: 'b', t: 'Pode ser o dreno entupido. Desliga o aparelho e me diz: a água escorre por dentro ou por fora da casa?', time: '23:47', typ: 1700 },
      { f: 'm', t: 'Por dentro :(', time: '23:48' },
      { f: 'b', t: 'Entendi. Não liga ele até a visita, pra não molhar a parte elétrica.', time: '23:48', typ: 1500 },
      { f: 'b', t: 'Já te encaixei amanhã às 8h, tudo certo? 🌙', time: '23:48', typ: 1100 },
      { f: 'm', t: 'Perfeito, obrigado por responder a essa hora!', time: '23:49' },
      { f: 'b', t: 'Tô aqui 24h pra isso 💚', time: '23:49', typ: 700 },
    ],
  },
}

const CHECK =
  '<svg width="15" height="11" viewBox="0 0 16 11" fill="none"><path d="M1 5.5 4.2 8.7 9.5 2.5" stroke="#53bdeb" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5 8.7 8.7 14 2.5" stroke="#53bdeb" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export class ChatPlayer {
  private body: HTMLElement
  private statusEl: HTMLElement | null
  speed: number
  private loop: boolean
  private timers: ReturnType<typeof setTimeout>[]
  private _token: symbol | null
  scenarioKey: string

  constructor(
    bodyEl: HTMLElement,
    statusEl: HTMLElement | null,
    opts: { scenario?: string; speed?: number; loop?: boolean } = {}
  ) {
    this.body = bodyEl
    this.statusEl = statusEl
    this.speed = opts.speed ?? 1
    this.loop = opts.loop !== false
    this.timers = []
    this._token = null
    this.scenarioKey = opts.scenario ?? 'roteamento'
  }

  setSpeed(s: number) { this.speed = s }

  private _clear() {
    this.timers.forEach(clearTimeout)
    this.timers = []
    this.body.innerHTML = ''
  }

  private _wait(ms: number): Promise<void> {
    return new Promise((res) => this.timers.push(setTimeout(res, ms / this.speed)))
  }

  private _setStatus(html: string, typing: boolean) {
    if (!this.statusEl) return
    this.statusEl.innerHTML = typing ? '<span class="typing-text">digitando…</span>' : html
  }

  play(scenarioKey?: string) {
    if (scenarioKey) this.scenarioKey = scenarioKey
    this._clear()
    const token = (this._token = Symbol())
    this._run(token)
  }

  private async _run(token: symbol) {
    const sc = SCENARIOS[this.scenarioKey]
    if (!sc) return
    const day = document.createElement('div')
    day.className = 'wa-day'
    day.textContent = sc.day || 'HOJE'
    this.body.appendChild(day)

    await this._wait(500)
    if (token !== this._token) return

    for (const m of sc.msgs) {
      if (token !== this._token) return
      if (m.f === 'b') {
        this._setStatus('', true)
        const typ = document.createElement('div')
        typ.className = 'typing'
        typ.innerHTML = '<i></i><i></i><i></i>'
        this.body.appendChild(typ)
        this._scroll()
        await this._wait(m.typ ?? 1200)
        if (token !== this._token) return
        typ.remove()
        this._setStatus('online', false)
      } else {
        await this._wait(620)
        if (token !== this._token) return
      }
      this._add(m)
      this._scroll()
      await this._wait(m.f === 'b' ? 850 : 650)
    }

    if (this.loop) {
      await this._wait(3600)
      if (token !== this._token) return
      this.play()
    }
  }

  private _add(m: ChatMessage) {
    const b = document.createElement('div')
    b.className = 'bubble ' + (m.f === 'b' ? 'them' : 'me')
    const tick = m.f === 'm' ? CHECK : ''
    b.innerHTML = esc(m.t) + '<span class="time">' + m.time + ' ' + tick + '</span>'
    this.body.appendChild(b)
  }

  private _scroll() { this.body.scrollTop = this.body.scrollHeight }

  stop() { this._token = Symbol(); this._clear() }
}
