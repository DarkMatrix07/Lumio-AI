import { describe, expect, test } from 'vitest'

import { applyAutoLayout } from '@/lib/backend/auto-layout'
import { expandTemplateNode } from '@/lib/backend/templates'
import type { LumioTemplateNode } from '@/types/lumio'

describe('backend auto-layout and template expansion', () => {
  test('expands AuthSystem template into deterministic node and edge set', () => {
    const templateNode: LumioTemplateNode = {
      id: 'tpl-auth',
      type: 'Template',
      label: 'Auth Template',
      config: {
        templateKind: 'AuthSystem',
      },
    }

    const expanded = expandTemplateNode(templateNode)

    expect(expanded.nodes.map((node) => node.id)).toEqual([
      'tpl-auth-jwt',
      'tpl-auth-model-user',
      'tpl-auth-post-login',
      'tpl-auth-get-me',
    ])

    expect(expanded.edges.map((edge) => edge.id)).toEqual([
      'tpl-auth-edge-jwt-login',
      'tpl-auth-edge-jwt-me',
      'tpl-auth-edge-model-me',
    ])
  })

  test('expands CrudApi and ChatSystem templates', () => {
    const crud = expandTemplateNode({
      id: 'tpl-crud',
      type: 'Template',
      label: 'CRUD',
      config: { templateKind: 'CrudApi' },
    })
    const chat = expandTemplateNode({
      id: 'tpl-chat',
      type: 'Template',
      label: 'CHAT',
      config: { templateKind: 'ChatSystem' },
    })

    expect(crud.nodes.map((node) => node.id)).toEqual(['tpl-crud-model-item', 'tpl-crud-get-items', 'tpl-crud-post-items'])
    expect(chat.nodes.map((node) => node.id)).toEqual(['tpl-chat-model-message', 'tpl-chat-get-messages', 'tpl-chat-post-messages'])
  })

  test('preserves existing positions and does not overwrite them', () => {
    const nodes = [
      { id: 'n1', type: 'GET', label: 'A', config: { x: 500, y: 500 } },
      { id: 'n2', type: 'POST', label: 'B', config: {} },
    ] as const

    const laidOut = applyAutoLayout(nodes)
    const cfg = laidOut.map((n) => ({ id: n.id, x: (n.config as Record<string, unknown>).x, y: (n.config as Record<string, unknown>).y }))

    // n1 had a position — must be unchanged
    expect(cfg[0]).toEqual({ id: 'n1', x: 500, y: 500 })
    // n2 had no position — gets grid slot 0
    expect(cfg[1]).toEqual({ id: 'n2', x: 80, y: 80 })
  })

  test('applies deterministic grid positions to nodes', () => {
    const nodes = [
      { id: 'n1', type: 'GET', label: 'A', config: {} },
      { id: 'n2', type: 'POST', label: 'B', config: {} },
      { id: 'n3', type: 'Model', label: 'C', config: {} },
    ] as const

    const laidOut = applyAutoLayout(nodes)

    expect(
      laidOut.map((node) => ({
        id: node.id,
        x: (node.config as Record<string, unknown>).x,
        y: (node.config as Record<string, unknown>).y,
      })),
    ).toEqual([
      { id: 'n1', x: 80, y: 80 },
      { id: 'n2', x: 360, y: 80 },
      { id: 'n3', x: 640, y: 80 },
    ])
  })
})
