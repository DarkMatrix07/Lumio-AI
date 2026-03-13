export const CSRF_COOKIE_NAME = 'lumio-csrf'
export const CSRF_HEADER_NAME = 'X-CSRF-Token'

function parseCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (key === name) return trimmed.slice(eq + 1).trim() || null
  }
  return null
}

/**
 * Double-submit cookie CSRF validation.
 *
 * The client is expected to:
 *  1. Read the `lumio-csrf` cookie value (not httpOnly — readable by same-origin JS)
 *  2. Mirror it in the `X-CSRF-Token` request header
 *
 * A cross-site attacker cannot read the cookie, so they cannot produce the
 * matching header value.
 */
export function validateCsrfToken(request: Request): { ok: boolean; reason?: string } {
  const cookieHeader = request.headers.get('Cookie') ?? ''
  const cookieToken = parseCookie(cookieHeader, CSRF_COOKIE_NAME)
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!headerToken) {
    return { ok: false, reason: `Missing ${CSRF_HEADER_NAME} header` }
  }

  if (!cookieToken) {
    return { ok: false, reason: `Missing ${CSRF_COOKIE_NAME} cookie` }
  }

  if (headerToken !== cookieToken) {
    return { ok: false, reason: 'CSRF token mismatch' }
  }

  return { ok: true }
}

/** Generates a random CSRF token suitable for embedding in a cookie. */
export function generateCsrfToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
