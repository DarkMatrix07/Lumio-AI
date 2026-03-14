import { describe, expect, test } from 'vitest'

import { generateBackendFiles } from '@/lib/backend/codegen'
import type { LumioBackendGraph } from '@/types/lumio'

describe('generateBackendFiles', () => {
  test('returns prisma schema, route handlers, auth helper, and middleware stubs', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'model-user', type: 'Model', label: 'User', config: { model: 'User' } },
        { id: 'get-users', type: 'GET', label: 'GET /users', config: { path: '/users' } },
        { id: 'post-users', type: 'POST', label: 'POST /users', config: { path: '/users' } },
        { id: 'jwt-1', type: 'JWT', label: 'JWT', config: {} },
        { id: 'cors-1', type: 'CORS', label: 'CORS', config: {} },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)

    expect(files['prisma/schema.prisma']).toContain('model User')
    expect(files['app/api/users/route.ts']).toContain('export async function GET')
    expect(files['app/api/users/route.ts']).toContain('export async function POST')
    expect(files['lib/auth/jwt.ts']).toContain('signJwt')
    expect(files['middleware.ts']).toContain('CORS middleware')
    expect(files['middleware.ts']).toContain("import { NextResponse } from 'next/server'")
    expect(files['middleware.ts']).toContain('return NextResponse.next()')
  })

  test('strips leading /api/ prefix so routes are not double-prefixed', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'get-1', type: 'GET', label: 'GET /api/users', config: { path: '/api/users' } },
        { id: 'post-1', type: 'POST', label: 'POST /api/posts', config: { path: '/api/posts' } },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)

    expect(files['app/api/users/route.ts']).toBeDefined()
    expect(files['app/api/posts/route.ts']).toBeDefined()
    expect(files['app/api/api/users/route.ts']).toBeUndefined()
    expect(files['app/api/api/posts/route.ts']).toBeUndefined()
  })

  test('omits jwt helper when no JWT node present', () => {
    const graph: LumioBackendGraph = {
      nodes: [{ id: 'get-1', type: 'GET', label: 'GET /items', config: { path: '/items' } }],
      edges: [],
    }

    const files = generateBackendFiles(graph)

    expect(files['lib/auth/jwt.ts']).toBeUndefined()
  })

  test('includes jwt helper only when JWT node is present', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'get-1', type: 'GET', label: 'GET /items', config: { path: '/items' } },
        { id: 'jwt-1', type: 'JWT', label: 'JWT', config: {} },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)

    expect(files['lib/auth/jwt.ts']).toContain('signJwt')
    expect(files['lib/auth/jwt.ts']).toContain('verifyJwt')
  })

  test('deduplicates model names in prisma schema', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'model-1', type: 'Model', label: 'User', config: { model: 'User' } },
        { id: 'model-2', type: 'Model', label: 'User duplicate', config: { model: 'User' } },
        { id: 'model-3', type: 'Model', label: 'Post', config: { model: 'Post' } },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)
    const schema = files['prisma/schema.prisma']

    const userMatches = (schema.match(/^model User \{/gm) ?? []).length
    expect(userMatches).toBe(1)
    expect(schema).toContain('model Post')
  })

  test('skips invalid prisma model identifiers instead of emitting broken schema', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'model-valid', type: 'Model', label: 'Order', config: { model: 'Order' } },
        { id: 'model-space', type: 'Model', label: 'Broken Name', config: { model: 'Broken Name' } },
        { id: 'model-digit', type: 'Model', label: '123User', config: { model: '123User' } },
        { id: 'model-symbol', type: 'Model', label: 'Admin-User', config: { model: 'Admin-User' } },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)
    const schema = files['prisma/schema.prisma']

    expect(schema).toContain('model Order')
    expect(schema).not.toContain('model Broken Name')
    expect(schema).not.toContain('model 123User')
    expect(schema).not.toContain('model Admin-User')
  })

  test('handles empty graph gracefully', () => {
    const graph: LumioBackendGraph = { nodes: [], edges: [] }

    const files = generateBackendFiles(graph)

    expect(files['prisma/schema.prisma']).toContain('datasource db')
    expect(files['middleware.ts']).toBeDefined()
    expect(files['lib/auth/jwt.ts']).toBeUndefined()
    expect(files['lib/auth/api-key.ts']).toBeUndefined()
  })

  test('conditionally generates auth helpers for ApiKey, OAuth, and Session nodes while preserving JWT behavior', () => {
    const graph = {
      nodes: [
        { id: 'jwt-1', type: 'JWT', label: 'JWT', config: {} },
        { id: 'api-key-1', type: 'ApiKey', label: 'API Key', config: {} },
        { id: 'oauth-1', type: 'OAuth', label: 'OAuth', config: {} },
        { id: 'session-1', type: 'Session', label: 'Session', config: {} },
      ],
      edges: [],
    } as LumioBackendGraph

    const files = generateBackendFiles(graph)

    expect(files['lib/auth/jwt.ts']).toContain('signJwt')
    expect(files['lib/auth/jwt.ts']).toContain('verifyJwt')
    expect(files['lib/auth/api-key.ts']).toContain('validateApiKey')
    expect(files['lib/auth/oauth.ts']).toContain('exchangeOAuthCode')
    expect(files['lib/auth/session.ts']).toContain('createSession')
  })

  test('generates explicit auth TODO stubs instead of permissive auth implementations', () => {
    const graph = {
      nodes: [
        { id: 'jwt-1', type: 'JWT', label: 'JWT', config: {} },
        { id: 'api-key-1', type: 'ApiKey', label: 'API Key', config: {} },
        { id: 'oauth-1', type: 'OAuth', label: 'OAuth', config: {} },
        { id: 'session-1', type: 'Session', label: 'Session', config: {} },
      ],
      edges: [],
    } as LumioBackendGraph

    const files = generateBackendFiles(graph)

    expect(files['lib/auth/jwt.ts']).toContain('TODO: implement secure JWT signing before production use')
    expect(files['lib/auth/jwt.ts']).not.toContain('return JSON.stringify(payload)')
    expect(files['lib/auth/api-key.ts']).toContain('TODO: implement API key validation before production use')
    expect(files['lib/auth/api-key.ts']).not.toContain('return Boolean(apiKey.trim())')
    expect(files['lib/auth/oauth.ts']).toContain('TODO: implement OAuth code exchange before production use')
    expect(files['lib/auth/oauth.ts']).not.toContain('accessToken: code.trim() || null')
    expect(files['lib/auth/session.ts']).toContain('TODO: implement secure session creation before production use')
    expect(files['lib/auth/session.ts']).not.toContain("sessionId: subject || 'session-stub'")
  })

  test('emits explicit generated stubs for logic nodes instead of silently ignoring them', () => {
    const graph = {
      nodes: [
        { id: 'validation-1', type: 'Validation', label: 'Request Validation', config: { schema: 'userSchema' } },
        { id: 'if-else-1', type: 'IfElse', label: 'Branch', config: { condition: 'request.method === "POST"' } },
        { id: 'loop-1', type: 'Loop', label: 'Loop Items', config: { source: 'items' } },
        { id: 'try-catch-1', type: 'TryCatch', label: 'Try Catch', config: {} },
      ],
      edges: [],
    } as LumioBackendGraph

    const files = generateBackendFiles(graph)
    const logicFile = files['lib/backend/logic.ts']

    expect(logicFile).toContain('Generated backend logic stubs')
    expect(logicFile).toContain('Validation node validation-1')
    expect(logicFile).toContain('IfElse node if-else-1')
    expect(logicFile).toContain('Loop node loop-1')
    expect(logicFile).toContain('TryCatch node try-catch-1')
  })

  test('includes configured middleware nodes as TODO summaries in middleware output', () => {
    const graph = {
      nodes: [
        { id: 'cors-1', type: 'CORS', label: 'CORS', config: { origin: 'https://example.com' } },
        { id: 'rate-limit-1', type: 'RateLimit', label: 'Rate Limit', config: { limit: 100, windowMs: 60000 } },
        { id: 'logger-1', type: 'Logger', label: 'Logger', config: { level: 'info' } },
        { id: 'custom-middleware-1', type: 'CustomMiddleware', label: 'Audit Middleware', config: { name: 'auditTrail' } },
      ],
      edges: [],
    } as LumioBackendGraph

    const files = generateBackendFiles(graph)
    const middleware = files['middleware.ts']

    expect(middleware).toContain('CORS middleware TODO: implement enforcement')
    expect(middleware).toContain('RateLimit middleware TODO: implement enforcement')
    expect(middleware).toContain('Logger middleware TODO: implement enforcement')
    expect(middleware).toContain('Custom middleware TODO: auditTrail')
  })

  test('uses TODO wording for middleware summaries when no concrete enforcement is generated', () => {
    const graph = {
      nodes: [
        { id: 'cors-1', type: 'CORS', label: 'CORS', config: { origin: 'https://example.com' } },
        { id: 'rate-limit-1', type: 'RateLimit', label: 'Rate Limit', config: { limit: 100, windowMs: 60000 } },
        { id: 'logger-1', type: 'Logger', label: 'Logger', config: { level: 'info' } },
        { id: 'custom-middleware-1', type: 'CustomMiddleware', label: 'Audit Middleware', config: { name: 'auditTrail' } },
      ],
      edges: [],
    } as LumioBackendGraph

    const files = generateBackendFiles(graph)
    const middleware = files['middleware.ts']

    expect(middleware).toContain('CORS middleware TODO: implement enforcement')
    expect(middleware).toContain('RateLimit middleware TODO: implement enforcement')
    expect(middleware).toContain('Logger middleware TODO: implement enforcement')
    expect(middleware).toContain('Custom middleware TODO: auditTrail')
    expect(middleware).not.toContain('CORS middleware: enabled')
    expect(middleware).not.toContain('RateLimit middleware: enabled')
    expect(middleware).not.toContain('Logger middleware: enabled')
    expect(middleware).not.toContain('Custom middleware: auditTrail')
  })

  test('omits invalid prisma models and unsafe custom middleware names from generated files', () => {
    const graph = {
      nodes: [
        { id: 'model-valid', type: 'Model', label: 'Order', config: { model: 'Order' } },
        { id: 'model-reserved', type: 'Model', label: 'Type', config: { model: 'Type' } },
        {
          id: 'custom-middleware-unsafe',
          type: 'CustomMiddleware',
          label: 'Unsafe Middleware',
          config: { name: 'auditTrail\nexport const injected = true' },
        },
      ],
      edges: [],
    } as LumioBackendGraph

    const files = generateBackendFiles(graph)
    const schema = files['prisma/schema.prisma']
    const middleware = files['middleware.ts']

    expect(schema).toContain('model Order')
    expect(schema).not.toContain('model Type')
    expect(middleware).toContain('Custom middleware not configured')
    expect(middleware).not.toContain('export const injected = true')
  })

  test('generates deterministic prisma and route output for reordered equivalent graphs', () => {
    const graphA = {
      nodes: [
        { id: 'model-z', type: 'Model', label: 'Zebra', config: { model: 'Zebra' } },
        { id: 'get-users', type: 'GET', label: 'GET /users', config: { path: '/users' } },
        { id: 'model-a', type: 'Model', label: 'Account', config: { model: 'Account' } },
        { id: 'post-projects', type: 'POST', label: 'POST /projects', config: { path: '/projects' } },
      ],
      edges: [],
    } as LumioBackendGraph

    const graphB = {
      nodes: [
        { id: 'post-projects', type: 'POST', label: 'POST /projects', config: { path: '/projects' } },
        { id: 'model-a', type: 'Model', label: 'Account', config: { model: 'Account' } },
        { id: 'get-users', type: 'GET', label: 'GET /users', config: { path: '/users' } },
        { id: 'model-z', type: 'Model', label: 'Zebra', config: { model: 'Zebra' } },
      ],
      edges: [],
    } as LumioBackendGraph

    const filesA = generateBackendFiles(graphA)
    const filesB = generateBackendFiles(graphB)

    expect(filesA['prisma/schema.prisma']).toBe(filesB['prisma/schema.prisma'])
    expect(Object.keys(filesA).sort()).toEqual(Object.keys(filesB).sort())
    expect(filesA['app/api/projects/route.ts']).toBe(filesB['app/api/projects/route.ts'])
    expect(filesA['app/api/users/route.ts']).toBe(filesB['app/api/users/route.ts'])
  })

  test('generates deterministic logic stub output for reordered equivalent graphs', () => {
    const graphA = {
      nodes: [
        { id: 'loop-1', type: 'Loop', label: 'Loop', config: { source: 'items' } },
        { id: 'validation-1', type: 'Validation', label: 'Validate', config: { schema: 'userSchema' } },
        { id: 'try-catch-1', type: 'TryCatch', label: 'Try Catch', config: {} },
        { id: 'if-else-1', type: 'IfElse', label: 'Branch', config: { condition: 'flag' } },
      ],
      edges: [],
    } as LumioBackendGraph

    const graphB = {
      nodes: [
        { id: 'if-else-1', type: 'IfElse', label: 'Branch', config: { condition: 'flag' } },
        { id: 'try-catch-1', type: 'TryCatch', label: 'Try Catch', config: {} },
        { id: 'validation-1', type: 'Validation', label: 'Validate', config: { schema: 'userSchema' } },
        { id: 'loop-1', type: 'Loop', label: 'Loop', config: { source: 'items' } },
      ],
      edges: [],
    } as LumioBackendGraph

    const filesA = generateBackendFiles(graphA)
    const filesB = generateBackendFiles(graphB)

    expect(filesA['lib/backend/logic.ts']).toBe(filesB['lib/backend/logic.ts'])
  })

  test('skips route nodes with missing or empty path', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'get-no-path', type: 'GET', label: 'GET (no path)', config: {} },
        { id: 'post-empty', type: 'POST', label: 'POST (empty)', config: { path: '' } },
        { id: 'get-valid', type: 'GET', label: 'GET /ok', config: { path: '/ok' } },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)

    expect(files['app/api/ok/route.ts']).toBeDefined()
    const routeFiles = Object.keys(files).filter((k) => k.startsWith('app/api/'))
    expect(routeFiles).toHaveLength(1)
  })

  test('converts colon route params into Next app router segments', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'get-user', type: 'GET', label: 'GET /users/:id', config: { path: '/users/:id' } },
        { id: 'patch-comment', type: 'PATCH', label: 'PATCH /posts/:postId/comments/:commentId', config: { path: '/posts/:postId/comments/:commentId' } },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)

    expect(files['app/api/users/[id]/route.ts']).toContain('GET /users/[id] stub')
    expect(files['app/api/posts/[postId]/comments/[commentId]/route.ts']).toContain(
      'PATCH /posts/[postId]/comments/[commentId] stub',
    )
    expect(files['app/api/users/:id/route.ts']).toBeUndefined()
    expect(files['app/api/posts/:postId/comments/:commentId/route.ts']).toBeUndefined()
  })

  test('skips unsupported route path syntax instead of generating invalid route files', () => {
    const graph: LumioBackendGraph = {
      nodes: [
        {
          id: 'get-unsupported',
          type: 'GET',
          label: 'GET /posts/:postId-edit',
          config: { path: '/posts/:postId-edit' },
        },
      ],
      edges: [],
    }

    const files = generateBackendFiles(graph)

    expect(files['app/api/posts/[postId]-edit/route.ts']).toBeUndefined()
    const routeFiles = Object.keys(files).filter((k) => k.startsWith('app/api/'))
    expect(routeFiles).toHaveLength(0)
  })
})
