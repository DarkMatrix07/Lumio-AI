import { describe, expect, test } from 'vitest'

import { validateBackendGraph } from '@/lib/backend/graph-validator'
import type { LumioBackendGraph } from '@/types/lumio'

describe('validateBackendGraph', () => {
  test('reports missing path, model, and env var key', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'n1', type: 'GET', label: 'GET /users', config: {} },
        { id: 'n2', type: 'Model', label: 'User', config: {} },
        { id: 'n3', type: 'EnvVar', label: 'DATABASE_URL', config: {} },
      ],
      edges: [],
    }

    const errors = validateBackendGraph(graph)

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('GET node n1 is missing config.path'),
        expect.stringContaining('Model node n2 is missing config.model'),
        expect.stringContaining('EnvVar node n3 is missing config.key'),
      ]),
    )
  })

  test('reports missing CustomMiddleware name and RateLimit limit/windowMs', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'cm1', type: 'CustomMiddleware', label: 'My Middleware', config: {} },
        { id: 'rl1', type: 'RateLimit', label: 'Rate Limiter', config: {} },
      ],
      edges: [],
    }

    const errors = validateBackendGraph(graph)

    expect(errors).toContain('CustomMiddleware node cm1 is missing config.name')
    expect(errors).toContain('RateLimit node rl1 is missing config.limit')
    expect(errors).toContain('RateLimit node rl1 is missing config.windowMs')
  })

  test('reports invalid relation model references', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'm1', type: 'Model', label: 'User', config: { model: 'User' } },
        { id: 'get1', type: 'GET', label: 'GET /users', config: { path: '/users' } },
        {
          id: 'r1',
          type: 'Relation',
          label: 'UserToOrder',
          config: { fromModelId: 'm1', toModelId: 'missing-model' },
        },
        {
          id: 'r2',
          type: 'Relation',
          label: 'WrongTypeRelation',
          config: { fromModelId: 'm1', toModelId: 'get1' },
        },
      ],
      edges: [],
    }

    const errors = validateBackendGraph(graph)

    expect(errors).toContain('Relation node r1 references unknown toModelId missing-model')
    expect(errors).toContain('Relation node r2 requires toModelId get1 to reference a Model node')
  })
})
