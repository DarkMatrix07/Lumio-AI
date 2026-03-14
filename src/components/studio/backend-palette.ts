import type { LumioGraphNode, LumioNodeType, LumioTemplateKind } from '@/types/lumio'

export const BACKEND_PALETTE_SECTIONS = [
  'Endpoints',
  'Data',
  'Security',
  'Logic',
  'Middleware',
  'Templates',
] as const

export type BackendPaletteSection = (typeof BACKEND_PALETTE_SECTIONS)[number]

type BackendPaletteBaseItem = {
  label: string
  section: BackendPaletteSection
  defaultConfig: Record<string, unknown>
}

type BackendPaletteNodeItem = BackendPaletteBaseItem & {
  type: LumioNodeType
  templateKind?: undefined
}

type BackendPaletteTemplateItem = Omit<BackendPaletteBaseItem, 'defaultConfig'> & {
  type: 'Template'
  templateKind: LumioTemplateKind
  defaultConfig?: undefined
}

export type BackendPaletteItem = BackendPaletteNodeItem | BackendPaletteTemplateItem

export const BACKEND_PALETTE_ITEMS = [
  { type: 'GET', label: 'GET', section: 'Endpoints', defaultConfig: { path: '/resource' } },
  { type: 'POST', label: 'POST', section: 'Endpoints', defaultConfig: { path: '/resource' } },
  { type: 'PUT', label: 'PUT', section: 'Endpoints', defaultConfig: { path: '/resource/:id' } },
  { type: 'DELETE', label: 'DELETE', section: 'Endpoints', defaultConfig: { path: '/resource/:id' } },
  { type: 'PATCH', label: 'PATCH', section: 'Endpoints', defaultConfig: { path: '/resource/:id' } },
  { type: 'Model', label: 'Model', section: 'Data', defaultConfig: { model: 'Resource' } },
  { type: 'Relation', label: 'Relation', section: 'Data', defaultConfig: { fromModelId: '', toModelId: '' } },
  { type: 'JWT', label: 'JWT Auth', section: 'Security', defaultConfig: { secretEnv: 'JWT_SECRET' } },
  { type: 'ApiKey', label: 'API Key', section: 'Security', defaultConfig: { headerName: 'x-api-key' } },
  { type: 'OAuth', label: 'OAuth', section: 'Security', defaultConfig: { provider: 'github' } },
  { type: 'Session', label: 'Session', section: 'Security', defaultConfig: { secretEnv: 'SESSION_SECRET' } },
  { type: 'CORS', label: 'CORS', section: 'Middleware', defaultConfig: { origin: '*' } },
  { type: 'RateLimit', label: 'Rate Limit', section: 'Middleware', defaultConfig: { limit: 100, windowMs: 60000 } },
  { type: 'Logger', label: 'Logger', section: 'Middleware', defaultConfig: { level: 'info' } },
  { type: 'CustomMiddleware', label: 'Custom', section: 'Middleware', defaultConfig: { name: 'customMiddleware' } },
  { type: 'EnvVar', label: 'Env Variable', section: 'Middleware', defaultConfig: { key: 'API_URL', value: '' } },
  { type: 'IfElse', label: 'If / Else', section: 'Logic', defaultConfig: { condition: 'true' } },
  { type: 'Loop', label: 'Loop', section: 'Logic', defaultConfig: { iterable: 'items' } },
  { type: 'TryCatch', label: 'Try / Catch', section: 'Logic', defaultConfig: { tryLabel: 'main' } },
  { type: 'Validation', label: 'Validation', section: 'Logic', defaultConfig: { schema: 'bodySchema' } },
  { type: 'Template', label: 'Auth System', section: 'Templates', templateKind: 'AuthSystem' },
  { type: 'Template', label: 'CRUD API', section: 'Templates', templateKind: 'CrudApi' },
  { type: 'Template', label: 'Chat System', section: 'Templates', templateKind: 'ChatSystem' },
] as const satisfies readonly BackendPaletteItem[]

const cloneConfig = (config: Record<string, unknown>): Record<string, unknown> => ({
  ...config,
})

export const createBackendPaletteNode = (item: BackendPaletteItem, id: string): LumioGraphNode => {
  if (item.type === 'Template') {
    return {
      id,
      type: 'Template',
      label: item.label,
      config: {
        templateKind: item.templateKind,
      },
    }
  }

  return {
    id,
    type: item.type,
    label: item.label,
    config: cloneConfig(item.defaultConfig),
  }
}
