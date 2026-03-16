import type { LumioBackendGraph, LumioTemplateKind, ModelField, QueryParam, ResponseStatus } from '@/types/lumio'

import { PRISMA_MODEL_NAME_PATTERN, isValidBackendRoutePath, validateBackendGraph } from '@/lib/backend/graph-validator'

// ─── Public types ────────────────────────────────────────────────────────────

type FileManifest = Record<string, string>

// ─── Internal node narrowing ─────────────────────────────────────────────────

type BackendNodeType = LumioBackendGraph['nodes'][number]['type']
type BackendNode = LumioBackendGraph['nodes'][number] & { type: BackendNodeType }

// ─── Service definitions ─────────────────────────────────────────────────────

const SERVICE_PORTS: Record<string, number> = {
  'api-service': 3000,
  'auth-service': 3001,
  'crud-service': 3002,
  'chat-service': 3003,
}

const TEMPLATE_KIND_TO_SERVICE: Record<LumioTemplateKind, string> = {
  AuthSystem: 'auth-service',
  CrudApi: 'crud-service',
  ChatSystem: 'chat-service',
}

type RouteDefinition = {
  method: string
  path: string
  description?: string
  auth?: string
  queryParams?: QueryParam[]
  requestBody?: string
  responseDescription?: string
  statuses?: ResponseStatus[]
  tags?: string
}

// Routes that Template nodes expand into
const TEMPLATE_ROUTES: Record<LumioTemplateKind, RouteDefinition[]> = {
  AuthSystem: [
    { method: 'POST', path: '/auth/register', description: 'Register a new user' },
    { method: 'POST', path: '/auth/login', description: 'Authenticate user and return token' },
    { method: 'GET', path: '/auth/me', description: 'Get current authenticated user', auth: 'jwt' },
  ],
  CrudApi: [
    { method: 'GET', path: '/items', description: 'List all items' },
    { method: 'POST', path: '/items', description: 'Create a new item' },
    { method: 'GET', path: '/items/:id', description: 'Get item by ID' },
    { method: 'PUT', path: '/items/:id', description: 'Update item by ID' },
    { method: 'DELETE', path: '/items/:id', description: 'Delete item by ID' },
  ],
  ChatSystem: [
    { method: 'GET', path: '/messages', description: 'List messages' },
    { method: 'POST', path: '/messages', description: 'Send a message' },
    { method: 'GET', path: '/rooms', description: 'List chat rooms' },
    { method: 'POST', path: '/rooms', description: 'Create a chat room' },
  ],
}

// ─── Endpoint config type ─────────────────────────────────────────────────────

type EndpointNodeConfig = {
  path: string
  description?: string
  auth?: string
  queryParams?: QueryParam[]
  requestBody?: string
  responseDescription?: string
  statuses?: ResponseStatus[]
  tags?: string
}

// ─── Prisma schema builder (preserved export) ─────────────────────────────────

const PRISMA_FIELD_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const buildUserFieldLine = (field: ModelField): string | null => {
  if (!PRISMA_FIELD_IDENTIFIER_PATTERN.test(field.name)) {
    return null
  }
  const typeStr = field.required ? field.type : `${field.type}?`
  const paddedName = field.name.padEnd(10)
  return `  ${paddedName}${typeStr}`
}

