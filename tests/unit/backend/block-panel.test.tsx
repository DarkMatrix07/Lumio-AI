import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'

import { BackendBlockPanel } from '@/components/studio/BackendBlockPanel'
import { useBackendGraphStore } from '@/store/backend-graph-store'

describe('BackendBlockPanel', () => {
  beforeEach(() => {
    useBackendGraphStore.getState().reset()
  })

  test('renders backend block categories', () => {
    render(<BackendBlockPanel />)

    expect(screen.getAllByText('Endpoints').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Data').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Security').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Middleware').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Templates').length).toBeGreaterThan(0)
  })

  test('click-to-add appends typed node to graph store', () => {
    render(<BackendBlockPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Add GET' }))

    const state = useBackendGraphStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0]?.type).toBe('GET')
  })

  test('adding template expands into deterministic nodes and edges', () => {
    render(<BackendBlockPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Auth System' }))

    const state = useBackendGraphStore.getState()
    expect(state.nodes.map((node) => node.id)).toEqual([
      'template-000001-jwt',
      'template-000001-model-user',
      'template-000001-post-login',
      'template-000001-get-me',
    ])
    expect(state.edges).toHaveLength(3)
    expect(state.selectedNodeId).toBe('template-000001-jwt')
  })

  test('search filters block list', () => {
    render(<BackendBlockPanel />)

    fireEvent.change(screen.getByPlaceholderText('Search blocks…'), {
      target: { value: 'jwt' },
    })

    expect(screen.getByRole('button', { name: 'Add JWT' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add GET' })).not.toBeInTheDocument()
  })
})
