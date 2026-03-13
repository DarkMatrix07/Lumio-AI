import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import * as clientZip from '@/lib/export/client-zip'

const setHtml = vi.fn()
const setCss = vi.fn()
const stop = vi.fn()
const start = vi.fn()
const createObjectUrlSpy = vi.fn(() => 'blob:lumio')
const revokeObjectUrlSpy = vi.fn()

vi.mock('@/components/canvas/GrapesCanvas', () => ({
  GrapesCanvas: ({ onEditorReady }: { onEditorReady?: (bridge: unknown) => void }) => {
    const bridge = {
      getHtml: () => '<main>Old</main>',
      getCss: () => 'main{color:black;}',
      setHtml,
      setCss,
      editor: {
        UndoManager: { stop, start },
      },
    }

    return (
      <button data-testid="trigger-editor-ready" onClick={() => onEditorReady?.(bridge)} type="button">
        trigger
      </button>
    )
  },
}))

import { BuilderStudio } from '@/components/studio/BuilderStudio'

beforeEach(() => {
  vi.restoreAllMocks()

  setHtml.mockClear()
  setCss.mockClear()
  stop.mockClear()
  start.mockClear()
  createObjectUrlSpy.mockClear()
  revokeObjectUrlSpy.mockClear()

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
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
})
