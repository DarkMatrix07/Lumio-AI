import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/components/studio/BuilderStudio', () => ({
  BuilderStudio: () => <div data-testid="builder-studio">builder-studio</div>,
}))

import BuilderPage from '@/app/builder/page'

describe('builder page', () => {
  test('renders builder studio shell', () => {
    render(<BuilderPage />)

    expect(screen.getByTestId('builder-studio')).toBeInTheDocument()
  })
})
