/**
 * Minimal typed fetch wrapper for the FastAPI backend.
 * All routes live under `/api`: proxied to http://localhost:8000 by Vite in dev, or on another host when
 * the build sets `VITE_API_BASE_URL` (e.g. `https://api.example.com` for a Cloudflare Pages frontend).
 */

export const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
export const API_BASE = `${API_ORIGIN}/api`

/**
 * Called when an authenticated request comes back 401 (session expired or signed out elsewhere).
 * Not called for `/auth/*` requests: the login form and the session check handle their own 401s.
 */
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

/** FastAPI 422 validation error item. */
export interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}

export class ApiError extends Error {
  /** HTTP status code; 0 when the request never reached the server. */
  readonly status: number
  /** Human readable message derived from FastAPI's `detail`. */
  readonly detail: string
  /** The raw parsed response body (string, object or validation list). */
  readonly body: unknown

  constructor(status: number, detail: string, body?: unknown) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.body = body
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isNotFound(): boolean {
    return isNotFoundError(this)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * The requested resource doesn't exist: a 404, or FastAPI's 422 for a malformed id in the URL path
 * (`detail[0].loc[0] === 'path'`, e.g. `/jobs/not-a-uuid`).
 */
export function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.status === 404) return true
  if (error.status !== 422 || !error.body || typeof error.body !== 'object' || !('detail' in error.body)) return false
  const detail = (error.body as { detail: unknown }).detail
  const first = isValidationList(detail) ? detail[0] : undefined
  return Array.isArray(first?.loc) && first.loc[0] === 'path'
}

/** Best-effort human message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.detail
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function isValidationList(value: unknown): value is ValidationErrorItem[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && 'msg' in item)
  )
}

function describeDetail(body: unknown, status: number, statusText: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (isValidationList(detail)) {
      return detail
        .map((item) => {
          const field = item.loc.filter((part) => part !== 'body').join('.')
          return field ? `${field}: ${item.msg}` : item.msg
        })
        .join('; ')
    }
  }
  if (typeof body === 'string' && body.trim() && body.length < 300 && !body.trim().startsWith('<')) {
    return body.trim()
  }
  if (status === 502 || status === 503 || status === 504) {
    return API_ORIGIN
      ? 'The API server is not reachable right now. Please try again shortly.'
      : 'The API server is not reachable. Is the backend running on port 8000?'
  }
  return `Request failed (${status}${statusText ? ` ${statusText}` : ''})`
}

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[]
export type QueryParams = Record<string, QueryValue>

/** Builds `?a=1&b=x,y` — skips null/undefined/empty values; arrays become comma lists. */
export function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      search.set(key, value.join(','))
    } else {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function apiUrl(path: string, params?: QueryParams): string {
  return `${API_BASE}${path}${buildQuery(params)}`
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: QueryParams
  /** JSON body (serialized automatically). */
  json?: unknown
  /** Multipart body (Content-Type is set by the browser). */
  formData?: FormData
  signal?: AbortSignal
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return text
    }
  }
  return text
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, json, formData, signal } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined
  if (formData) {
    body = formData
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }

  let response: Response
  try {
    // The admin session is an httpOnly cookie; 'include' also sends it when the API is on another subdomain.
    response = await fetch(apiUrl(path, query), { method, headers, body, signal, credentials: 'include' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Cannot reach the API server. Check your connection and that the backend is running.')
  }

  if (response.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler?.()

  const parsed = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(response.status, describeDetail(parsed, response.status, response.statusText), parsed)
  }
  return parsed as T
}
