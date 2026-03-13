import { describe, expect, test, vi } from 'vitest'

import { createTimeoutController, withProviderTimeout } from '@/lib/ai/providers/transports'

describe('createTimeoutController', () => {
  test('aborts signal after configured timeout', () => {
    vi.useFakeTimers()

    const { controller, timeoutId } = createTimeoutController(100)

    expect(controller.signal.aborted).toBe(false)

    vi.advanceTimersByTime(100)

    expect(controller.signal.aborted).toBe(true)

    clearTimeout(timeoutId)
    vi.useRealTimers()
  })

  test('clears timeout only after wrapped stream is consumed', async () => {
    vi.useFakeTimers()

    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const stream = withProviderTimeout(
      async function* () {
        yield { text: 'a', done: false }
        yield { text: '', done: true }
      },
      1_000,
    )

    const iterator = stream({ prompt: 'hello' })[Symbol.asyncIterator]()

    const first = await iterator.next()
    expect(first.done).toBe(false)
    expect(clearTimeoutSpy).not.toHaveBeenCalled()

    const second = await iterator.next()
    expect(second.done).toBe(false)
    expect(clearTimeoutSpy).not.toHaveBeenCalled()

    const third = await iterator.next()
    expect(third.done).toBe(true)
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)

    clearTimeoutSpy.mockRestore()
    vi.useRealTimers()
  })
})
