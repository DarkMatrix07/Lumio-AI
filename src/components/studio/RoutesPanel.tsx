'use client'

import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeTypes,
} from '@xyflow/react'

import { useRoutesGraphStore } from '@/store/routes-graph-store'
import { PageNode, ServiceNode } from './routes-nodes'

/* ── Node types registry ── */
const nodeTypes: NodeTypes = {
  pageNode: PageNode,
  serviceNode: ServiceNode,
}

/* ── Main panel export — canvas only ── */
export function RoutesPanel() {
  const storeNodes = useRoutesGraphStore((s) => s.nodes)
  const storeEdges = useRoutesGraphStore((s) => s.edges)
  const setStoreEdges = useRoutesGraphStore((s) => s.setEdges)

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges)

  useEffect(() => { setNodes(storeNodes) }, [storeNodes, setNodes])
  useEffect(() => { setEdges(storeEdges) }, [storeEdges, setEdges])

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => { onNodesChange(changes) },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => { onEdgesChange(changes) },
    [onEdgesChange],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const updated = addEdge(
          { ...connection, animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } },
          eds,
        )
        setStoreEdges(updated)
        return updated
      })
    },
    [setEdges, setStoreEdges],
  )

  const isEmpty = nodes.length === 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#111113]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-10 border-b border-[#232326] bg-[#18181b] flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="1.5">
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="12" cy="4" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <path d="M5.5 7.2L10.5 4.8M5.5 8.8L10.5 11.2" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-semibold text-zinc-300">Routing Canvas</span>
        </div>
        <span className="text-[10px] text-zinc-600 bg-[#1e1e22] border border-[#2a2a2e] rounded px-2 py-0.5">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        {!isEmpty && (
          <span className="text-[9px] text-zinc-700">Drag to connect page elements to service endpoints</span>
        )}
      </div>

      {/* React Flow canvas */}
      <div className="flex-1 relative">
        <style>{`
          .react-flow { --xy-background-color: #111113; }
          .react-flow__controls { background: #1e1e22; border: 1px solid #2a2a2e; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,.4); }
          .react-flow__controls-button { background: #1e1e22; border-bottom: 1px solid #2a2a2e; fill: #71717a; }
          .react-flow__controls-button:hover { background: #2a2a2e; fill: #a1a1aa; }
          .react-flow__minimap { background: #18181b; border: 1px solid #2a2a2e; border-radius: 8px; overflow: hidden; }
          .react-flow__attribution { display: none; }
        `}</style>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          style={{ background: '#111113' }}
          defaultEdgeOptions={{ animated: true, style: { stroke: '#818cf8', strokeWidth: 2 } }}
        >
          <Background color="#252528" gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => node.type === 'pageNode' ? '#818cf8' : '#34d399'}
            maskColor="rgba(0,0,0,.6)"
            style={{ width: 140, height: 90 }}
          />
        </ReactFlow>

        {/* Empty state overlay */}
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 border border-[#2a2a2e] flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#52525b" strokeWidth="1.3">
                <circle cx="6" cy="12" r="2" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="18" cy="18" r="2" />
                <path d="M8 11l8-4M8 13l8 4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-zinc-500">Connect your pages to services</p>
            <p className="text-[11px] text-zinc-700 mt-1.5 max-w-[280px] text-center leading-relaxed">
              Add pages and services from the side panel, then drag connections between them.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
