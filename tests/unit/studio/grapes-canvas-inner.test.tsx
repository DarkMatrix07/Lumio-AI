import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { initSpy, destroySpy } = vi.hoisted(() => ({
  initSpy: vi.fn(),
  destroySpy: vi.fn(),
}))

vi.mock('grapesjs', () => ({
  default: {
    init: initSpy,
  },
}))

vi.mock('@/lib/canvas/editor-sync-bridge', () => ({
  bindEditorSyncBridge: vi.fn(() => () => {}),
}))

import GrapesCanvasInner from '@/components/canvas/GrapesCanvasInner'

describe('GrapesCanvasInner', () => {
  beforeEach(() => {
    initSpy.mockReset()
    destroySpy.mockReset()

    initSpy.mockReturnValue({
      getHtml: () => '<main />',
      getCss: () => '',
      setComponents: vi.fn(),
      setStyle: vi.fn(),
      runCommand: vi.fn(),
      setDevice: vi.fn(),
      Pages: undefined,
      BlockManager: {
        getAll: () => ({ models: [] }),
        render: vi.fn(),
      },
      destroy: destroySpy,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('initializes GrapesJS with inline style editing enabled for Design tab changes', async () => {
    const blocksContainer = document.createElement('div')
    const layersContainer = document.createElement('div')

    render(
      <GrapesCanvasInner
        blocksContainer={blocksContainer}
        layersContainer={layersContainer}
      />,
    )

    await waitFor(() => {
      expect(initSpy).toHaveBeenCalledTimes(1)
    })

    expect(initSpy.mock.calls[0][0]).toMatchObject({
      avoidInlineStyle: false,
    })
  })
})
