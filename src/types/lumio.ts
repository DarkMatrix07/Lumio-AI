// Endpoint node types (HTTP methods)
export const LUMIO_ENDPOINT_TYPES = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const
export type LumioEndpointType = (typeof LUMIO_ENDPOINT_TYPES)[number]

// All non-template node types per design spec
export const LUMIO_STANDARD_NODE_TYPES = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'Model',
  'Relation',
  'JWT',
  'CORS',
  'RateLimit',
  'ApiKey',
  'OAuth',
  'Session',
  'IfElse',
  'Loop',
  'TryCatch',
  'Validation',
  'Logger',
  'CustomMiddleware',
  'EnvVar',
] as const

export type LumioStandardNodeType = (typeof LUMIO_STANDARD_NODE_TYPES)[number]

export const LUMIO_TEMPLATE_KINDS = ['AuthSystem', 'CrudApi', 'ChatSystem'] as const
export type LumioTemplateKind = (typeof LUMIO_TEMPLATE_KINDS)[number]

export type LumioNodeType = LumioStandardNodeType | 'Template'

export type LumioFrontend = {
  html: string
  css: string
}

type LumioNodeBase = {
  id: string
  label: string
  config: Record<string, unknown>
}

export type LumioStandardNode = LumioNodeBase & {
  type: LumioStandardNodeType
}

export type LumioTemplateNode = LumioNodeBase & {
  type: 'Template'
  config: Record<string, unknown> & {
    templateKind: LumioTemplateKind
  }
}

export type LumioGraphNode = LumioStandardNode | LumioTemplateNode

export type LumioGraphEdge = {
  id: string
  source: string
  target: string
  label?: string
}

export type LumioBackendGraph = {
  nodes: LumioGraphNode[]
  edges: LumioGraphEdge[]
}

export type LumioContract = {
  version: string
  frontend: LumioFrontend
  backendGraph: LumioBackendGraph
}

export type LumioContractValidationResult =
  | {
      success: true
      data: LumioContract
    }
  | {
      success: false
      errors: string[]
    }
