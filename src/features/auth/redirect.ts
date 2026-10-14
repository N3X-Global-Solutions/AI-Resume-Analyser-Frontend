/** Only same-app paths are allowed as a post-login destination (no `//evil.com` or absolute URLs). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || next.startsWith('/login')) {
    return '/'
  }
  return next
}

export function loginPath(next: string, expired = false): string {
  const params = new URLSearchParams()
  if (next && next !== '/') params.set('next', next)
  if (expired) params.set('expired', '1')
  const qs = params.toString()
  return qs ? `/login?${qs}` : '/login'
}
