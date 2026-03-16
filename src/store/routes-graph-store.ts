import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

export type PageNodeData = {
  label: string
  path: string
  elements: string[]
}

export type ServiceNodeData = {
  label: string
  port: number
  endpoints: string[]
  authNodes: string[]
}

type RoutesGraphState = {
  nodes: Node[]
  edges: Edge[]
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addPageNode: (page: { id: string; name: string; path: string; elements: string[] }) => void
  addServiceNode: (service: { id: string; label: string; port: number; endpoints: string[]; authNodes: string[] }) => void
}

export const useRoutesGraphStore = create<RoutesGraphState>((set) => ({
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addPageNode: (page) =>
    set((state) => {
      if (state.nodes.find((n) => n.id === `page-${page.id}`)) return state
      const pageCount = state.nodes.filter((n) => n.type === 'pageNode').length
      const newNode: Node = {
        id: `page-${page.id}`,
        type: 'pageNode',
        position: { x: 100 + pageCount * 220, y: 150 },
        data: { label: page.name, path: page.path, elements: page.elements },
      }
      return { nodes: [...state.nodes, newNode] }
    }),
  addServiceNode: (service) =>
    set((state) => {
      if (state.nodes.find((n) => n.id === `service-${service.id}`)) return state
      const serviceCount = state.nodes.filter((n) => n.type === 'serviceNode').length
      const newNode: Node = {
        id: `service-${service.id}`,
        type: 'serviceNode',
        position: { x: 600 + serviceCount * 280, y: 150 },
        data: {
          label: service.label,
          port: service.port,
          endpoints: service.endpoints,
          authNodes: service.authNodes,
        },
      }
      return { nodes: [...state.nodes, newNode] }
    }),
}))
