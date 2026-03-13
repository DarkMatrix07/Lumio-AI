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
    // must NOT produce double-prefixed keys
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

  test('handles empty graph gracefully', () => {
    const graph: LumioBackendGraph = { nodes: [], edges: [] }

    const files = generateBackendFiles(graph)

    expect(files['prisma/schema.prisma']).toContain('datasource db')
    expect(files['middleware.ts']).toBeDefined()
    expect(files['lib/auth/jwt.ts']).toBeUndefined()
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
    // only one route file should exist
    const routeFiles = Object.keys(files).filter((k) => k.startsWith('app/api/'))
    expect(routeFiles).toHaveLength(1)
  })
})