export const buildPrismaSchema = (graph: LumioBackendGraph): string => {
  const invalidModelNodeIds = new Set(
    validateBackendGraph(graph)
      .map((error) => error.match(/^Model node (.+?) has invalid config\.model /)?.[1] ?? null)
      .filter((nodeId): nodeId is string => nodeId !== null),
  )

  const validModelNodes = graph.nodes.filter(
    (node) => node.type === 'Model' && !invalidModelNodeIds.has(node.id),
  )

  const seenModelNames = new Set<string>()
  const dedupedModelNodes = validModelNodes.filter((node) => {
    const model = node.config['model']
    const name = typeof model === 'string' && model.trim() ? model.trim() : node.label || 'Entity'
    if (!PRISMA_MODEL_NAME_PATTERN.test(name) || seenModelNames.has(name)) {
      return false
    }
    seenModelNames.add(name)
    return true
  })

  const sortedModelNodes = [...dedupedModelNodes].sort((left, right) => {
    const leftModel = left.config['model']
    const rightModel = right.config['model']
    const leftName = typeof leftModel === 'string' && leftModel.trim() ? leftModel.trim() : left.label || 'Entity'
    const rightName = typeof rightModel === 'string' && rightModel.trim() ? rightModel.trim() : right.label || 'Entity'
    return leftName.localeCompare(rightName)
  })

  const modelBlocks = sortedModelNodes
    .map((node) => {
      const model = node.config['model']
      const name = typeof model === 'string' && model.trim() ? model.trim() : node.label || 'Entity'

      const rawFields = node.config['fields']
      const userFields: ModelField[] = Array.isArray(rawFields) ? (rawFields as ModelField[]) : []
      const userFieldLines = userFields
        .map(buildUserFieldLine)
        .filter((line): line is string => line !== null)

      const userFieldsBlock = userFieldLines.length > 0 ? `\n${userFieldLines.join('\n')}` : ''

      return `model ${name} {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt${userFieldsBlock}
}
`
    })
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

// ─── Express route comment builder ────────────────────────────────────────────

const BODY_METHODS_SET = new Set(['POST', 'PUT', 'PATCH'])
const QUERY_PARAM_METHODS_SET = new Set(['GET', 'DELETE', 'PATCH'])

const AUTH_LABEL: Record<string, string> = {
  jwt: 'JWT',
  apikey: 'API Key',
  session: 'Session',
  oauth: 'OAuth',
}

const buildRouteComments = (route: RouteDefinition, indent: string): string => {
  const lines: string[] = []

  if (route.description?.trim()) {
    lines.push(`${indent}// ${route.description.trim()}`)
  }

  if (route.auth && route.auth !== 'none') {
    const authLabel = AUTH_LABEL[route.auth] ?? route.auth
    lines.push(`${indent}// Auth: ${authLabel}`)
  }

  if (QUERY_PARAM_METHODS_SET.has(route.method) && route.queryParams && route.queryParams.length > 0) {
    const paramList = route.queryParams
      .map((p) => `${p.name}${p.required ? '' : '?'}: ${p.type}`)
      .join(', ')
    lines.push(`${indent}// Query params: ${paramList}`)
  }

  if (BODY_METHODS_SET.has(route.method) && route.requestBody?.trim()) {
    lines.push(`${indent}// Request body: ${route.requestBody.trim()}`)
  }

  if (route.responseDescription?.trim()) {
    lines.push(`${indent}// Response: ${route.responseDescription.trim()}`)
  }

  if (route.statuses && route.statuses.length > 0) {
    const statusList = route.statuses
      .map((s) => `${s.code}${s.description ? ` ${s.description}` : ''}`)
      .join(', ')
    lines.push(`${indent}// Status codes: ${statusList}`)
  }

  if (route.tags?.trim()) {
    lines.push(`${indent}// Tags: ${route.tags.trim()}`)
  }

  lines.push(`${indent}// TODO: implement ${route.method} ${route.path}`)

  return lines.join('\n')
}

const getDefaultStatusCode = (route: RouteDefinition): number => {
  if (route.statuses && route.statuses.length > 0) {
    return route.statuses[0]!.code
  }
  if (route.method === 'POST') return 201
  if (route.method === 'DELETE') return 204
  return 200
}

// ─── Service structure resolution ─────────────────────────────────────────────

type ServiceSpec = {
  name: string
  port: number
  routes: RouteDefinition[]
  modelNames: string[]
  hasJwt: boolean
  hasApiKey: boolean
  hasOAuth: boolean
  hasSession: boolean
  hasCors: boolean
  hasRateLimit: boolean
  rateLimitConfig: { limit?: number; windowMs?: number }
  corsOrigin: string
}

const resolveEndpointConfig = (node: BackendNode): EndpointNodeConfig => ({
  path: typeof node.config['path'] === 'string' ? node.config['path'] : '',
  description: typeof node.config['description'] === 'string' ? node.config['description'] : undefined,
  auth: typeof node.config['auth'] === 'string' ? node.config['auth'] : undefined,
  queryParams: Array.isArray(node.config['queryParams']) ? (node.config['queryParams'] as QueryParam[]) : undefined,
  requestBody: typeof node.config['requestBody'] === 'string' ? node.config['requestBody'] : undefined,
  responseDescription: typeof node.config['responseDescription'] === 'string' ? node.config['responseDescription'] : undefined,
  statuses: Array.isArray(node.config['statuses']) ? (node.config['statuses'] as ResponseStatus[]) : undefined,
  tags: typeof node.config['tags'] === 'string' ? node.config['tags'] : undefined,
})

const normalizeExpressPath = (path: string): string => {
  // Convert Next.js [param] syntax to :param and ensure leading slash
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  return withLeadingSlash
    .split('/')
    .map((seg) => {
      if (seg.startsWith('[') && seg.endsWith(']')) {
        return `:${seg.slice(1, -1)}`
      }
      return seg
    })
    .join('/')
}

const resolveServices = (graph: LumioBackendGraph): ServiceSpec[] => {
  const nodes = graph.nodes as BackendNode[]

  const hasJwtGlobal = nodes.some((n) => n.type === 'JWT')
  const hasApiKeyGlobal = nodes.some((n) => n.type === 'ApiKey')
  const hasOAuthGlobal = nodes.some((n) => n.type === 'OAuth')
  const hasSessionGlobal = nodes.some((n) => n.type === 'Session')
  const hasCorsGlobal = nodes.some((n) => n.type === 'CORS')
  const hasRateLimitGlobal = nodes.some((n) => n.type === 'RateLimit')

  const rateLimitNode = nodes.find((n) => n.type === 'RateLimit')
  const rateLimitConfig = rateLimitNode
    ? {
        limit: typeof rateLimitNode.config['limit'] === 'number' ? rateLimitNode.config['limit'] : undefined,
        windowMs: typeof rateLimitNode.config['windowMs'] === 'number' ? rateLimitNode.config['windowMs'] : undefined,
      }
    : {}

  const corsNode = nodes.find((n) => n.type === 'CORS')
  const corsOrigin =
    corsNode && typeof corsNode.config['origin'] === 'string' && corsNode.config['origin'].trim()
      ? corsNode.config['origin'].trim()
      : '*'

  // Collect model names from Model nodes
  const invalidModelNodeIds = new Set(
    validateBackendGraph(graph)
      .map((e) => e.match(/^Model node (.+?) has invalid config\.model /)?.[1] ?? null)
      .filter((id): id is string => id !== null),
  )
  const allModelNames = nodes
    .filter((n) => n.type === 'Model' && !invalidModelNodeIds.has(n.id))
    .map((n) => {
      const model = n.config['model']
      return typeof model === 'string' && model.trim() ? model.trim() : n.label || 'Entity'
    })
    .filter((name) => PRISMA_MODEL_NAME_PATTERN.test(name))

  // Detect template nodes
  const templateNodes = nodes.filter((n) => n.type === 'Template') as Array<
    BackendNode & { config: { templateKind: LumioTemplateKind } }
  >

  // Collect non-template endpoint nodes for api-service
  const endpointMethodTypes = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  const freeEndpointNodes = nodes.filter(
    (n) => endpointMethodTypes.has(n.type) && typeof n.config['path'] === 'string' && isValidBackendRoutePath(n.config['path'] as string),
  )

  const serviceMap = new Map<string, ServiceSpec>()

  const getOrCreateService = (name: string): ServiceSpec => {
    if (!serviceMap.has(name)) {
      serviceMap.set(name, {
        name,
        port: SERVICE_PORTS[name] ?? 3000,
        routes: [],
        modelNames: [...allModelNames],
        hasJwt: hasJwtGlobal,
        hasApiKey: hasApiKeyGlobal,
        hasOAuth: hasOAuthGlobal,
        hasSession: hasSessionGlobal,
        hasCors: hasCorsGlobal,
        hasRateLimit: hasRateLimitGlobal,
        rateLimitConfig,
        corsOrigin,
      })
    }
    return serviceMap.get(name)!
  }

  // Expand template nodes into their respective services
  for (const templateNode of templateNodes) {
    const templateKind = templateNode.config['templateKind'] as LumioTemplateKind
    const serviceName = TEMPLATE_KIND_TO_SERVICE[templateKind]
    if (!serviceName) continue

    const service = getOrCreateService(serviceName)
    const templateRoutes = TEMPLATE_ROUTES[templateKind] ?? []
    service.routes.push(...templateRoutes)
  }

  // Assign free endpoint nodes to api-service
  if (freeEndpointNodes.length > 0) {
    const apiService = getOrCreateService('api-service')
    for (const node of freeEndpointNodes) {
      const cfg = resolveEndpointConfig(node)
      const expressPath = normalizeExpressPath(cfg.path)
      apiService.routes.push({
        method: node.type,
        path: expressPath,
        description: cfg.description,
        auth: cfg.auth,
        queryParams: cfg.queryParams,
        requestBody: cfg.requestBody,
        responseDescription: cfg.responseDescription,
        statuses: cfg.statuses,
        tags: cfg.tags,
      })
    }
  }

  // If nothing was created at all, return a minimal api-service
  if (serviceMap.size === 0) {
    serviceMap.set('api-service', {
      name: 'api-service',
      port: 3000,
      routes: [],
      modelNames: [...allModelNames],
      hasJwt: hasJwtGlobal,
      hasApiKey: hasApiKeyGlobal,
      hasOAuth: hasOAuthGlobal,
      hasSession: hasSessionGlobal,
      hasCors: hasCorsGlobal,
      hasRateLimit: hasRateLimitGlobal,
      rateLimitConfig,
      corsOrigin,
    })
  }

  return Array.from(serviceMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// ─── Per-file generators ──────────────────────────────────────────────────────

const buildServerJs = (service: ServiceSpec): string => {
  const hasAuth = service.hasJwt || service.hasApiKey || service.hasOAuth || service.hasSession
  const middlewareImports: string[] = []
  const middlewareUses: string[] = []

  if (service.hasCors) {
    middlewareImports.push("const corsMiddleware = require('./middleware/cors')")
    middlewareUses.push('app.use(corsMiddleware)')
  } else {
    middlewareUses.push('app.use(cors())')
  }

  if (service.hasRateLimit) {
    middlewareImports.push("const { rateLimiter } = require('./middleware/rateLimit')")
    middlewareUses.push('app.use(rateLimiter)')
  }

  if (hasAuth) {
    middlewareImports.push("const { authenticate } = require('./middleware/auth')")
  }

  const extraImports = middlewareImports.length > 0 ? `\n${middlewareImports.join('\n')}` : ''
  const corsRequire = service.hasCors ? '' : "\nconst cors = require('cors')"
  const middlewareBlock = middlewareUses.map((u) => `${u}`).join('\n')

  const serviceTitleName = service.name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return `require('dotenv').config()
const express = require('express')${corsRequire}
const routes = require('./routes')${extraImports}

const app = express()
const PORT = process.env.PORT || ${service.port}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
${middlewareBlock}

app.use('/api', routes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: '${service.name}' })
})

app.listen(PORT, () => {
  console.log(\`${serviceTitleName} running on port \${PORT}\`)
})

module.exports = app
`
}

const buildRoutesIndexJs = (service: ServiceSpec): string => {
  const sortedRoutes = [...service.routes].sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path)
    return pathCmp !== 0 ? pathCmp : a.method.localeCompare(b.method)
  })

  const handlerBlocks = sortedRoutes
    .map((route) => {
      const comments = buildRouteComments(route, '  ')
      const statusCode = getDefaultStatusCode(route)
      const methodLower = route.method.toLowerCase()

      // 204 No Content should not send a body
      const responseBody =
        statusCode === 204
          ? `  res.status(204).send()`
          : `  res.status(${statusCode}).json({ message: '${route.method} ${route.path}' })`

      return `router.${methodLower}('${route.path}', async (req, res) => {
${comments}
${responseBody}
})`
    })
    .join('\n\n')

  return `const express = require('express')
const router = express.Router()

${handlerBlocks}

module.exports = router
`
}

