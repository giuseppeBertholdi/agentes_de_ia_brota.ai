# Handoff: Plimpost Dashboard (WhatsApp-style, opções 2a / 2b / 2c)

## Overview
Painel web desktop da Plimpost — plataforma de atendimento automático via WhatsApp com IA para pequenos negócios. Agentes de IA recebem clientes, tiram dúvidas, montam orçamentos pela tabela de preços, negociam desconto dentro do limite do dono e fazem follow-up; um humano pode assumir a conversa a qualquer momento pelo painel.

Três telas aprovadas pelo cliente:
- **2a — Dashboard** (sidebar + cards)
- **2b — Dashboard ultra-minimal** (alternativa de uma coluna; escolher 2a OU 2b como home, ou oferecer como modo compacto)
- **2c — Inbox** com takeover humano

## About the Design Files
Os arquivos deste pacote são **referências de design criadas em HTML** — protótipos que mostram aparência e comportamento pretendidos, não código de produção. A tarefa é **recriar estes designs no ambiente do codebase alvo** (React, Vue, etc.) usando os padrões e bibliotecas já existentes — ou, se ainda não houver ambiente, escolher o framework mais adequado e implementar lá.

Abra `Plimpost Dashboard.dc.html` no navegador (com `support.js` e `ds/` na mesma pasta). O arquivo contém várias explorações; as aprovadas são os elementos com `id="2a"`, `id="2b"` e `id="2c"` (turno 2, no topo). Todos os estilos dessas telas são **inline** no HTML — a fonte da verdade para medidas exatas. Ignore o turno 1 (direção antiga, vermelha).

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamentos e copy são finais. Recriar pixel-perfect com os componentes do codebase.

## Design Tokens
Cores (paleta WhatsApp):
- Verde primário / marca: `#25d366`
- Teal escuro (ações, links, texto de destaque): `#0b6156`
- Texto sobre botão verde: `#052e22`
- Tinta (texto principal): `#111b21`
- Texto secundário: `#54656f` · terciário/placeholder: `#8696a0`
- Fundo do app: `#f7f9f8` · superfícies: `#fff` · cinza de chips/inputs: `#f0f2f5`
- Tint verde claro (fundos de badge/nav ativa): `#e7f8ef` · verde claro de gráfico: `#c8e6d5`
- Alerta/atenção (humano pendente): texto `#9a6c1e` sobre `#fef3e2`; dot `#f2a33c`
- Chat (2c): fundo da conversa `#efeae2`; balão do cliente `#fff`; balão da empresa `#d9fdd3`; hora no balão `#667781`
- Bordas/divisores: `rgba(17,27,33,.06)` a `.12`; sombra de card `0 1px 2px rgba(17,27,33,.06)`

Tipografia: **Archivo** (Google Fonts), fallback `system-ui, sans-serif`.
- Título de página: 22–26px / 700–800 / letter-spacing -0.01em
- Números KPI: 26–30px / 800
- Corpo: 13–14px; secundário 12px; micro-labels 10–11px (uppercase com letter-spacing .06em nos headers de seção de 2b)

Raios: cards 12px; itens internos 10px; botões 7–8px; pills/chips 14–22px; avatares círculo.
Espaçamento: gaps de grid 14px; padding de card 18–24px; padding de página 32–36px.

## Screens / Views

### 2a — Dashboard
Layout: flex horizontal, min-height 760px, fundo `#f7f9f8`.
- **Sidebar** 220px, branca, borda direita `rgba(17,27,33,.08)`. Logo (raio Lucide `zap` preenchido `#25d366` + "Plimpost" 18px/800). Nav vertical: itens 14px, padding 9x12, raio 8px; ativo = fundo `#e7f8ef`, texto `#0b6156`, 600; inativos `#54656f`. Itens: Dashboard, Inbox (badge verde "14", pill), Aprovações (contador teal "3"), Cotações, Contexto, Relatórios, Pós-venda, Equipe, Configurações. Rodapé: card `#f7f9f8` raio 10px com avatar circular `#0b6156` (iniciais) + nome + plano.
- **Header**: saudação 22px/700 + data 13px `#54656f`; à direita, pill de status "WhatsApp conectado" (`#e7f8ef`/`#0b6156` com dot `#25d366`) e botão primário "Nova cotação" (`#0b6156`, branco, raio 8px, 9x16).
- **Linha de 4 KPIs**: grid 4 colunas, gap 14px; cards brancos raio 12px, sombra sutil. Label 12px `#54656f`, número 30px/800, sublinha 12px (verde `#0b6156` quando positiva). KPIs: Conversas ativas 14; Cotações hoje 6; Receita (semana) R$ 18.240 (↑ 22%); Mensagens hoje 312 (94% pelo bot).
- **Grid principal** `1fr 380px`, gap 14px:
  - Card "Atividade da semana": gráfico de barras HTML/flex, 7 dias × 2 séries (Conversas `#25d366`, Cotações `#c8e6d5`), barras raio 4px topo, altura 130px; legenda no topo direito; labels dos dias 11px `#8696a0`.
  - Card "Conversas recentes": lista com avatar circular 36px (iniciais em tint), nome 13px/600, última mensagem 12px truncada, chip de status ("bot" verde-tint; "com Rafa" âmbar-tint) e tempo relativo. Link "Ver inbox →" teal.
  - Coluna direita: card "Precisa de você" (badge verde "3"): 3 itens em blocos `#f7f9f8` raio 10px — Desconto acima do limite (botões Aprovar primário / Manter 10% secundário), Item fora da tabela, Follow-up sugerido. Card "Agenda de hoje": linhas hora (12px/700 teal, largura 42px) + descrição.

