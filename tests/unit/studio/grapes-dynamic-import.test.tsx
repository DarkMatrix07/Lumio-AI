import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>, options?: { ssr?: boolean }) => {
    return function MockDynamic() {
      return (
        <div data-testid="grapes-dynamic-shell" data-ssr={(options?.ssr ?? true).toString()}>
          dynamic-wrapper
        </div>
      )
    }
  },
}))

import { GrapesCanvas } from '@/components/canvas/GrapesCanvas'

describe('GrapesCanvas', () => {
  test('uses dynamic wrapper with ssr disabled', () => {
    render(<GrapesCanvas />)

    const shell = screen.getByTestId('grapes-dynamic-shell')
    expect(shell).toBeInTheDocument()
    expect(shell.getAttribute('data-ssr')).toBe('false')
  })
})
