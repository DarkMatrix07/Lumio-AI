import { describe, expect, test } from 'vitest'

import {
  BACKEND_PALETTE_ITEMS,
  BACKEND_PALETTE_SECTIONS,
  createBackendPaletteNode,
} from '@/components/studio/backend-palette'

describe('backend-palette', () => {
  test('exports grouped sections for backend palette metadata', () => {
    expect(BACKEND_PALETTE_SECTIONS).toEqual([
      'Endpoints',
      'Data',
      'Security',
      'Logic',
      'Middleware',
      'Templates',
    ])
  })

  test('creates backend nodes deterministically with cloned config and sane defaults', () => {
    const getItem = BACKEND_PALETTE_ITEMS.find((item) => item.type === 'GET')

    expect(getItem).toBeDefined()

    const getNode = createBackendPaletteNode(getItem!, 'get-node-1')

    expect(getNode).toEqual({
      id: 'get-node-1',
      type: 'GET',
      label: 'GET',
      config: { path: '/resource' },
    })

    ;(getNode.config as { path: string }).path = '/changed'

    const freshGetNode = createBackendPaletteNode(getItem!, 'get-node-2')
    expect(freshGetNode).toEqual({
      id: 'get-node-2',
      type: 'GET',
      label: 'GET',
      config: { path: '/resource' },
    })
  })

  test('covers all new backend palette items and their expected defaults', () => {
    const expectedItems = [
      { type: 'ApiKey', id: 'api-key-1', label: 'API Key', config: { headerName: 'x-api-key' } },
      { type: 'OAuth', id: 'oauth-1', label: 'OAuth', config: { provider: 'github' } },
      { type: 'Session', id: 'session-1', label: 'Session', config: { secretEnv: 'SESSION_SECRET' } },
      { type: 'IfElse', id: 'if-else-1', label: 'If / Else', config: { condition: 'true' } },
      { type: 'Loop', id: 'loop-1', label: 'Loop', config: { iterable: 'items' } },
      { type: 'TryCatch', id: 'try-catch-1', label: 'Try / Catch', config: { tryLabel: 'main' } },
      { type: 'Validation', id: 'validation-1', label: 'Validation', config: { schema: 'bodySchema' } },
    ] as const

    for (const expectedItem of expectedItems) {
      const paletteItem = BACKEND_PALETTE_ITEMS.find((item) => item.type === expectedItem.type)

      expect(paletteItem).toBeDefined()
      expect(createBackendPaletteNode(paletteItem!, expectedItem.id)).toEqual({
        id: expectedItem.id,
        type: expectedItem.type,
        label: expectedItem.label,
        config: expectedItem.config,
      })
    }
  })
})
