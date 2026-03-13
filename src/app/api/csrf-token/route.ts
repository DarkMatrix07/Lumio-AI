import { CSRF_COOKIE_NAME, generateCsrfToken } from '@/lib/security/csrf'

/**
 * GET /api/csrf-token
 *
 * Issues a new CSRF token.
 * - Sets it as a non-httpOnly cookie so same-origin JS can read it.
 * - Returns the token in the response body for convenience.
 *
 * Call this once when the studio page mounts, then include the token value
 * in every mutation request via the `X-CSRF-Token` header.
 */
export function GET(): Response {
  const token = generateCsrfToken()

  return Response.json(
    { token },
    {
      headers: {
        // SameSite=Strict prevents the cookie from being sent on cross-site requests.
        // Not httpOnly so same-origin JS can mirror it into the X-CSRF-Token header.
        'Set-Cookie': `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Strict`,
      },
    },
  )
}
