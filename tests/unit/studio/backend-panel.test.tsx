import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'

import { BackendPanel } from '@/components/studio/BackendPanel'
import { useBackendGraphStore } from '@/store/backend-graph-store'

describe('BackendPanel', () => {
  beforeEach(() => {
    useBackendGraphStore.getState().reset()
  })

  test('renders grouped palette sections and backend empty states', () => {
    render(<BackendPanel />)

    expect(screen.getByPlaceholderText('Search backend blocks')).toBeInTheDocument()
    expect(screen.getByText('Endpoints')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getAllByText('Middleware').length).toBeGreaterThan(0)
    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('No backend services yet')).toBeInTheDocument()
    expect(screen.getByText('Select a node to edit its properties.')).toBeInTheDocument()
  })

  test('filters grouped palette items by search query', () => {
    render(<BackendPanel />)

    fireEvent.change(screen.getByPlaceholderText('Search backend blocks'), {
      target: { value: 'jwt' },
    })

    expect(screen.getByRole('button', { name: 'Add JWT Auth' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add GET' })).not.toBeInTheDocument()
  })

  test('adds a backend node from the palette and updates hierarchy count', () => {
    render(<BackendPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Add GET' }))

    const state = useBackendGraphStore.getState()
    expect(state.nodes).toHaveLength(1)
    expect(state.nodes[0]?.type).toBe('GET')
    expect(screen.getByText('Hierarchy (1)')).toBeInTheDocument()
    expect(screen.getByLabelText('Path')).toBeInTheDocument()
  })

  test('edits selected node properties through the focused properties renderer', () => {
    render(<BackendPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'Add GET' }))
    fireEvent.change(screen.getByLabelText('Path'), {
      target: { value: '/users' },
    })

    const state = useBackendGraphStore.getState()
    expect(state.nodes[0]?.config.path).toBe('/users')
  })
})
