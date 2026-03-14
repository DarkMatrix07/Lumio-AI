import { z } from 'zod'

import { getProvider } from '@/lib/ai/providers/factory'
import type { ProviderName } from '@/lib/ai/providers/factory'
import { buildGenerationPrompt } from '@/lib/ai/prompt-builder'
import { StreamParser } from '@/lib/ai/stream-parser'
import { validateCsrfToken } from '@/lib/security/csrf'
import { checkOrigin } from '@/lib/security/origin-check'
import { checkRateLimit } from '@/lib/security/rate-limit'

const GenerateRequestSchema = z.object({
  userPrompt: z.string().min(1, 'userPrompt must not be empty'),
  canvasHtml: z.string(),
  canvasCss: z.string(),
  provider: z.enum(['claude', 'openai', 'gemini']).optional().default('gemini'),
  /** Optional client-supplied API key (MVP convenience — do not persist server-side). */
  apiKey: z.string().optional(),
})

type StreamEvent =
  | { type: 'text'; value: string }
  | { type: 'html'; value: string }
  | { type: 'css'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

function encodeEvent(encoder: TextEncoder, event: StreamEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event) + '\n')
}

export async function POST(request: Request): Promise<Response> {
  // 1. Same-origin check
  const originResult = checkOrigin(request)
  if (!originResult.ok) {
    return Response.json({ error: originResult.reason }, { status: 403 })
  }

  // 2. CSRF double-submit check
  const csrfResult = validateCsrfToken(request)
  if (!csrfResult.ok) {
    return Response.json({ error: csrfResult.reason }, { status: 403 })
  }

  // 3. Parse and validate request body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = GenerateRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { userPrompt, canvasHtml, canvasCss, provider, apiKey } = parsed.data

  // 4. Rate limit check
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

  // 5. Build the generation prompt
  const prompt = buildGenerationPrompt({ userPrompt, canvasHtml, canvasCss })

  // 6. Stream from provider, parse chunks, forward as NDJSON events
  const adapter = getProvider(provider as ProviderName, apiKey)
  const parser = new StreamParser()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of adapter.streamGenerate({ prompt })) {
          const result = parser.push(chunk.text)

          if (result.visibleText) {
            controller.enqueue(encodeEvent(encoder, { type: 'text', value: result.visibleText }))
          }
          if (result.htmlDelta) {
            controller.enqueue(encodeEvent(encoder, { type: 'html', value: result.htmlDelta }))
          }
          if (result.cssDelta) {
            controller.enqueue(encodeEvent(encoder, { type: 'css', value: result.cssDelta }))
          }

          if (chunk.done) break
        }

        const flushed = parser.flush()
        if (flushed.visibleText) {
          controller.enqueue(encodeEvent(encoder, { type: 'text', value: flushed.visibleText }))
        }
        if (flushed.htmlDelta) {
          controller.enqueue(encodeEvent(encoder, { type: 'html', value: flushed.htmlDelta }))
        }
        if (flushed.cssDelta) {
          controller.enqueue(encodeEvent(encoder, { type: 'css', value: flushed.cssDelta }))
        }

        controller.enqueue(encodeEvent(encoder, { type: 'done' }))
      } catch (err) {
        console.error('Generate API stream failed', {
          provider,
          error: err instanceof Error ? err.message : String(err),
        })

        controller.enqueue(
          encodeEvent(encoder, {
            type: 'error',
            message: err instanceof Error ? err.message : String(err),
          }),
        )
      }

      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}
