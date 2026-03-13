import type { LumioGraphEdge, LumioGraphNode, LumioTemplateNode } from '@/types/lumio'

type ExpandedTemplate = {
  nodes: LumioGraphNode[]
  edges: LumioGraphEdge[]
}

const expandAuthSystemTemplate = (templateNode: LumioTemplateNode): ExpandedTemplate => {
  const baseId = templateNode.id

  const nodes: LumioGraphNode[] = [
    {
      id: `${baseId}-jwt`,
      type: 'JWT',
      label: 'JWT Auth',
      config: {},
    },
    {
      id: `${baseId}-model-user`,
      type: 'Model',
      label: 'User',
      config: { model: 'User' },
    },
    {
      id: `${baseId}-post-login`,
      type: 'POST',
      label: 'POST /auth/login',
      config: { path: '/auth/login' },
    },
    {
      id: `${baseId}-get-me`,
      type: 'GET',
      label: 'GET /auth/me',
      config: { path: '/auth/me' },
    },
  ]

  const edges: LumioGraphEdge[] = [
    {
      id: `${baseId}-edge-jwt-login`,
      source: `${baseId}-jwt`,
      target: `${baseId}-post-login`,
    },
    {
      id: `${baseId}-edge-jwt-me`,
      source: `${baseId}-jwt`,
      target: `${baseId}-get-me`,
    },
    {
      id: `${baseId}-edge-model-me`,
      source: `${baseId}-model-user`,
      target: `${baseId}-get-me`,
    },
  ]

  return { nodes, edges }
}

const expandCrudApiTemplate = (templateNode: LumioTemplateNode): ExpandedTemplate => {
  const baseId = templateNode.id

  const nodes: LumioGraphNode[] = [
    {
      id: `${baseId}-model-item`,
      type: 'Model',
      label: 'Item',
      config: { model: 'Item' },
    },
    {
      id: `${baseId}-get-items`,
      type: 'GET',
      label: 'GET /items',
      config: { path: '/items' },
    },
    {
      id: `${baseId}-post-items`,
      type: 'POST',
      label: 'POST /items',
      config: { path: '/items' },
    },
  ]

  const edges: LumioGraphEdge[] = [
    {
      id: `${baseId}-edge-model-get`,
      source: `${baseId}-model-item`,
      target: `${baseId}-get-items`,
    },
    {
      id: `${baseId}-edge-model-post`,
      source: `${baseId}-model-item`,
      target: `${baseId}-post-items`,
    },
  ]

  return { nodes, edges }
}

const expandChatSystemTemplate = (templateNode: LumioTemplateNode): ExpandedTemplate => {
  const baseId = templateNode.id

  const nodes: LumioGraphNode[] = [
    {
      id: `${baseId}-model-message`,
      type: 'Model',
      label: 'Message',
      config: { model: 'Message' },
    },
    {
      id: `${baseId}-get-messages`,
      type: 'GET',
      label: 'GET /messages',
      config: { path: '/messages' },
    },
    {
      id: `${baseId}-post-messages`,
      type: 'POST',
      label: 'POST /messages',
      config: { path: '/messages' },
    },
  ]

  const edges: LumioGraphEdge[] = [
    {
      id: `${baseId}-edge-model-get`,
      source: `${baseId}-model-message`,
      target: `${baseId}-get-messages`,
    },
    {
      id: `${baseId}-edge-model-post`,
      source: `${baseId}-model-message`,
      target: `${baseId}-post-messages`,
    },
  ]

  return { nodes, edges }
}

export const expandTemplateNode = (templateNode: LumioTemplateNode): ExpandedTemplate => {
  switch (templateNode.config.templateKind) {
    case 'AuthSystem':
      return expandAuthSystemTemplate(templateNode)
    case 'CrudApi':
      return expandCrudApiTemplate(templateNode)
    case 'ChatSystem':
      return expandChatSystemTemplate(templateNode)
    default:
      return { nodes: [], edges: [] }
  }
}
