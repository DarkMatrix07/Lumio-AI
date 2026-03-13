import type { LumioBackendGraph } from '@/types/lumio'

type FileManifest = Record<string, string>

const toRouteSegment = (path: string): string => {
  const trimmed = path.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  // Strip leading 'api/' to avoid double-prefix when user writes '/api/users'
  const withoutApiPrefix = trimmed.replace(/^api\//, '')
  return withoutApiPrefix || 'root'
}

const buildPrismaSchema = (graph: LumioBackendGraph): string => {
  const modelNames = graph.nodes
    .filter((node) => node.type === 'Model')
    .map((node) => {
      const model = node.config['model']
      return typeof model === 'string' && model.trim() ? model.trim() : node.label || 'Entity'
    })

  const uniqueModels = Array.from(new Set(modelNames))

  const modelBlocks = uniqueModels
    .map(
      (name) => `model ${name} {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`,
    )
    .join('\n')

  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

${modelBlocks}`
}

const buildRouteFiles = (graph: LumioBackendGraph): FileManifest => {
  const routes = new Map<string, Set<string>>()

  for (const node of graph.nodes) {
    if (node.type !== 'GET' && node.type !== 'POST' && node.type !== 'PUT' && node.type !== 'DELETE' && node.type !== 'PATCH') {
      continue
    }

    const rawPath = node.config['path']
    if (typeof rawPath !== 'string' || !rawPath.trim()) {
      continue
    }

    const segment = toRouteSegment(rawPath)
    const methods = routes.get(segment) ?? new Set<string>()
    methods.add(node.type)
    routes.set(segment, methods)
  }

  const files: FileManifest = {}

  for (const [segment, methods] of routes.entries()) {
    const handlers = Array.from(methods)
      .sort()
      .map(
        (method) => `export async function ${method}(request: Request) {
  return Response.json({ message: '${method} /${segment} stub' }, { status: 200 })
}
`,
      )
      .join('\n')

    files[`app/api/${segment}/route.ts`] = handlers
  }

  return files
}

const buildJwtHelper = (): string => {
  return `export const signJwt = async (payload: Record<string, unknown>): Promise<string> => {
  return JSON.stringify(payload)
}

export const verifyJwt = async (token: string): Promise<Record<string, unknown> | null> => {
  try {
    return JSON.parse(token) as Record<string, unknown>
  } catch {
    return null
  }
}
`
}

const buildMiddlewareStub = (graph: LumioBackendGraph): string => {
  const hasCors = graph.nodes.some((node) => node.type === 'CORS')
  const hasRateLimit = graph.nodes.some((node) => node.type === 'RateLimit')
  const hasLogger = graph.nodes.some((node) => node.type === 'Logger')

  return `import { NextResponse } from 'next/server'

// Generated middleware entry
// CORS middleware: ${hasCors ? 'enabled' : 'not configured'}
// RateLimit middleware: ${hasRateLimit ? 'enabled' : 'not configured'}
// Logger middleware: ${hasLogger ? 'enabled' : 'not configured'}

export function middleware(request: Request) {
  return NextResponse.next()
}
`
}

export const generateBackendFiles = (graph: LumioBackendGraph): FileManifest => {
  const hasJwt = graph.nodes.some((node) => node.type === 'JWT')
  return {
    'prisma/schema.prisma': buildPrismaSchema(graph),
    ...buildRouteFiles(graph),
    ...(hasJwt ? { 'lib/auth/jwt.ts': buildJwtHelper() } : {}),
    'middleware.ts': buildMiddlewareStub(graph),
  }
}
