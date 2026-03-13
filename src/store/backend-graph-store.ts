import { create } from 'zustand'

import { applyAutoLayout } from '@/lib/backend/auto-layout'
import { expandTemplateNode } from '@/lib/backend/templates'
import type { LumioGraphEdge, LumioGraphNode, LumioTemplateKind, LumioTemplateNode } from '@/types/lumio'

const cloneNode = <T extends LumioGraphNode>(node: T): T => {
  if (node.type === 'Template') {
    return {
      ...node,
      config: {
        ...node.config,
        templateKind: node.config.templateKind,
      },
    }
  }

  return {
    ...node,
    config: { ...node.config },
  }
}

const cloneEdge = (edge: LumioGraphEdge): LumioGraphEdge => ({
  ...edge,
})

type BackendGraphState = {
  nodes: LumioGraphNode[]
  edges: LumioGraphEdge[]
  selectedNodeId: string | null
  setNodes: (nodes: LumioGraphNode[]) => void
  setEdges: (edges: LumioGraphEdge[]) => void
  setSelectedNodeId: (selectedNodeId: string | null) => void
  addNode: (node: LumioGraphNode) => void
  addEdge: (edge: LumioGraphEdge) => void
  updateNodeConfig: (nodeId: string, configPatch: Record<string, unknown>) => void
  reset: () => void
}

const initialState = {
  nodes: [] as LumioGraphNode[],
  edges: [] as LumioGraphEdge[],
  selectedNodeId: null as string | null,
}

export const useBackendGraphStore = create<BackendGraphState>((set) => ({
  ...initialState,
  setNodes: (nodes) => {
    set(() => ({ nodes: nodes.map(cloneNode) }))
  },
  setEdges: (edges) => {
    set(() => ({ edges: edges.map(cloneEdge) }))
  },
  setSelectedNodeId: (selectedNodeId) => {
    set(() => ({ selectedNodeId }))
  },
  addNode: (node) => {
    set((state) => {
      if (node.type === 'Template') {
        const nextTemplateIndex = state.nodes.filter((item) => item.id.startsWith('template-')).length + 1
        const templateNode: LumioTemplateNode = {
          id: `template-${nextTemplateIndex.toString().padStart(6, '0')}`,
          type: 'Template',
          label: node.label,
          config: {
            templateKind: node.config.templateKind,
          },
        }

        const expanded = expandTemplateNode(templateNode)
        const nextNodes = applyAutoLayout([...state.nodes, ...expanded.nodes].map(cloneNode))

        return {
          nodes: nextNodes,
          edges: [...state.edges, ...expanded.edges.map(cloneEdge)],
          selectedNodeId: expanded.nodes[0]?.id ?? state.selectedNodeId,
        }
      }

      const nextNodes = applyAutoLayout([...state.nodes, cloneNode(node)])

      return {
        nodes: nextNodes,
        selectedNodeId: node.id,
      }
    })
  },
  addEdge: (edge) => {
    set((state) => ({ edges: [...state.edges, cloneEdge(edge)] }))
  },
  updateNodeConfig: (nodeId, configPatch) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node
        }

        if (node.type === 'Template') {
          const nextTemplateKind = configPatch.templateKind
          const isTemplateKind =
            nextTemplateKind === 'AuthSystem' || nextTemplateKind === 'CrudApi' || nextTemplateKind === 'ChatSystem'

          return cloneNode({
            ...node,
            config: {
              ...node.config,
              ...configPatch,
              templateKind: (isTemplateKind ? nextTemplateKind : node.config.templateKind) as LumioTemplateKind,
            },
          })
        }

        return cloneNode({
          ...node,
          config: {
            ...node.config,
            ...configPatch,
          },
        })
      }),
    }))
  },
  reset: () => {
    set(() => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    }))
  },
}))
