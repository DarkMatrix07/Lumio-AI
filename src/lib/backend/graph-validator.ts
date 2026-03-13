import type { LumioBackendGraph, LumioGraphNode } from '@/types/lumio'

const getStringConfig = (node: LumioGraphNode, key: string): string => {
  const value = node.config[key]
  return typeof value === 'string' ? value.trim() : ''
}

export const validateBackendGraph = (graph: LumioBackendGraph): string[] => {
  const errors: string[] = []

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))

  for (const node of graph.nodes) {
    if (node.type === 'GET' || node.type === 'POST' || node.type === 'PUT' || node.type === 'DELETE' || node.type === 'PATCH') {
      const path = getStringConfig(node, 'path')
      if (!path) {
        errors.push(`${node.type} node ${node.id} is missing config.path`)
      }
    }

    if (node.type === 'Model') {
      const model = getStringConfig(node, 'model')
      if (!model) {
        errors.push(`Model node ${node.id} is missing config.model`)
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
      }
    }

    if (node.type === 'RateLimit') {
      const limit = node.config['limit']
      const windowMs = node.config['windowMs']
      if (limit === undefined || limit === '') {
        errors.push(`RateLimit node ${node.id} is missing config.limit`)
      }
      if (windowMs === undefined || windowMs === '') {
        errors.push(`RateLimit node ${node.id} is missing config.windowMs`)
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
