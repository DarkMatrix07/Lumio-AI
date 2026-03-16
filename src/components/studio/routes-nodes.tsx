'use client'

import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { PageNodeData, ServiceNodeData } from '@/store/routes-graph-store'

/* ── Method color map ── */
const METHOD_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  GET: { text: '#34d399', bg: '#052e16', border: '#166534' },
  POST: { text: '#60a5fa', bg: '#172554', border: '#1e40af' },
  PUT: { text: '#fb923c', bg: '#431407', border: '#9a3412' },
  DELETE: { text: '#f87171', bg: '#450a0a', border: '#991b1b' },
  PATCH: { text: '#c084fc', bg: '#2e1065', border: '#6b21a8' },
}

function getMethodFromEndpoint(ep: string): string {
  const method = ep.split(' ')[0]?.toUpperCase() ?? ''
  return METHOD_COLORS[method] ? method : ''
}

/* ── PageNode ── */
export function PageNode({ data }: NodeProps) {
  const { label, path, elements } = data as PageNodeData

  return (
    <div className="min-w-[200px] rounded-lg border border-indigo-500/20 bg-[#1c1c24] shadow-lg shadow-indigo-500/5 text-[11px] text-zinc-200">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-indigo-500/10 bg-gradient-to-r from-indigo-500/8 to-transparent">
        <div className="w-7 h-7 rounded-md bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="1" width="10" height="13" rx="1.5" />
            <line x1="5" y1="5" x2="9" y2="5" />
            <line x1="5" y1="8" x2="11" y2="8" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-white leading-tight truncate">{label}</div>
          <div className="font-mono text-[10px] text-indigo-400/70 mt-0.5 truncate">{path}</div>
        </div>
      </div>

      {/* Elements */}
      <div className="py-1.5">
        {(elements as string[]).map((el, i) => (
          <div
            key={`${el}-${i}`}
            className="relative flex items-center gap-2 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[.03] transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 flex-shrink-0" />
            <span className="flex-1 truncate">{el}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={el}
              style={{
                right: -5,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 10,
                height: 10,
                background: '#818cf8',
                border: '2px solid #1c1c24',
                borderRadius: '50%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Footer badge */}
      <div className="flex justify-end px-3 py-1.5 border-t border-indigo-500/10">
        <span className="text-[8px] font-bold tracking-wider text-indigo-400 bg-indigo-500/10 rounded px-1.5 py-0.5 uppercase">
          Page
        </span>
      </div>
    </div>
  )
}

/* ── ServiceNode ── */
export function ServiceNode({ data }: NodeProps) {
  const { label, port, endpoints, authNodes } = data as ServiceNodeData

  return (
    <div className="min-w-[220px] rounded-lg border border-emerald-500/20 bg-[#181f1d] shadow-lg shadow-emerald-500/5 text-[11px] text-zinc-200">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-emerald-500/10 bg-gradient-to-r from-emerald-500/8 to-transparent">
        <div className="w-7 h-7 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="2" width="14" height="4" rx="1" />
            <rect x="1" y="9" width="14" height="4" rx="1" />
            <circle cx="13" cy="4" r="0.8" fill="#34d399" stroke="none" />
            <circle cx="13" cy="11" r="0.8" fill="#34d399" stroke="none" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-white leading-tight truncate">{label}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400/80 font-mono">:{port}</span>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      {(endpoints as string[]).length > 0 && (
        <div className="py-1.5">
          <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider px-3 pb-1">
            Endpoints
          </div>
          {(endpoints as string[]).map((ep, i) => {
            const method = getMethodFromEndpoint(ep)
            const colors = METHOD_COLORS[method]
            const pathPart = ep.replace(/^[A-Z]+\s*/, '')

            return (
              <div
                key={`${ep}-${i}`}
                className="relative flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-white/[.03] transition-colors"
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={ep}
                  style={{
                    left: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 10,
                    height: 10,
                    background: '#34d399',
                    border: '2px solid #181f1d',
                    borderRadius: '50%',
                  }}
                />
                {method && colors ? (
                  <>
                    <span
                      className="text-[8px] font-bold rounded px-1 py-px tracking-wide flex-shrink-0"
                      style={{ color: colors.text, background: colors.bg, border: `1px solid ${colors.border}` }}
                    >
                      {method}
                    </span>
                    <span className="font-mono text-zinc-400 truncate flex-1">{pathPart}</span>
                  </>
                ) : (
                  <span className="font-mono text-zinc-400 truncate flex-1">{ep}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Auth guards */}
      {(authNodes as string[]).length > 0 && (
        <div className="py-1.5 border-t border-emerald-500/10">
          <div className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider px-3 pb-1">
            Auth Guards
          </div>
          {(authNodes as string[]).map((auth, i) => (
            <div
              key={`${auth}-${i}`}
              className="relative flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-white/[.03] transition-colors"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`auth-${auth}`}
                style={{
                  left: -5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 10,
                  height: 10,
                  background: '#f59e0b',
                  border: '2px solid #181f1d',
                  borderRadius: '50%',
                }}
              />
              <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="#f59e0b" strokeWidth="1.6" className="flex-shrink-0">
                <path d="M8 1.5L3 4v4c0 3.3 2.2 5.7 5 6.5 2.8-.8 5-3.2 5-6.5V4L8 1.5z" strokeLinejoin="round" />
              </svg>
              <span className="text-amber-300/80 flex-1 truncate">{auth}</span>
              <span className="text-[8px] text-zinc-600">guard</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer badge */}
      <div className="flex justify-end px-3 py-1.5 border-t border-emerald-500/10">
        <span className="text-[8px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5 uppercase">
          Service
        </span>
      </div>
    </div>
  )
}