const buildModelJs = (modelName: string, fields: ModelField[]): string => {
  const fieldLines = fields
    .filter((f) => PRISMA_FIELD_IDENTIFIER_PATTERN.test(f.name))
    .map((f) => {
      const typeStr = f.required ? f.type : `${f.type}?`
      return `  ${f.name}: '${typeStr}',`
    })
    .join('\n')

  const fieldBlock = fieldLines ? `\n${fieldLines}\n` : ''
  const fieldSummary = fields.length > 0
    ? fields.map((f) => `${f.name} (${f.required ? f.type : `${f.type}?`})`).join(', ')
    : 'none defined'

  return `// ${modelName} model
// Fields: ${fieldSummary}
// TODO: implement with your preferred ORM (Prisma, Mongoose, Sequelize)

module.exports = {
  // ${modelName} schema placeholder${fieldBlock}}
`
}

const buildAuthMiddlewareJs = (service: ServiceSpec): string => {
  const strategies: string[] = []
  if (service.hasJwt) strategies.push('JWT')
  if (service.hasApiKey) strategies.push('API Key')
  if (service.hasOAuth) strategies.push('OAuth')
  if (service.hasSession) strategies.push('Session')

  const strategyComment = strategies.length > 0 ? strategies.join(', ') : 'unknown'

  const jwtBlock = service.hasJwt
    ? `
  // JWT authentication
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  // TODO: verify token with jsonwebtoken
  // const token = authHeader.slice(7)
  // const payload = jwt.verify(token, process.env.JWT_SECRET)
  // req.user = payload
`
    : service.hasApiKey
      ? `
  // API Key authentication
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-Api-Key header' })
  }
  // TODO: validate API key against store
`
      : `
  // TODO: validate credentials based on your auth strategy (${strategyComment})
`

  return `// Authentication middleware
// Strategy: ${strategyComment}

const authenticate = (req, res, next) => {${jwtBlock}
  next()
}

const optionalAuth = (req, res, next) => {
  // Same as authenticate but never rejects — attach user if present
  next()
}

module.exports = { authenticate, optionalAuth }
`
}

