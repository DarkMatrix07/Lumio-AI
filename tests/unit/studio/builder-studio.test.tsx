import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import * as clientZip from '@/lib/export/client-zip'

const setHtml = vi.fn()
const setCss = vi.fn()
const stop = vi.fn()
const start = vi.fn()
const filterBlocks = vi.fn()
const addPage = vi.fn(() => 'page-2')
let mockCanvasHtml = '<main>Old</main>'
let mockCanvasCss = 'main{color:black;}'
const createObjectUrlSpy = vi.fn(() => 'blob:lumio')
const revokeObjectUrlSpy = vi.fn()
const previewWriteSpy = vi.fn()
const previewCloseSpy = vi.fn()
const previewFocusSpy = vi.fn()
const openWindowSpy = vi.fn(() => ({
  document: {
    write: previewWriteSpy,
    close: previewCloseSpy,
  },
  focus: previewFocusSpy,
}))

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const getPreviewSrcDoc = () => {
  const previewMarkup = String(previewWriteSpy.mock.calls[0]?.[0] ?? '')
  const match = previewMarkup.match(/srcdoc="([^"]*)"/)
  return decodeHtmlEntities(match?.[1] ?? '')
}

vi.mock('@/components/canvas/GrapesCanvas', () => ({
  GrapesCanvas: ({
    onEditorReady,
    rightPanelOpen = true,
    onToggleRightPanel,
  }: {
    onEditorReady?: (bridge: unknown) => void
    rightPanelOpen?: boolean
    onToggleRightPanel?: () => void
  }) => {
    const bridge = {
      getHtml: () => mockCanvasHtml,
      getCss: () => mockCanvasCss,
      setHtml,
      setCss,
      editor: {
        UndoManager: { stop, start },
      },
      undo: vi.fn(),
      redo: vi.fn(),
      setDevice: vi.fn(),
      getPages: () => [{ id: 'default', name: 'Home' }],
      addPage,
      selectPage: vi.fn(),
      removePage: vi.fn(),
      getSelectedPageId: () => 'default',
      filterBlocks,
    }

    return (
      <>
        <button data-testid="trigger-editor-ready" onClick={() => onEditorReady?.(bridge)} type="button">
          trigger
        </button>
        <button data-testid="builder-toggle-right-panel" onClick={onToggleRightPanel} type="button">
          toggle-right
        </button>
        {rightPanelOpen ? <div data-testid="builder-right-panel" /> : null}
      </>
    )
  },
}))

import { BuilderStudio } from '@/components/studio/BuilderStudio'
import { BUILDER_LAYOUT, BUILDER_TEST_IDS } from '@/components/studio/builder-layout'

beforeEach(() => {
  vi.restoreAllMocks()

  setHtml.mockClear()
  setCss.mockClear()
  stop.mockClear()
  start.mockClear()
  createObjectUrlSpy.mockClear()
  revokeObjectUrlSpy.mockClear()
  filterBlocks.mockClear()
  addPage.mockClear()
  previewWriteSpy.mockClear()
  previewCloseSpy.mockClear()
  previewFocusSpy.mockClear()
  openWindowSpy.mockClear()
  mockCanvasHtml = '<main>Old</main>'
  mockCanvasCss = 'main{color:black;}'

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.spyOn(window, 'open').mockImplementation(openWindowSpy as typeof window.open)
  vi.stubGlobal('URL', {
    createObjectURL: createObjectUrlSpy,
    revokeObjectURL: revokeObjectUrlSpy,
  })
})

