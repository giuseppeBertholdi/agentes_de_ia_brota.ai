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

export const api = { get, post, patch, put, delete: del }
