import type { LumioGraphNode } from '@/types/lumio'

const GRID_X_START = 80
const GRID_Y_START = 80
const GRID_X_GAP = 280
const GRID_Y_GAP = 220
const GRID_COLUMNS = 3

export const applyAutoLayout = <T extends LumioGraphNode>(nodes: readonly T[]): T[] => {
  let gridIndex = 0

  return nodes.map((node) => {
    const cfg = node.config as Record<string, unknown>

    // Skip nodes that already have a manual position (drag-and-drop safe).
    if (typeof cfg.x === 'number' && typeof cfg.y === 'number') {
      return node
    }

    const row = Math.floor(gridIndex / GRID_COLUMNS)
    const col = gridIndex % GRID_COLUMNS
    gridIndex += 1

    return {
      ...node,
      config: {
        ...node.config,
        x: GRID_X_START + col * GRID_X_GAP,
        y: GRID_Y_START + row * GRID_Y_GAP,
      },
    }
  })
}
