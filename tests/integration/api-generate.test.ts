import { beforeEach, describe, expect, test, vi } from 'vitest'

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/security/csrf'

// Mock the provider factory so no real API calls are made in integration tests
vi.mock('@/lib/ai/providers/factory', () => ({
  getProvider: vi.fn().mockReturnValue({
    streamGenerate: async function* () {
      yield { text: '<lumio-ai-html><main>Hello</main></lumio-ai-html>', done: false }
      yield { text: '<lumio-ai-css>main { margin: 0; }</lumio-ai-css>', done: false }
      yield { text: ' Great, done!', done: false }
      yield { text: '', done: true }
    },
  }),
}))

// Import after mocks are registered
const { POST } = await import('@/app/api/generate/route')

const VALID_ORIGIN = 'http://localhost:3000'
const VALID_TOKEN = 'test-csrf-token-abc123'

function makeRequest(opts: {
  origin?: string
  csrfHeader?: string
  csrfCookie?: string
  body?: Record<string, unknown>
}) {
  const { origin, csrfHeader, csrfCookie, body } = opts
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (origin) headers.set('Origin', origin)
  if (csrfHeader) headers.set(CSRF_HEADER_NAME, csrfHeader)
  if (csrfCookie) headers.set('Cookie', `${CSRF_COOKIE_NAME}=${csrfCookie}`)

  return new Request('http://localhost:3000/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? { userPrompt: 'Add a footer', canvasHtml: '<main/>', canvasCss: '' }),
  })
}

describe('POST /api/generate', () => {
  describe('origin guard', () => {
    test('rejects request with no Origin header', async () => {
      const req = makeRequest({ csrfHeader: VALID_TOKEN, csrfCookie: VALID_TOKEN })
      const res = await POST(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/origin/i)
    })

    test('rejects request from disallowed origin', async () => {
      const req = makeRequest({
        origin: 'https://evil.example.com',
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
      })
      const res = await POST(req)
      expect(res.status).toBe(403)
    })
  })

  describe('csrf guard', () => {
    test('rejects request with missing CSRF header', async () => {
      const req = makeRequest({ origin: VALID_ORIGIN, csrfCookie: VALID_TOKEN })
      const res = await POST(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/csrf/i)
    })

    test('rejects request with missing CSRF cookie', async () => {
      const req = makeRequest({ origin: VALID_ORIGIN, csrfHeader: VALID_TOKEN })
      const res = await POST(req)
      expect(res.status).toBe(403)
    })

    test('rejects request with mismatched CSRF tokens', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: 'header-token',
        csrfCookie: 'cookie-token',
      })
      const res = await POST(req)
      expect(res.status).toBe(403)
    })
  })

  describe('body validation', () => {
    test('rejects missing userPrompt', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
        body: { canvasHtml: '', canvasCss: '' },
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    test('rejects empty userPrompt', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
        body: { userPrompt: '', canvasHtml: '', canvasCss: '' },
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })

  describe('happy path', () => {
    test('returns 200 with a streaming response for valid request', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    test('stream contains html event from mocked provider', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
      })
      const res = await POST(req)
      const text = await res.text()
      const lines = text.split('\n').filter(Boolean)
      const events = lines.map((l) => JSON.parse(l) as { type: string; content?: string })

      const htmlEvent = events.find((e) => e.type === 'html')
      expect(htmlEvent).toBeDefined()
      expect(htmlEvent?.content).toBe('<main>Hello</main>')
    })

    test('stream contains css event from mocked provider', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
      })
      const res = await POST(req)
      const text = await res.text()
      const lines = text.split('\n').filter(Boolean)
      const events = lines.map((l) => JSON.parse(l) as { type: string; content?: string })

      const cssEvent = events.find((e) => e.type === 'css')
      expect(cssEvent).toBeDefined()
      expect(cssEvent?.content).toBe('main { margin: 0; }')
    })

    test('stream ends with a done event', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
      })
      const res = await POST(req)
      const text = await res.text()
      const lines = text.split('\n').filter(Boolean)
      const last = JSON.parse(lines[lines.length - 1]) as { type: string }
      expect(last.type).toBe('done')
    })

    test('lumio tag content does not appear in text events', async () => {
      const req = makeRequest({
        origin: VALID_ORIGIN,
        csrfHeader: VALID_TOKEN,
        csrfCookie: VALID_TOKEN,
      })
      const res = await POST(req)
      const text = await res.text()
      const lines = text.split('\n').filter(Boolean)
      const events = lines.map((l) => JSON.parse(l) as { type: string; content?: string })

      const textEvents = events.filter((e) => e.type === 'text')
      for (const ev of textEvents) {
        expect(ev.content).not.toMatch(/lumio-ai-html|lumio-ai-css/)
      }
    })
  })
})
