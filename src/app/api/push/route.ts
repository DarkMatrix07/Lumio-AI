import { z } from 'zod'

import { pushToGitHub } from '@/lib/github/push-service'
import { validateCsrfToken } from '@/lib/security/csrf'
import { checkOrigin } from '@/lib/security/origin-check'
import { checkRateLimit } from '@/lib/security/rate-limit'

const PushRequestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  appSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  pat: z.string(),
  branch: z.string().min(1).optional(),
  contentByPath: z.record(z.string(), z.string()),
})

export async function POST(request: Request): Promise<Response> {
  const originResult = checkOrigin(request)
  if (!originResult.ok) {
    return Response.json({ error: originResult.reason }, { status: 403 })
  }

  const csrfResult = validateCsrfToken(request)
  if (!csrfResult.ok) {
    return Response.json({ error: csrfResult.reason }, { status: 403 })
  }

  const ipHeader = request.headers.get('x-forwarded-for')
  const rateLimitKey = ipHeader?.split(',')[0]?.trim() || request.headers.get('Origin') || 'anonymous'
  const rateLimit = checkRateLimit(rateLimitKey)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded', retryAfterSeconds: rateLimit.retryAfterSeconds },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    )
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PushRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await pushToGitHub(parsed.data)
    return Response.json(result)
  } catch (error) {
    const errorStatus =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: number }).status
        : undefined

    if ((error instanceof Error && error.message === 'Invalid PAT') || errorStatus === 401 || errorStatus === 403) {
      return Response.json({ error: 'Invalid PAT' }, { status: 401 })
    }

    console.error('Push API failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    return Response.json({ error: 'Push failed' }, { status: 500 })
  }
}
