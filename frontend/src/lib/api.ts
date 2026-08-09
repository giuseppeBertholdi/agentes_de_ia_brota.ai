import { supabase } from './supabase'

// Em produção sempre usa o proxy do Netlify (/api/*), independente de VITE_API_URL.
// Em dev (localhost) usa VITE_API_URL ou cai para http://localhost:8000.
const _isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const BASE = _isLocal
  ? ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000')
  : '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Compartilha uma única promise de sessão entre chamadas concorrentes: evita que
// múltiplos fetches simultâneos disparem refreshSession() em paralelo e um invalide
// o refresh token do outro (rotação de refresh token do Supabase), causando 403 aleatórios.
let sessionPromise: Promise<{ access_token?: string }> | null = null

async function getToken(): Promise<string | undefined> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return data.session
      const refreshed = await supabase.auth.refreshSession()
      return refreshed.data.session ?? {}
    })().finally(() => { sessionPromise = null })
  }
  const session = await sessionPromise
  return session.access_token
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handle<T>(r: Response): Promise<T> {
  if (!r.ok) throw new ApiError(r.status, await r.text())
  return r.json()
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: await authHeaders() })
  return handle<T>(r)
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return handle<T>(r)
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return handle<T>(r)
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return handle<T>(r)
}

async function del<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: await authHeaders() })
  return handle<T>(r)
}

// baixa um arquivo binário (ex: documento recebido no WhatsApp) autenticado
// e dispara o download no navegador — fetch simples não dá pra usar aqui
// porque um <a href> não consegue mandar o header Authorization.
async function download(path: string, filename: string): Promise<void> {
  const headers = await authHeaders()
  delete (headers as Record<string, string>)['Content-Type']
  const r = await fetch(`${BASE}${path}`, { headers })
  if (!r.ok) throw new ApiError(r.status, await r.text())
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// upload multipart (ex: documento da Central de Contexto, foto no Inbox) —
// sem Content-Type manual, o navegador define o boundary do multipart sozinho.
async function upload<T>(path: string, file: File, fields?: Record<string, string>): Promise<T> {
  const headers = await authHeaders()
  delete (headers as Record<string, string>)['Content-Type']
  const form = new FormData()
  form.append('file', file)
  for (const [k, v] of Object.entries(fields || {})) form.append(k, v)
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: form })
  return handle<T>(r)
}

// busca um binário autenticado (ex: foto/documento recebido no WhatsApp) e
// devolve uma object URL pra usar direto num <img src> ou link — quem chama
// é responsável por revogar a URL (URL.revokeObjectURL) quando não precisar mais.
async function getObjectUrl(path: string): Promise<string> {
  const headers = await authHeaders()
  delete (headers as Record<string, string>)['Content-Type']
  const r = await fetch(`${BASE}${path}`, { headers })
  if (!r.ok) throw new ApiError(r.status, await r.text())
  const blob = await r.blob()
  return URL.createObjectURL(blob)
}

export const api = { get, post, patch, put, delete: del, download, upload, getObjectUrl }
