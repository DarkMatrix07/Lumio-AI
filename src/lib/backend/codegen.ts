import type { LumioBackendGraph } from '@/types/lumio'

import { PRISMA_MODEL_NAME_PATTERN, isValidBackendRoutePath, validateBackendGraph } from '@/lib/backend/graph-validator'

type FileManifest = Record<string, string>
type BackendNodeType = LumioBackendGraph['nodes'][number]['type']
type BackendNode = LumioBackendGraph['nodes'][number] & {
  type: BackendNodeType
}

const toRouteSegment = (path: string): string => {
  const trimmed = path.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  const withoutApiPrefix = trimmed.replace(/^api\//, '')
  const normalized = withoutApiPrefix
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        return `[${segment.slice(1)}]`
      }

      return segment
    })
    .join('/')

  return normalized || 'root'
}

const escapeTsString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')

const buildPrismaSchema = (graph: LumioBackendGraph): string => {
  const invalidModelNodeIds = new Set(
    validateBackendGraph(graph)
      .map((error) => error.match(/^Model node (.+?) has invalid config\.model /)?.[1] ?? null)
      .filter((nodeId): nodeId is string => nodeId !== null),
  )

  const modelNames = graph.nodes
    .filter((node) => node.type === 'Model' && !invalidModelNodeIds.has(node.id))
    .map((node) => {
      const model = node.config['model']
      return typeof model === 'string' && model.trim() ? model.trim() : node.label || 'Entity'
    })
    .filter((name) => PRISMA_MODEL_NAME_PATTERN.test(name))

  const uniqueModels = Array.from(new Set(modelNames)).sort((left, right) => left.localeCompare(right))

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
    if (typeof rawPath !== 'string' || !rawPath.trim() || !isValidBackendRoutePath(rawPath)) {
      continue
    }

    const segment = toRouteSegment(rawPath)
    const methods = routes.get(segment) ?? new Set<string>()
    methods.add(node.type)
    routes.set(segment, methods)
  }

  const files: FileManifest = {}
  const sortedRouteEntries = Array.from(routes.entries()).sort(([leftSegment], [rightSegment]) =>
    leftSegment.localeCompare(rightSegment),
  )

  for (const [segment, methods] of sortedRouteEntries) {
    const escapedSegment = escapeTsString(segment)
    const handlers = Array.from(methods)
      .sort()
      .map(
        (method) => `export async function ${method}(request: Request) {
  return Response.json({ message: '${method} /${escapedSegment} stub' }, { status: 200 })
}
`,
      )
      .join('\n')

    files[`app/api/${segment}/route.ts`] = handlers
  }

  return files
}

const buildJwtHelper = (): string => {
  return `const TODO_MESSAGE = 'TODO: implement secure JWT signing before production use'

export const signJwt = async (_payload: Record<string, unknown>): Promise<string> => {
  throw new Error(TODO_MESSAGE)
}

export const verifyJwt = async (_token: string): Promise<Record<string, unknown> | null> => {
  throw new Error(TODO_MESSAGE)
}
`
}

const buildApiKeyHelper = (): string => {
  return `const TODO_MESSAGE = 'TODO: implement API key validation before production use'

export const validateApiKey = async (_apiKey: string): Promise<boolean> => {
  throw new Error(TODO_MESSAGE)
}
`
}

const buildOAuthHelper = (): string => {
  return `const TODO_MESSAGE = 'TODO: implement OAuth code exchange before production use'

export const exchangeOAuthCode = async (_code: string): Promise<{ accessToken: string | null }> => {
  throw new Error(TODO_MESSAGE)
}
`
}

const buildSessionHelper = (): string => {
  return `const TODO_MESSAGE = 'TODO: implement secure session creation before production use'

export const createSession = async (_subject: string): Promise<{ sessionId: string }> => {
  throw new Error(TODO_MESSAGE)
}
`
}

const buildLogicStubFile = (graph: LumioBackendGraph): string | undefined => {
  const logicNodes = (graph.nodes as BackendNode[]).filter(
    (node) => node.type === 'Validation' || node.type === 'IfElse' || node.type === 'Loop' || node.type === 'TryCatch',
  )

  if (logicNodes.length === 0) {
    return undefined
  }

  const sortedLogicNodes = [...logicNodes].sort((left, right) => {
    const leftStableKey = `${left.type}:${left.id}`
    const rightStableKey = `${right.type}:${right.id}`
    return leftStableKey.localeCompare(rightStableKey)
  })

  const stubComments = sortedLogicNodes
    .map((node) => {
      const detailEntries = Object.entries(node.config)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      const details = detailEntries.length > 0 ? ` (${detailEntries.join(', ')})` : ''

      return `// ${node.type} node ${node.id}${details}`
    })
    .join('\n')

  return `// Generated backend logic stubs
// These nodes require manual orchestration in exported backend code.
${stubComments}
`
}

const buildMiddlewareStub = (graph: LumioBackendGraph): string => {
  const nodes = graph.nodes as BackendNode[]
  const invalidCustomMiddlewareNodeIds = new Set(
    validateBackendGraph(graph)
      .map((error) => error.match(/^CustomMiddleware node (.+?) has invalid config\.name /)?.[1] ?? null)
      .filter((nodeId): nodeId is string => nodeId !== null),
  )

  const hasCors = nodes.some((node) => node.type === 'CORS')
  const hasRateLimit = nodes.some((node) => node.type === 'RateLimit')
  const hasLogger = nodes.some((node) => node.type === 'Logger')
  const customMiddlewareNames = nodes
    .filter((node) => node.type === 'CustomMiddleware' && !invalidCustomMiddlewareNodeIds.has(node.id))
    .map((node) => node.config['name'])
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .sort((left, right) => left.localeCompare(right))

  const customMiddlewareSummary = customMiddlewareNames.length > 0 ? customMiddlewareNames.join(', ') : 'not configured'

  return `import { NextResponse } from 'next/server'

// Generated middleware entry
// CORS middleware ${hasCors ? 'TODO: implement enforcement' : 'not configured'}
// RateLimit middleware ${hasRateLimit ? 'TODO: implement enforcement' : 'not configured'}
// Logger middleware ${hasLogger ? 'TODO: implement enforcement' : 'not configured'}
// Custom middleware ${customMiddlewareNames.length > 0 ? `TODO: ${customMiddlewareSummary}` : 'not configured'}

export function middleware(request: Request) {
  return NextResponse.next()
}
`
}

export const generateBackendFiles = (graph: LumioBackendGraph): FileManifest => {
  const nodes = graph.nodes as BackendNode[]
  const hasJwt = nodes.some((node) => node.type === 'JWT')
  const hasApiKey = nodes.some((node) => node.type === 'ApiKey')
  const hasOAuth = nodes.some((node) => node.type === 'OAuth')
  const hasSession = nodes.some((node) => node.type === 'Session')
  const logicStubFile = buildLogicStubFile(graph)

  return {
    'prisma/schema.prisma': buildPrismaSchema(graph),
    ...buildRouteFiles(graph),
    ...(hasJwt ? { 'lib/auth/jwt.ts': buildJwtHelper() } : {}),
    ...(hasApiKey ? { 'lib/auth/api-key.ts': buildApiKeyHelper() } : {}),
    ...(hasOAuth ? { 'lib/auth/oauth.ts': buildOAuthHelper() } : {}),
    ...(hasSession ? { 'lib/auth/session.ts': buildSessionHelper() } : {}),
    ...(logicStubFile ? { 'lib/backend/logic.ts': logicStubFile } : {}),
    'middleware.ts': buildMiddlewareStub(graph),
  }
}