const buildCorsMiddlewareJs = (service: ServiceSpec): string => {
  return `const cors = require('cors')

const corsOptions = {
  origin: process.env.CORS_ORIGIN || ${JSON.stringify(service.corsOrigin)},
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
  credentials: true,
}

module.exports = cors(corsOptions)
`
}

const buildRateLimitMiddlewareJs = (service: ServiceSpec): string => {
  const limit = service.rateLimitConfig.limit ?? 100
  const windowMs = service.rateLimitConfig.windowMs ?? 60000

  return `const rateLimit = require('express-rate-limit')

const rateLimiter = rateLimit({
  windowMs: ${windowMs}, // ${windowMs / 1000}s window
  max: ${limit}, // max ${limit} requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

module.exports = { rateLimiter }
`
}

const buildPackageJson = (service: ServiceSpec): string => {
  const dependencies: Record<string, string> = {
    express: '^4.18.2',
    cors: '^2.8.5',
    dotenv: '^16.0.3',
  }

  if (service.hasJwt) {
    dependencies['jsonwebtoken'] = '^9.0.2'
  }

  if (service.hasRateLimit) {
    dependencies['express-rate-limit'] = '^7.1.5'
  }

  return JSON.stringify(
    {
      name: service.name,
      version: '1.0.0',
      description: `Generated ${service.name} microservice`,
      main: 'server.js',
      scripts: {
        start: 'node server.js',
        dev: 'nodemon server.js',
      },
      dependencies,
      devDependencies: {
        nodemon: '^3.0.1',
      },
    },
    null,
    2,
  ) + '\n'
}

