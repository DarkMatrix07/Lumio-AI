import { describe, expect, test } from 'vitest'

import { validateLumioContract } from '@/lib/ai/contract'

describe('validateLumioContract', () => {
  test('rejects payload when version is missing', () => {
    const result = validateLumioContract({
      frontend: { html: '<main />', css: '' },
      backendGraph: { nodes: [], edges: [] },
    })

    expect(result.success).toBe(false)
  })

  test('rejects payload with invalid node type', () => {
    const result = validateLumioContract({
      version: '1.0.0',
      frontend: { html: '<main />', css: '' },
      backendGraph: {
        nodes: [
          {
            id: 'node-1',
            type: 'invalid-node',
            label: 'Broken',
            config: {},
          },
        ],
        edges: [],
      },
    })

    expect(result.success).toBe(false)
  })

  test('rejects template node without templateKind', () => {
    const result = validateLumioContract({
      version: '1.0.0',
      frontend: { html: '<main />', css: '' },
      backendGraph: {
        nodes: [
          {
            id: 'template-1',
            type: 'Template',
            label: 'Template',
            config: {},
          },
        ],
        edges: [],
      },
    })

    expect(result.success).toBe(false)
  })

  test('rejects edge references to unknown nodes', () => {
    const result = validateLumioContract({
      version: '1.0.0',
      frontend: { html: '<main />', css: '' },
      backendGraph: {
        nodes: [
          {
            id: 'model-1',
            type: 'model',
            label: 'User',
            config: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'model-1',
            target: 'missing-node',
          },
        ],
      },
    })

    expect(result.success).toBe(false)
  })

  test('accepts valid contract payload', () => {
    const result = validateLumioContract({
      version: '1.0.0',
      frontend: { html: '<main>Hello</main>', css: 'main{color:red;}' },
      backendGraph: {
        nodes: [
          {
            id: 'template-1',
            type: 'Template',
            label: 'Auth Template',
            config: { templateKind: 'AuthSystem' },
          },
        ],
        edges: [],
      },
    })

    expect(result.success).toBe(true)
  })
})
