const DEV_ORIGINS = new Set(['http://localhost:3000', 'http://localhost:3001'])

/**
 * Validates that a request originates from an allowed host.
 * Checks the Origin header (present on all cross-site fetch calls and same-site
 * fetch calls in modern browsers).
 */
export function checkOrigin(request: Request): { ok: boolean; reason?: string } {
  const origin = request.headers.get('Origin')

  if (!origin) {
    return { ok: false, reason: 'Missing Origin header' }
  }

  if (DEV_ORIGINS.has(origin)) {
    return { ok: true }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl && origin === appUrl) {
    return { ok: true }
  }

  return { ok: false, reason: `Origin '${origin}' is not allowed` }
}