const buildDotEnv = (service: ServiceSpec): string => {
  const lines: string[] = [
    `PORT=${service.port}`,
    'NODE_ENV=development',
    `DATABASE_URL=postgresql://user:password@localhost:5432/${service.name.replace(/-/g, '_')}db`,
  ]

  if (service.hasJwt) {
    lines.push('# JWT_SECRET=your-secret-here')
  }

  if (service.hasApiKey) {
    lines.push('# API_KEY=your-api-key')
  }

  if (service.hasOAuth) {
    lines.push('# OAUTH_CLIENT_ID=your-client-id')
    lines.push('# OAUTH_CLIENT_SECRET=your-client-secret')
  }

  if (service.hasSession) {
    lines.push('# SESSION_SECRET=your-session-secret')
  }

  if (service.hasCors) {
    lines.push(`# CORS_ORIGIN=${service.corsOrigin}`)
  }

  return lines.join('\n') + '\n'
}

const buildGitignore = (): string => {
  return `node_modules/
.env
dist/
*.log
.DS_Store
`
}

const buildDockerfile = (service: ServiceSpec): string => {
  return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE ${service.port}
CMD ["node", "server.js"]
`
}

const buildDockerCompose = (services: ServiceSpec[]): string => {
  const serviceBlocks = services
    .map(
      (s) => `  ${s.name}:
    build: ./${s.name}
    ports:
      - "${s.port}:${s.port}"
    environment:
      - NODE_ENV=development
    env_file:
      - ./${s.name}/.env
    depends_on:
      - postgres`,
    )
    .join('\n\n')

  return `version: '3.8'

services:
${serviceBlocks}

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
      POSTGRES_DB: lumio
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`
}

const buildReadme = (services: ServiceSpec[]): string => {
  const tableRows = services
    .map((s) => `| ${s.name} | ${s.port} | Generated service |`)
    .join('\n')

  const individualStartLines = services
    .map((s) => `cd ${s.name} && npm install && npm run dev`)
    .join('\n')

  return `# Generated Backend

Auto-generated by Lumio AI. All services are Express.js microservices.

## Services

| Service | Port | Description |
|---------|------|-------------|
${tableRows}

## Quick Start

### Docker (recommended)

\`\`\`bash
docker-compose up
\`\`\`

### Run individually

\`\`\`bash
${individualStartLines}
\`\`\`

## Environment

Each service has its own \`.env\` file. Copy and fill in secrets before running:

\`\`\`bash
${services.map((s) => `# ${s.name}\ncp ${s.name}/.env.example ${s.name}/.env`).join('\n')}
\`\`\`

## Routes

${services
  .map((s) => {
    if (s.routes.length === 0) return `### ${s.name}\n\nNo routes defined.`
    const routeLines = s.routes
      .map((r) => `- \`${r.method} /api${r.path}\`${r.description ? ` — ${r.description}` : ''}`)
      .join('\n')
    return `### ${s.name}\n\n${routeLines}`
  })
  .join('\n\n')}
