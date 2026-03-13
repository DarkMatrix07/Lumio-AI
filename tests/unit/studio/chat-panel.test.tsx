import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ChatPanel } from '@/components/studio/ChatPanel'
import { useAiChatStore } from '@/store/ai-chat-store'

const mockEditor = {
  UndoManager: { stop: vi.fn(), start: vi.fn() },
}

const makeBridge = () => ({
  getHtml: vi.fn(() => '<div>existing</div>'),
  getCss: vi.fn(() => 'div{color:red;}'),
  setHtml: vi.fn(),
  setCss: vi.fn(),
  editor: mockEditor,
})

// Helper: build a minimal NDJSON streaming body
const makeStreamBody = (lines: object[]) => {
  const text = lines.map((l) => JSON.stringify(l)).join('\n') + '\n'
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })
}

beforeEach(() => {
  useAiChatStore.getState().reset()
  vi.restoreAllMocks()

  // Default: csrf-token returns a token
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/csrf-token') {
        return new Response(JSON.stringify({ token: 'test-csrf-xyz' }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 })
    }),
  )
})

describe('ChatPanel', () => {
  test('renders input and send button', () => {
    render(<ChatPanel {...makeBridge()} />)

    expect(screen.getByTestId('chat-input')).toBeDefined()
    expect(screen.getByTestId('chat-send-button')).toBeDefined()
  })

  test('send button is disabled when input is empty', () => {
    render(<ChatPanel {...makeBridge()} />)

    const btn = screen.getByTestId('chat-send-button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  test('send button enables after typing', async () => {
    render(<ChatPanel {...makeBridge()} />)

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Add a navbar' } })

    await waitFor(() => {
      const btn = screen.getByTestId('chat-send-button') as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })
  })

  test('settings toggle shows and hides settings panel', async () => {
    render(<ChatPanel {...makeBridge()} />)

    expect(screen.queryByTestId('chat-settings')).toBeNull()

    fireEvent.click(screen.getByTestId('chat-settings-toggle'))
    expect(screen.getByTestId('chat-settings')).toBeDefined()

    fireEvent.click(screen.getByTestId('chat-settings-toggle'))
    expect(screen.queryByTestId('chat-settings')).toBeNull()
  })

  test('provider select has all three options', async () => {
    render(<ChatPanel {...makeBridge()} />)

    fireEvent.click(screen.getByTestId('chat-settings-toggle'))

    const select = screen.getByTestId('chat-provider-select') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.value)
    expect(options).toContain('claude')
    expect(options).toContain('openai')
    expect(options).toContain('gemini')
  })

  test('shows user message after send and assistant reply after stream completes', async () => {
    const bridge = makeBridge()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/csrf-token') {
          return new Response(JSON.stringify({ token: 'tok' }), { status: 200 })
        }

        if (url === '/api/generate') {
          return new Response(
            makeStreamBody([
              { type: 'text', value: 'Here is your navbar.' },
              { type: 'html', value: '<nav>Nav</nav>' },
              { type: 'css', value: 'nav{display:flex;}' },
              { type: 'done' },
            ]),
            { status: 200 },
          )
        }

        return new Response('{}', { status: 500 })
      }),
    )

    render(<ChatPanel {...bridge} />)

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Add a navbar' } })
    await waitFor(() => {
      expect((screen.getByTestId('chat-send-button') as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(screen.getByTestId('chat-send-button'))

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-user')).toBeDefined()
    })

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-assistant')).toBeDefined()
    })

    expect(screen.getByTestId('chat-message-user').textContent).toBe('Add a navbar')
  })

  test('applies html and css to canvas on done event', async () => {
    const bridge = makeBridge()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/csrf-token') {
          return new Response(JSON.stringify({ token: 'tok' }), { status: 200 })
        }

        if (url === '/api/generate') {
          return new Response(
            makeStreamBody([
              { type: 'html', value: '<nav>Nav</nav>' },
              { type: 'css', value: 'nav{display:flex;}' },
              { type: 'done' },
            ]),
            { status: 200 },
          )
        }

        return new Response('{}', { status: 500 })
      }),
    )

    render(<ChatPanel {...bridge} />)

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Add a navbar' } })
    await waitFor(() => {
      expect((screen.getByTestId('chat-send-button') as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(screen.getByTestId('chat-send-button'))

    await waitFor(() => {
      expect(bridge.setHtml).toHaveBeenCalled()
    })

    expect(bridge.setCss).toHaveBeenCalled()
  })

  test('shows error message when generation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/csrf-token') {
          return new Response(JSON.stringify({ token: 'tok' }), { status: 200 })
        }

        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
      }),
    )

    render(<ChatPanel {...makeBridge()} />)

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Add something' } })

    await waitFor(() => {
      expect((screen.getByTestId('chat-send-button') as HTMLButtonElement).disabled).toBe(false)
    })

    fireEvent.click(screen.getByTestId('chat-send-button'))
    await waitFor(() => {
      expect(screen.getByTestId('chat-error')).toBeDefined()
    })
  })

  test('enter key submits, shift+enter does not', async () => {
    const bridge = makeBridge()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/csrf-token') return new Response(JSON.stringify({ token: 'tok' }), { status: 200 })
        return new Response(makeStreamBody([{ type: 'done' }]), { status: 200 })
      }),
    )

    render(<ChatPanel {...bridge} />)

    const textarea = screen.getByTestId('chat-input')
    fireEvent.change(textarea, { target: { value: 'Test prompt' } })

    await waitFor(() => {
      expect((screen.getByTestId('chat-send-button') as HTMLButtonElement).disabled).toBe(false)
    })

    // Shift+Enter should NOT submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(screen.queryByTestId('chat-message-user')).toBeNull()

    // Enter without shift SHOULD submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    await waitFor(() => {
      expect(screen.getByTestId('chat-message-user')).toBeDefined()
    })
  })
})
