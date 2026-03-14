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

  test('reports invalid RateLimit values when they are not positive integers', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'rl1', type: 'RateLimit', label: 'Rate Limiter', config: { limit: 0, windowMs: -1 } },
        { id: 'rl2', type: 'RateLimit', label: 'Rate Limiter 2', config: { limit: 'abc', windowMs: 12.5 } },
      ],
      edges: [],
    }

    const errors = validateBackendGraph(graph)

    expect(errors).toEqual(
      expect.arrayContaining([
        'RateLimit node rl1 has invalid config.limit 0',
        'RateLimit node rl1 has invalid config.windowMs -1',
        'RateLimit node rl2 has invalid config.limit abc',
        'RateLimit node rl2 has invalid config.windowMs 12.5',
      ]),
    )
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

  test('reports missing required config for new backend node types', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'api1', type: 'ApiKey', label: 'API Key', config: {} },
        { id: 'oauth1', type: 'OAuth', label: 'OAuth', config: {} },
        { id: 'session1', type: 'Session', label: 'Session', config: {} },
        { id: 'if1', type: 'IfElse', label: 'If / Else', config: {} },
        { id: 'loop1', type: 'Loop', label: 'Loop', config: {} },
        { id: 'try1', type: 'TryCatch', label: 'Try / Catch', config: {} },
        { id: 'validation1', type: 'Validation', label: 'Validation', config: {} },
      ],
      edges: [],
    }

    const errors = validateBackendGraph(graph)

    expect(errors).toEqual(
      expect.arrayContaining([
        'ApiKey node api1 is missing config.headerName',
        'OAuth node oauth1 is missing config.provider',
        'Session node session1 is missing config.secretEnv',
        'IfElse node if1 is missing config.condition',
        'Loop node loop1 is missing config.iterable',
        'TryCatch node try1 is missing config.tryLabel',
        'Validation node validation1 is missing config.schema',
      ]),
    )
  })

  test('accepts valid config for new backend node types', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'api1', type: 'ApiKey', label: 'API Key', config: { headerName: 'x-api-key' } },
        { id: 'oauth1', type: 'OAuth', label: 'OAuth', config: { provider: 'github' } },
        { id: 'session1', type: 'Session', label: 'Session', config: { secretEnv: 'SESSION_SECRET' } },
        { id: 'if1', type: 'IfElse', label: 'If / Else', config: { condition: 'request.user != null' } },
        { id: 'loop1', type: 'Loop', label: 'Loop', config: { iterable: 'items' } },
        { id: 'try1', type: 'TryCatch', label: 'Try / Catch', config: { tryLabel: 'main' } },
        { id: 'validation1', type: 'Validation', label: 'Validation', config: { schema: 'bodySchema' } },
      ],
      edges: [],
    }

    expect(validateBackendGraph(graph)).toEqual([])
  })

  test('reports invalid prisma model identifiers and unsupported route segment syntax', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'model1', type: 'Model', label: 'Broken Name', config: { model: 'Broken Name' } },
        { id: 'get1', type: 'GET', label: 'GET /posts/:postId-edit', config: { path: '/posts/:postId-edit' } },
      ],
      edges: [],
    }

    const errors = validateBackendGraph(graph)

    expect(errors).toEqual(
      expect.arrayContaining([
        'Model node model1 has invalid config.model Broken Name',
        'GET node get1 has unsupported config.path /posts/:postId-edit',
      ]),
    )
  })

  test('reports reserved prisma model names and unsafe custom middleware names', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'model-reserved', type: 'Model', label: 'Type', config: { model: 'Type' } },
        {
          id: 'middleware-unsafe',
          type: 'CustomMiddleware',
          label: 'Audit',
          config: { name: 'auditTrail\nexport const injected = true' },
        },
      ],
      edges: [],
    }

    const errors = validateBackendGraph(graph)

    expect(errors).toEqual(
      expect.arrayContaining([
        'Model node model-reserved has invalid config.model Type',
        'CustomMiddleware node middleware-unsafe has invalid config.name auditTrail\nexport const injected = true',
      ]),
    )
  })
})