`
}

// ─── Service file emitter ─────────────────────────────────────────────────────

const emitServiceFiles = (service: ServiceSpec, graph: LumioBackendGraph): FileManifest => {
  const files: FileManifest = {}
  const prefix = `${service.name}/`

  // server.js
  files[`${prefix}server.js`] = buildServerJs(service)

  // routes/index.js
  files[`${prefix}routes/index.js`] = buildRoutesIndexJs(service)

  // models — one file per model
  const invalidModelNodeIds = new Set(
    validateBackendGraph(graph)
      .map((e) => e.match(/^Model node (.+?) has invalid config\.model /)?.[1] ?? null)
      .filter((id): id is string => id !== null),
  )

  const seenModelNames = new Set<string>()
  for (const node of graph.nodes) {
    if (node.type !== 'Model' || invalidModelNodeIds.has(node.id)) continue
    const model = node.config['model']
    const name = typeof model === 'string' && model.trim() ? model.trim() : node.label || 'Entity'
    if (!PRISMA_MODEL_NAME_PATTERN.test(name) || seenModelNames.has(name)) continue
    seenModelNames.add(name)

    const rawFields = node.config['fields']
    const fields: ModelField[] = Array.isArray(rawFields) ? (rawFields as ModelField[]) : []
    files[`${prefix}models/${name}.js`] = buildModelJs(name, fields)
  }

  // middleware — conditional
  const hasAuth = service.hasJwt || service.hasApiKey || service.hasOAuth || service.hasSession
  if (hasAuth) {
    files[`${prefix}middleware/auth.js`] = buildAuthMiddlewareJs(service)
  }
  if (service.hasCors) {
    files[`${prefix}middleware/cors.js`] = buildCorsMiddlewareJs(service)
  }
  if (service.hasRateLimit) {
    files[`${prefix}middleware/rateLimit.js`] = buildRateLimitMiddlewareJs(service)
  }

  // package.json
  files[`${prefix}package.json`] = buildPackageJson(service)

  // .env
  files[`${prefix}.env`] = buildDotEnv(service)

  // .gitignore
  files[`${prefix}.gitignore`] = buildGitignore()

  // Dockerfile
  files[`${prefix}Dockerfile`] = buildDockerfile(service)

  return files
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const generateBackendFiles = (graph: LumioBackendGraph): FileManifest => {
  const services = resolveServices(graph)
  const files: FileManifest = {}

  for (const service of services) {
    const serviceFiles = emitServiceFiles(service, graph)
    for (const [path, content] of Object.entries(serviceFiles)) {
      files[path] = content
    }
  }

  // Root-level orchestration files
  files['docker-compose.yml'] = buildDockerCompose(services)
  files['README.md'] = buildReadme(services)

  return files
}
