import type { ProviderChunk, ProviderStreamTransport } from './types'

// ── Anthropic (Claude) ────────────────────────────────────────────────────────

type AnthropicSseEvent = {
  type: string
  delta?: { type: string; text?: string }
}

async function* streamAnthropicResponse(
  response: Response,
): AsyncIterable<ProviderChunk> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        yield { text: '', done: true }
        return
      }
      try {
        const event = JSON.parse(data) as AnthropicSseEvent
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
          yield { text: event.delta.text, done: false }
        }
        if (event.type === 'message_stop') {
          yield { text: '', done: true }
          return
        }
      } catch {
        // skip malformed events
      }
    }
  }

  yield { text: '', done: true }
}

export const claudeTransport = (apiKey?: string): ProviderStreamTransport =>
  async function* (input) {
    const resolvedKey = apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!resolvedKey) throw new Error('ANTHROPIC_API_KEY is not configured')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': resolvedKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 8192,
        stream: true,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Claude API ${response.status}: ${text}`)
    }

    yield* streamAnthropicResponse(response)
  }

// ── OpenAI ────────────────────────────────────────────────────────────────────

type OpenAiSseChoice = { delta?: { content?: string }; finish_reason?: string | null }
type OpenAiSseEvent = { choices?: OpenAiSseChoice[] }

async function* streamOpenAiResponse(response: Response): AsyncIterable<ProviderChunk> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        yield { text: '', done: true }
        return
      }
      try {
        const event = JSON.parse(data) as OpenAiSseEvent
        const content = event.choices?.[0]?.delta?.content
        if (content) yield { text: content, done: false }
        if (event.choices?.[0]?.finish_reason === 'stop') {
          yield { text: '', done: true }
          return
        }
      } catch {
        // skip malformed events
      }
    }
  }

  yield { text: '', done: true }
}

export const openaiTransport = (apiKey?: string): ProviderStreamTransport =>
  async function* (input) {
    const resolvedKey = apiKey ?? process.env.OPENAI_API_KEY
    if (!resolvedKey) throw new Error('OPENAI_API_KEY is not configured')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolvedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        stream: true,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenAI API ${response.status}: ${text}`)
    }

    yield* streamOpenAiResponse(response)
  }

// ── Gemini ────────────────────────────────────────────────────────────────────

type GeminiCandidate = { content?: { parts?: Array<{ text?: string }> } }
type GeminiEvent = { candidates?: GeminiCandidate[] }

async function* streamGeminiResponse(response: Response): AsyncIterable<ProviderChunk> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Gemini returns a JSON array incrementally; parse each complete JSON object
    // by detecting lines that start with `data: `
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      try {
        const event = JSON.parse(data) as GeminiEvent
        const text = event.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) yield { text, done: false }
      } catch {
        // skip malformed events
      }
    }
  }

  yield { text: '', done: true }
}

export const geminiTransport = (apiKey?: string): ProviderStreamTransport =>
  async function* (input) {
    const resolvedKey = apiKey ?? process.env.GEMINI_API_KEY
    if (!resolvedKey) throw new Error('GEMINI_API_KEY is not configured')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${resolvedKey}&alt=sse`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Gemini API ${response.status}: ${text}`)
    }

    yield* streamGeminiResponse(response)
  }
