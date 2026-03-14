import { describe, expect, test } from 'vitest'

import { checkOrigin } from '@/lib/security/origin-check'

const makeRequest = (origin: string) =>
  new Request('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: {
      Origin: origin,
    },
  })

describe('checkOrigin', () => {
  test('allows localhost:3100 for isolated e2e server', () => {
    const result = checkOrigin(makeRequest('http://localhost:3100'))
    expect(result.ok).toBe(true)
  })

  test('allows 127.0.0.1:3100 for isolated e2e server', () => {
    const result = checkOrigin(makeRequest('http://127.0.0.1:3100'))
    expect(result.ok).toBe(true)
  })
})