### 2b — Dashboard ultra-minimal
Layout: nav superior + coluna central max-width 760px, fundo branco.
- **Nav**: logo à esquerda, links (Hoje ativo em teal/600, Inbox, Cotações, Relatórios, Ajustes) e avatar; padding 18x48, borda inferior.
- **Cabeçalho**: data 26px/800; resumo em prosa 14px `#54656f` com números em strong `#111b21`.
- **Régua de stats**: linha flex com bordas top/bottom, 3 números (26px/800 + label 12px) e à direita botão pill "Abrir inbox" (`#25d366`, texto `#052e22`, raio 20px).
- **"Só isso precisa de você"** (header de seção 13px/700 uppercase `#8696a0`): 3 linhas-card com borda raio 12px, dot de severidade (verde/âmbar/cinza), título 14px/600 + sub 12px, botão à direita (Decidir/Assumir primário teal; Definir preço outline).
- **"O bot cuidou do resto"**: lista de ✓ verdes, texto 13px, hora à direita 12px `#8696a0`, divisores finos.

### 2c — Inbox (takeover humano)
Layout: lista 320px + conversa, min-height 720px.
- **Lista**: título "Inbox" + contador; filtros pill (Todas ativa `#e7f8ef`/teal; Bot, Humano em `#f0f2f5`). Itens: avatar 40px, nome 13px/700, hora 11px, preview truncado 12px, micro-status 10px/700 uppercase (BOT · NEGOCIANDO teal; PEDIU HUMANO âmbar; PÓS-VENDA cinza). Item selecionado: fundo `#f0f7f4` + borda esquerda 3px `#25d366`.
- **Header da conversa**: avatar + nome 15px/700 + meta 12px (telefone, nº de pedidos, cliente desde); chip "bot pausado" âmbar; botão "Assumir conversa" verde `#25d366`/`#052e22`.
- **Conversa**: fundo `#efeae2`; chip de data central branco raio 8px. Balões max-width 520px, padding 10x14, raio 10px com canto superior "apontado" (2px) no lado do remetente, sombra `0 1px 1px rgba(17,27,33,.1)`; cliente branco à esquerda, empresa `#d9fdd3` à direita; hora 10px alinhada à direita dentro do balão; mensagens do bot assinadas "⚡ agente de vendas · hh:mm". Evento de sistema central: pill branca com dot verde — "Bot pausou — cliente pediu atendimento humano".
- **Composer**: chips de sugestão (`#f0f2f5`, raio 14px): Sugerir: agendar ligação / tabela de atacado / Histórico de pedidos. Input pill `#f0f2f5` raio 22px "Responder como Giuseppe…", botão "Enviar" verde pill, botão "Devolver ao bot" outline pill.

## Interactions & Behavior
- Nav lateral/superior: troca de rota; hover = tint leve (`#f0f2f5` ou 4% de tinta); ativo como especificado.
- Badges de contagem (Inbox 14, Aprovações 3) em tempo real.
- "Assumir conversa": pausa o bot na conversa, muda o chip para estado "você no controle", habilita o composer; "Devolver ao bot" reverte. Quando o cliente pede humano, o bot pausa sozinho e gera o evento central + status âmbar na lista.
- Aprovações: Aprovar/Manter agem inline e removem o item; a decisão dispara mensagem do bot ao cliente.
- Chips de sugestão inserem texto no composer (não enviam direto).
- Gráfico: tooltip por dia (opcional); listas com hover row.
- Estados de foco: outline 2px teal `#0b6156`, offset 2px (não deixar o ring azul default).
- Loading: skeletons nos cards de KPI e listas; conversa carrega do mais recente.

## State Management
- Sessão/usuário (nome, plano, avatar) e status da conexão WhatsApp (conectado/desconectado — a pill do header reflete).
- Contadores: conversas ativas (bot × humano), cotações do dia, receita da semana, mensagens do dia, % resolvido pelo bot.
- Inbox: lista de conversas (id, cliente, preview, hora, modo bot|humano|pausado, flag pediu-humano), conversa selecionada, mensagens (autor cliente|bot|humano, texto, hora), filtro ativo.
- Aprovações pendentes (tipo: desconto | item-sem-preço | follow-up; payload; ações).
- Dados: WebSocket/polling para mensagens e contadores; REST para históricos e agenda.

## Assets
- Fonte Archivo via Google Fonts.
- Ícones: Lucide (https://lucide.dev). Logo provisório = `zap` preenchido `#25d366` + wordmark "Plimpost"; substituir pelo logo real da marca.
- Avatares: iniciais sobre tint (sem imagens).
- Emojis apenas onde aparecem no conteúdo de chat do cliente.

## Files
- `Plimpost Dashboard.dc.html` — protótipo; telas aprovadas nos ids `2a`, `2b`, `2c` (turno 2, topo do arquivo). Estilos inline = medidas exatas.
- `support.js` — runtime do protótipo (apenas para abrir o HTML; irrelevante para a implementação).
- `ds/styles.css` — stylesheet usado pelo turno 1 (direção antiga); não se aplica às telas 2a–2c.
