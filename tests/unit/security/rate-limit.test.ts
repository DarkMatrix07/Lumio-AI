import { describe, expect, test } from 'vitest'

import { checkRateLimit, clearRateLimitState } from '@/lib/security/rate-limit'

describe('checkRateLimit', () => {
  test('blocks after limit is exceeded within window', () => {
    clearRateLimitState()

    const key = 'ip:127.0.0.1'

    for (let i = 0; i < 20; i += 1) {
      const result = checkRateLimit(key)
      expect(result.allowed).toBe(true)
    }

    const blocked = checkRateLimit(key)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
})
