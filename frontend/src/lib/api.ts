import { supabase } from './supabase'

// Em produção sempre usa o proxy do Netlify (/api/*), independente de VITE_API_URL.
// Em dev (localhost) usa VITE_API_URL ou cai para http://localhost:8000.
const _isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const BASE = _isLocal
  ? ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000')
  : '/api'

async function authHeaders(): Promise<HeadersInit> {
  // tenta pegar a sessão; se expirada, refreshSession() renova automaticamente
  let { data } = await supabase.auth.getSession()
  if (!data.session) {
    const refreshed = await supabase.auth.refreshSession()
    data = refreshed.data as typeof data
  }
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: await authHeaders() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function del<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: await authHeaders() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export const api = { get, post, patch, put, delete: del }
