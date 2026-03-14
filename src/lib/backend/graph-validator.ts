import type { LumioBackendGraph, LumioGraphNode } from '@/types/lumio'

export const PRISMA_MODEL_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/
const RESERVED_PRISMA_MODEL_NAMES = new Set(['Type'])
const SAFE_CUSTOM_MIDDLEWARE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/
const BACKEND_ROUTE_SEGMENT_PATTERN = /^(?:[A-Za-z0-9_-]+|\[[A-Za-z0-9_]+\]|:[A-Za-z0-9_]+)$/

const getStringConfig = (node: LumioGraphNode, key: string): string => {
  const value = node.config[key]
  return typeof value === 'string' ? value.trim() : ''
}

const isPositiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0

export const isValidBackendRoutePath = (path: string): boolean => {
  const trimmed = path.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  const withoutApiPrefix = trimmed.replace(/^api\//, '')

  if (!withoutApiPrefix) {
    return true
  }

  return withoutApiPrefix.split('/').every((segment) => BACKEND_ROUTE_SEGMENT_PATTERN.test(segment))
}

export const validateBackendGraph = (graph: LumioBackendGraph): string[] => {
  const errors: string[] = []

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))

  for (const node of graph.nodes) {
    if (node.type === 'GET' || node.type === 'POST' || node.type === 'PUT' || node.type === 'DELETE' || node.type === 'PATCH') {
      const path = getStringConfig(node, 'path')
      if (!path) {
        errors.push(`${node.type} node ${node.id} is missing config.path`)
      } else if (!isValidBackendRoutePath(path)) {
        errors.push(`${node.type} node ${node.id} has unsupported config.path ${path}`)
      }
    }

    if (node.type === 'Model') {
      const model = getStringConfig(node, 'model')
      if (!model) {
        errors.push(`Model node ${node.id} is missing config.model`)
      } else if (!PRISMA_MODEL_NAME_PATTERN.test(model) || RESERVED_PRISMA_MODEL_NAMES.has(model)) {
        errors.push(`Model node ${node.id} has invalid config.model ${model}`)
      }
    }

    if (node.type === 'EnvVar') {
      const key = getStringConfig(node, 'key')
      if (!key) {
        errors.push(`EnvVar node ${node.id} is missing config.key`)
      }
    }

    if (node.type === 'CustomMiddleware') {
      const name = getStringConfig(node, 'name')
      if (!name) {
        errors.push(`CustomMiddleware node ${node.id} is missing config.name`)
      } else if (!SAFE_CUSTOM_MIDDLEWARE_NAME_PATTERN.test(name)) {
        errors.push(`CustomMiddleware node ${node.id} has invalid config.name ${name}`)
      }
    }

    if (node.type === 'RateLimit') {
      const limit = node.config['limit']
      const windowMs = node.config['windowMs']
      if (limit === undefined || limit === '') {
        errors.push(`RateLimit node ${node.id} is missing config.limit`)
      } else if (!isPositiveInteger(limit)) {
        errors.push(`RateLimit node ${node.id} has invalid config.limit ${String(limit)}`)
      }
      if (windowMs === undefined || windowMs === '') {
        errors.push(`RateLimit node ${node.id} is missing config.windowMs`)
      } else if (!isPositiveInteger(windowMs)) {
        errors.push(`RateLimit node ${node.id} has invalid config.windowMs ${String(windowMs)}`)
      }
    }

    if (node.type === 'ApiKey') {
      const headerName = getStringConfig(node, 'headerName')
      if (!headerName) {
        errors.push(`ApiKey node ${node.id} is missing config.headerName`)
      }
    }

    if (node.type === 'OAuth') {
      const provider = getStringConfig(node, 'provider')
      if (!provider) {
        errors.push(`OAuth node ${node.id} is missing config.provider`)
      }
    }

    if (node.type === 'Session') {
      const secretEnv = getStringConfig(node, 'secretEnv')
      if (!secretEnv) {
        errors.push(`Session node ${node.id} is missing config.secretEnv`)
      }
    }

    if (node.type === 'IfElse') {
      const condition = getStringConfig(node, 'condition')
      if (!condition) {
        errors.push(`IfElse node ${node.id} is missing config.condition`)
      }
    }

    if (node.type === 'Loop') {
      const iterable = getStringConfig(node, 'iterable')
      if (!iterable) {
        errors.push(`Loop node ${node.id} is missing config.iterable`)
      }
    }

    if (node.type === 'TryCatch') {
      const tryLabel = getStringConfig(node, 'tryLabel')
      if (!tryLabel) {
        errors.push(`TryCatch node ${node.id} is missing config.tryLabel`)
      }
    }

    if (node.type === 'Validation') {
      const schema = getStringConfig(node, 'schema')
      if (!schema) {
        errors.push(`Validation node ${node.id} is missing config.schema`)
      }
    }

    if (node.type === 'Relation') {
      const fromModelId = getStringConfig(node, 'fromModelId')
      const toModelId = getStringConfig(node, 'toModelId')

      const fromModelNode = fromModelId ? nodesById.get(fromModelId) : undefined
      const toModelNode = toModelId ? nodesById.get(toModelId) : undefined

      if (!fromModelNode) {
        errors.push(`Relation node ${node.id} references unknown fromModelId ${fromModelId || '<empty>'}`)
      } else if (fromModelNode.type !== 'Model') {
        errors.push(`Relation node ${node.id} requires fromModelId ${fromModelId} to reference a Model node`)
      }

      if (!toModelNode) {
        errors.push(`Relation node ${node.id} references unknown toModelId ${toModelId || '<empty>'}`)
      } else if (toModelNode.type !== 'Model') {
        errors.push(`Relation node ${node.id} requires toModelId ${toModelId} to reference a Model node`)
      }
    }
  }

  return errors
}
