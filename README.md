# Brota — Plataforma SaaS de Agentes de IA para WhatsApp

Plataforma multi-tenant para automação de atendimento via WhatsApp com agentes de IA para pequenas empresas brasileiras.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.11+) |
| Banco + Auth + Realtime | Supabase (PostgreSQL + RLS + Realtime) |
| WhatsApp | WhatsApp Cloud API (Meta) — Embedded Signup |
| IA | OpenAI GPT-4o-mini |

## Estrutura

```
brota/
├── frontend/          # React app
├── backend/           # FastAPI
├── supabase/
│   └── migrations/    # SQL (aplique no Supabase)
├── .env.example
└── README.md
```

## Pré-requisitos

- Node.js 20+
- Python 3.11+
- Conta Supabase (https://supabase.com)
- Conta OpenAI
- App Meta for Developers com o produto WhatsApp (veja seção 5)

---

## 1. Supabase

1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor** e execute, em ordem, os arquivos em `supabase/migrations/`
3. Em **Settings > API**, copie:
   - Project URL → `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY` e `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY`
   - JWT Secret (Settings > API > JWT Settings) → `SUPABASE_JWT_SECRET`
4. Em **Authentication > URL Configuration**, adicione `http://localhost:5173` em Site URL

---

## 2. Variáveis de ambiente

```bash
cp .env.example .env
# edite .env com seus valores
```

O arquivo `.env` na raiz é usado pelo backend. O frontend lê as variáveis `VITE_*` de `frontend/.env.local`:

```bash
cp .env.example frontend/.env.local
# as variáveis VITE_* já estão no .env.example
```

---

## 3. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# rode em desenvolvimento
uvicorn main:app --reload --port 8000
```

A API ficará disponível em http://localhost:8000  
Documentação interativa: http://localhost:8000/docs

### Webhook da WhatsApp Cloud API

A rota de webhook é única para todas as empresas (multi-tenant via `phone_number_id`):
```
GET  http://SEU_BACKEND/webhook   (verificação, configurada uma única vez no App da Meta)
POST http://SEU_BACKEND/webhook
```

O backend identifica a empresa pelo `phone_number_id` recebido no payload, comparando com a tabela `whatsapp_instances`.

---

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173

---

## 5. App Meta / WhatsApp Cloud API

1. Crie um App em https://developers.facebook.com/apps (tipo "Empresa") e adicione o produto **WhatsApp**.
2. Em **WhatsApp > Configuração da API**, configure o **Embedded Signup** (fluxo para os clientes conectarem o próprio número) e anote o **Config ID**.
3. Em **Configurações do Negócio > Usuários do sistema**, crie um System User, gere um **token permanente** com as permissões `whatsapp_business_management` e `whatsapp_business_messaging`, e atribua-o ao App.
4. Em **WhatsApp > Configuração > Webhook**, cadastre `https://SEU_BACKEND/webhook`, defina um *Verify Token* (mesmo valor de `WEBHOOK_VERIFY_TOKEN`) e assine os eventos `messages`.
5. Preencha no `.env`: `META_APP_ID`, `META_APP_SECRET`, `META_CONFIG_ID`, `META_SYSTEM_USER_TOKEN`, `WEBHOOK_VERIFY_TOKEN`. No frontend (`VITE_META_APP_ID`, `VITE_META_CONFIG_ID`).

Cada empresa cliente conecta o próprio número pela página de Configurações, usando o botão "Conectar WhatsApp" (Embedded Signup) — sem precisar de QR code, pois a Cloud API usa Phone Number ID + token de App em vez de pareamento por sessão.

---

## Fluxo de uso

1. **Cadastro** → empresa criada automaticamente com perfil do usuário
2. **Configurações** → conecta WhatsApp (Embedded Signup da Meta), preenche tabela de preços e tom de voz
3. **WhatsApp** → clientes mandam mensagem no número conectado
4. **Bot** → Recepcionista entende a intenção e responde ou aciona o Agente de Cotação
5. **Inbox** → operador vê todas as conversas em tempo real, pode assumir quando necessário
6. **Cotações** → histórico de orçamentos gerados automaticamente

---

## Agentes de IA (MVP)

### Recepcionista
- Recebe qualquer mensagem
- Detecta intenção: saudação, cotação, agendamento, dúvida, reclamação
- Responde diretamente ou aciona o Agente de Cotação

### Agente de Cotação
- Conduz conversa para coletar produto/quantidade desejada
- Consulta tabela de preços configurada pela empresa
- Gera cotação formatada e envia automaticamente
- Registra cotação no painel (página Cotações)

---

## Multi-tenant e segurança

- Cada empresa é um **tenant isolado** com `company_id` próprio
- **Row Level Security (RLS)** no Supabase garante que cada empresa vê apenas seus dados
- Backend usa `service_role` key para operações privilegiadas (webhooks)
- Frontend usa `anon` key + JWT do usuário logado
- Tokens verificados no backend via `SUPABASE_JWT_SECRET`

---

## Produção

```bash
# Frontend
cd frontend && npm run build
# Sirva a pasta dist/ com nginx, Vercel, Netlify, etc.

# Backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
# Ou use Railway, Render, Fly.io, etc.
```

Lembre-se de atualizar `FRONTEND_URL` no `.env` para o domínio de produção (necessário para CORS) e de recadastrar a URL do webhook (`https://SEU_DOMINIO/webhook`) no App da Meta.
