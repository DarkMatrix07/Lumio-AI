import { z } from 'zod'

import { getProvider } from '@/lib/ai/providers/factory'
import type { ProviderName } from '@/lib/ai/providers/factory'
import { buildGenerationPrompt } from '@/lib/ai/prompt-builder'
import { StreamParser } from '@/lib/ai/stream-parser'
import { validateCsrfToken } from '@/lib/security/csrf'
import { checkOrigin } from '@/lib/security/origin-check'

const GenerateRequestSchema = z.object({
  userPrompt: z.string().min(1, 'userPrompt must not be empty'),
  canvasHtml: z.string(),
  canvasCss: z.string(),
  provider: z.enum(['claude', 'openai', 'gemini']).optional().default('claude'),
  /** Optional client-supplied API key (MVP convenience — do not persist server-side). */
  apiKey: z.string().optional(),
})

type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'html'; content: string }
  | { type: 'css'; content: string }
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

  // 4. Build the generation prompt
  const prompt = buildGenerationPrompt({ userPrompt, canvasHtml, canvasCss })

  // 5. Stream from provider, parse chunks, forward as NDJSON events
  const adapter = getProvider(provider as ProviderName, apiKey)
  const parser = new StreamParser()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of adapter.streamGenerate({ prompt })) {
          const result = parser.push(chunk.text)

          if (result.visibleText) {
            controller.enqueue(encodeEvent(encoder, { type: 'text', content: result.visibleText }))
          }
          if (result.htmlDelta) {
            controller.enqueue(encodeEvent(encoder, { type: 'html', content: result.htmlDelta }))
          }
          if (result.cssDelta) {
            controller.enqueue(encodeEvent(encoder, { type: 'css', content: result.cssDelta }))
          }

          if (chunk.done) break
        }

        const flushed = parser.flush()
        if (flushed.visibleText) {
          controller.enqueue(encodeEvent(encoder, { type: 'text', content: flushed.visibleText }))
        }

        controller.enqueue(encodeEvent(encoder, { type: 'done' }))
      } catch (err) {
        controller.enqueue(
          encodeEvent(encoder, {
            type: 'error',
            message: err instanceof Error ? err.message : 'Generation failed',
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
