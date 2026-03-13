import JSZip from 'jszip'
import { afterEach, describe, expect, test } from 'vitest'

import { generateBackendFiles } from '@/lib/backend/codegen'
import { buildExportFilename, buildProjectZip } from '@/lib/export/client-zip'
import { useBackendGraphStore } from '@/store/backend-graph-store'
import type { LumioBackendGraph } from '@/types/lumio'

describe('client zip export', () => {
  afterEach(() => {
    useBackendGraphStore.getState().reset()
  })

  test('zips generated backend files from graph store state', async () => {
    const graph: LumioBackendGraph = {
      nodes: [
        { id: 'm1', type: 'Model', label: 'User', config: { model: 'User' } },
        { id: 'get1', type: 'GET', label: 'GET /users', config: { path: '/users' } },
        { id: 'jwt1', type: 'JWT', label: 'JWT', config: {} },
      ],
      edges: [],
    }

    useBackendGraphStore.getState().reset()
    useBackendGraphStore.getState().setNodes(graph.nodes)
    useBackendGraphStore.getState().setEdges(graph.edges)

    const snapshot = useBackendGraphStore.getState()
    const files = generateBackendFiles({ nodes: snapshot.nodes, edges: snapshot.edges })
    const blob = await buildProjectZip(files)
    const zip = await JSZip.loadAsync(blob)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(['prisma/schema.prisma', 'app/api/users/route.ts', 'lib/auth/jwt.ts', 'middleware.ts']),
    )
  })

  test('builds deterministic filename format', () => {
    const filename = buildExportFilename(new Date('2026-03-13T12:34:56.000Z'))
    expect(filename).toBe('lumio-ai-2026-03-13T12-34-56-000Z.zip')
  })

  test('creates zip blob from file manifest', async () => {
    const manifest = {
      'app/api/users/route.ts': 'export const GET = () => null',
      'prisma/schema.prisma': 'model User { id String @id }',
    }

    const blob = await buildProjectZip(manifest)
    const zip = await JSZip.loadAsync(blob)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(await zip.file('app/api/users/route.ts')?.async('string')).toBe(manifest['app/api/users/route.ts'])
    expect(await zip.file('prisma/schema.prisma')?.async('string')).toBe(manifest['prisma/schema.prisma'])
  })

  test('rejects unsafe zip paths', async () => {
    await expect(buildProjectZip({ '../escape.txt': 'blocked' })).rejects.toThrow('Invalid zip path: ../escape.txt')
    await expect(buildProjectZip({ '/absolute.txt': 'blocked' })).rejects.toThrow('Invalid zip path: /absolute.txt')
    await expect(buildProjectZip({ 'C:/windows/path.txt': 'blocked' })).rejects.toThrow('Invalid zip path: C:/windows/path.txt')
  })
})
