'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { applyAiInjection, createUndoCheckpoint } from '@/lib/ai/injection-service'
import type { InjectionMode } from '@/lib/ai/injection-service'
import { CSRF_HEADER_NAME } from '@/lib/security/csrf'
import { useAiChatStore } from '@/store/ai-chat-store'
import type { AiProvider, ChatMessage } from '@/store/ai-chat-store'

type ChatPanelProps = {
  getHtml: () => string
  getCss: () => string
  setHtml: (value: string) => void
  setCss: (value: string) => void
  editor: {
    UndoManager?: {
      stop?: () => unknown
      start?: () => unknown
    }
  }
}

type StreamEvent = {
  type: string
  value?: string
  message?: string
}

export function ChatPanel({ getHtml, getCss, setHtml, setCss, editor }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')
  const [isCsrfReady, setIsCsrfReady] = useState(false)

  const { streamText, isStreaming, error, provider, apiKey, appendStreamText, setIsStreaming, setError, setProvider, setApiKey, resetStream } =
    useAiChatStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/csrf-token')
      .then((r) => r.json() as Promise<{ token?: string }>)
      .then((data) => {
        setCsrfToken(data.token ?? '')
        setIsCsrfReady(true)
      })
      .catch(() => {
        setIsCsrfReady(true)
      })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  const applyToCanvas = useCallback(
    (html: string, css: string, mode: InjectionMode = 'replace') => {
      const next = applyAiInjection({
        existingHtml: getHtml(),
        existingCss: getCss(),
        incomingHtml: html,
        incomingCss: css,
        confidence: 0.9,
        mode,
      })
      if (next.requiresConfirmation) return
      createUndoCheckpoint(editor)
      setHtml(next.html)
      setCss(next.css)
    },
    [getHtml, getCss, setHtml, setCss, editor],
  )

  const handleSend = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt || isStreaming || !isCsrfReady) return

    setInput('')
    setError(null)
    resetStream()
    setIsStreaming(true)
    setMessages((prev) => [...prev, { role: 'user', content: prompt }])

    let accHtml = ''
    let accCss = ''
    let assistantText = ''
    let hadError = false

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          userPrompt: prompt,
          canvasHtml: getHtml(),
          canvasCss: getCss(),
          provider,
          ...(apiKey ? { apiKey } : {}),
        }),
      })

      if (!response.ok || !response.body) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error ?? `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const processLine = (line: string) => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line) as StreamEvent
          if (event.type === 'text' && event.value) {
            appendStreamText(event.value)
            assistantText += event.value
          } else if (event.type === 'html' && event.value) {
            accHtml += event.value
          } else if (event.type === 'css' && event.value) {
            accCss += event.value
          } else if (event.type === 'done') {
            if (accHtml || accCss) applyToCanvas(accHtml, accCss)
          } else if (event.type === 'error') {
            hadError = true
            setError(event.message ?? 'Generation failed')
          }
        } catch {
          // skip malformed line
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          processLine(line)
        }
      }

      if (buffer.trim()) {
        processLine(buffer)
      }

      if (!hadError) {
        const finalContent = assistantText || (accHtml ? '✓ Applied changes to canvas' : 'Done.')
        setMessages((prev) => [...prev, { role: 'assistant', content: finalContent }])
      }
    } catch (err) {
      hadError = true
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setError(msg)
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }])
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, csrfToken, provider, apiKey, getHtml, getCss, appendStreamText, resetStream, setIsStreaming, setError, applyToCanvas])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div data-testid="chat-panel" className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#333] flex-shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">AI Assistant</p>
        <button
          type="button"
          data-testid="chat-settings-toggle"
          aria-label="Toggle settings"
          onClick={() => setShowSettings((v) => !v)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ⚙ Settings
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div data-testid="chat-settings" className="px-3 py-2 border-b border-[#333] bg-[#1e1e1e] space-y-2 flex-shrink-0">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Provider</span>
            <select
              data-testid="chat-provider-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini (Google)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">API Key (optional)</span>
            <input
              data-testid="chat-api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Uses server key if blank"
              className="rounded bg-[#1a1a1a] border border-[#444] px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
            />
          </label>
        </div>
      )}

      {/* Messages */}
      <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && !isStreaming && (
          <p className="text-xs text-zinc-600 text-center mt-8">Describe what you want to build…</p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            data-testid={msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}
            className={`rounded px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
              msg.role === 'user'
                ? 'bg-violet-600/20 border border-violet-600/30 text-violet-200 ml-4'
                : 'bg-[#1e1e1e] border border-[#333] text-zinc-300 mr-4'
            }`}
          >
            {msg.content}
          </div>
        ))}

        {isStreaming && streamText && (
          <div
            data-testid="chat-streaming-text"
            className="rounded px-3 py-2 text-xs bg-[#1e1e1e] border border-[#333] text-zinc-300 mr-4 whitespace-pre-wrap leading-relaxed"
          >
            {streamText}
            <span className="animate-pulse text-violet-400">▌</span>
          </div>
        )}

        {isStreaming && !streamText && (
          <div data-testid="chat-streaming-indicator" className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 px-2 py-1.5 rounded bg-red-900/30 border border-red-700/50 flex-shrink-0">
          <p data-testid="chat-error" className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[#333] flex-shrink-0 space-y-2">
        <textarea
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your UI… (Enter to send)"
          rows={3}
          disabled={isStreaming}
          className="w-full resize-none rounded bg-[#1a1a1a] border border-[#444] px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
        />
        <button
          data-testid="chat-send-button"
          type="button"
          onClick={() => void handleSend()}
          disabled={isStreaming || !input.trim() || !isCsrfReady}
          className="w-full py-1.5 rounded text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isStreaming ? 'Generating…' : !isCsrfReady ? 'Preparing…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