describe('BuilderStudio', () => {
  test('shows error state when zip export fails', async () => {
    vi.spyOn(clientZip, 'buildProjectZip').mockRejectedValueOnce(new Error('zip failed'))

    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('builder-export-zip'))

    await waitFor(() => {
      expect(screen.getByTestId('builder-export-error')).toHaveTextContent('Export failed. Please try again.')
    })

    expect(createObjectUrlSpy).not.toHaveBeenCalled()
  })

  test('exports generated backend zip blob from studio action', async () => {
    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('builder-export-zip'))

    await waitFor(() => {
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    })

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:lumio')
  })

  test('renders canvas and chat panels', () => {
    render(<BuilderStudio />)

    expect(screen.getByTestId('builder-canvas-panel')).toBeDefined()
    expect(screen.getByTestId('builder-chat-panel')).toBeDefined()
    expect(screen.getByTestId('chat-panel')).toBeDefined()
  })

  test('keeps canvas and chat panels inside new workspace zones', () => {
    render(<BuilderStudio />)

    const primaryWorkspace = screen.getByTestId('builder-primary-workspace')
    const assistantWorkspace = screen.getByTestId('builder-assistant-workspace')
    const canvasPanel = screen.getByTestId('builder-canvas-panel')
    const chatPanel = screen.getByTestId('builder-chat-panel')

    expect(primaryWorkspace).toContainElement(canvasPanel)
    expect(assistantWorkspace).toContainElement(chatPanel)
  })

  test('exports builder layout and test id contracts', () => {
    expect(BUILDER_LAYOUT.commandRailWidth).toBe('w-12')
    expect(BUILDER_LAYOUT.assistantPanelWidth).toBe('w-80')
    expect(BUILDER_TEST_IDS.commandRail).toBe('builder-command-rail')
    expect(BUILDER_TEST_IDS.primaryWorkspace).toBe('builder-primary-workspace')
    expect(BUILDER_TEST_IDS.assistantWorkspace).toBe('builder-assistant-workspace')
  })

  test('keeps top bar actions visible after shell redesign', () => {
    render(<BuilderStudio />)

    expect(screen.getByTestId('builder-top-bar')).toBeDefined()
    expect(screen.getByTestId('builder-export-zip')).toBeDefined()
    expect(screen.getByTestId('builder-toggle-assistant')).toBeDefined()
    expect(screen.queryByTestId('builder-export-error')).toBeNull()
  })

  test('toggles AI assistant panel from top bar button', () => {
    render(<BuilderStudio />)

    const chatPanel = screen.getByTestId('builder-chat-panel')
    expect(chatPanel).toBeDefined()
    expect(chatPanel).toBeVisible()

    fireEvent.click(screen.getByTestId('builder-toggle-assistant'))
    expect(chatPanel).not.toBeVisible()

    fireEvent.click(screen.getByTestId('builder-toggle-assistant'))
    expect(chatPanel).toBeVisible()
  })

  test('opens full screen preview with current canvas HTML and CSS', () => {
    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))
    fireEvent.click(screen.getByTestId('builder-preview'))

    expect(openWindowSpy).toHaveBeenCalledWith('about:blank', '_blank')
    expect(openWindowSpy).toHaveBeenCalledTimes(1)
    expect(previewWriteSpy).toHaveBeenCalledTimes(1)
    const srcDoc = getPreviewSrcDoc()
    expect(srcDoc).toContain('<main>Old</main>')
    expect(srcDoc).toContain('main{color:black;}')
    expect(previewCloseSpy).toHaveBeenCalledTimes(1)
    expect(previewFocusSpy).toHaveBeenCalledTimes(1)
  })

  test('escapes potentially unsafe HTML before rendering preview', () => {
    mockCanvasHtml = '<img src=x onerror=alert(1)><script>alert(2)</script>'

    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))
    fireEvent.click(screen.getByTestId('builder-preview'))

    const srcDoc = getPreviewSrcDoc()
    expect(srcDoc).not.toContain('<script>alert(2)</script>')
    expect(srcDoc).not.toContain('onerror=alert(1)')
  })

  test('neutralizes style tag breaking payloads in preview CSS', () => {
    mockCanvasCss = 'body{color:red;} </style><script>alert(9)</script><style>'

    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))
    fireEvent.click(screen.getByTestId('builder-preview'))

    const srcDoc = getPreviewSrcDoc()
    expect(srcDoc).not.toContain('<script>alert(9)</script>')
    expect(srcDoc).toContain('<\\/style>')
  })

  test('shows preview blocked error when browser blocks preview tab', async () => {
    openWindowSpy.mockImplementationOnce(() => null)

    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))
    fireEvent.click(screen.getByTestId('builder-preview'))

    await waitFor(() => {
      expect(screen.getByTestId('builder-export-error')).toHaveTextContent('Preview blocked. Allow popups and try again.')
    })
    expect(openWindowSpy).toHaveBeenCalledWith('about:blank', '_blank')
    expect(previewWriteSpy).not.toHaveBeenCalled()
  })

  test('filters blocks when searching in Add panel', async () => {
    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))

    const search = screen.getByPlaceholderText('Search elements')
    fireEvent.change(search, { target: { value: 'hero' } })

    await waitFor(() => {
      expect(filterBlocks).toHaveBeenCalledWith('__add_only__:hero')
    })
  })

  test('clicking Add filters out template category', async () => {
    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))
    fireEvent.click(screen.getByTitle('Templates'))

    await waitFor(() => {
      expect(filterBlocks).toHaveBeenCalledWith('__templates_only__')
    })

    fireEvent.click(screen.getByTitle('Add'))

    await waitFor(() => {
      expect(filterBlocks).toHaveBeenLastCalledWith('__add_only__')
    })
  })

  test('clicking Templates filters to template category only', async () => {
    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))
    fireEvent.click(screen.getByTitle('Templates'))

    await waitFor(() => {
      expect(filterBlocks).toHaveBeenCalledWith('__templates_only__')
    })
  })

  test('clicking New Page delegates to editor bridge addPage', () => {
    render(<BuilderStudio />)

    fireEvent.click(screen.getByTestId('trigger-editor-ready'))
    fireEvent.click(screen.getByTitle('Pages'))
    fireEvent.click(screen.getByText('+ New Page'))

    expect(addPage).toHaveBeenCalledTimes(1)
    expect(addPage).toHaveBeenCalledWith('Page 2')
  })

  test('toggles right properties panel visibility from settings button', () => {
    render(<BuilderStudio />)

    expect(screen.getByTestId('builder-right-panel')).toBeDefined()

    fireEvent.click(screen.getByTestId('builder-toggle-right-panel'))
    expect(screen.queryByTestId('builder-right-panel')).toBeNull()

    fireEvent.click(screen.getByTestId('builder-toggle-right-panel'))
    expect(screen.getByTestId('builder-right-panel')).toBeDefined()
  })
})
