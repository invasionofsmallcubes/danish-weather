/**
 * Tests for the shared proxy client (lib/api/proxy.ts).
 *
 * Covers:
 *  - fetchWithRetry: success, HTTP error, retry backoff, exhausted retries, abort on timeout
 *  - getProxyData: URL construction, in-flight deduplication, cache cleared after resolve/reject,
 *    error propagation, concurrent requests for different coordinates
 */

import { getProxyData } from '@/lib/api/proxy'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeOkResponse(body: object): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function makeErrorResponse(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
  } as unknown as Response
}

const sampleProxyPayload = {
  yr: { foo: 'bar' },
  yrForecast: null,
  dmi: { baz: 42 },
  dmiEdr: null,
  errors: { yr: null, yrForecast: null, dmi: null, dmiEdr: null },
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers()
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.useRealTimers()
  jest.clearAllMocks()
})

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Runs all pending timers and flushes the microtask queue in a loop until
 * no more timers are pending. This reliably drains retry delays + abort timeouts
 * without creating unhandled rejection races.
 */
async function drainTimersAndMicrotasks(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await jest.runAllTimersAsync()
    await Promise.resolve()
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getProxyData', () => {
  it('builds the correct URL and returns parsed JSON', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(makeOkResponse(sampleProxyPayload))

    const promise = getProxyData(55.6761, 12.5683)
    await drainTimersAndMicrotasks()
    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(calledUrl).toBe('/api/weather?latitude=55.6761&longitude=12.5683')
    expect(result).toEqual(sampleProxyPayload)
  })

  it('deduplicates concurrent requests for the same coordinates', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(makeOkResponse(sampleProxyPayload))

    const p1 = getProxyData(55.0, 12.0)
    const p2 = getProxyData(55.0, 12.0)
    await drainTimersAndMicrotasks()

    const [r1, r2] = await Promise.all([p1, p2])

    // Only one actual fetch should have been made
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(r1).toEqual(sampleProxyPayload)
    expect(r2).toEqual(sampleProxyPayload)
  })

  it('does NOT deduplicate requests with different coordinates', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeOkResponse({ ...sampleProxyPayload, yr: 'first' }))
      .mockResolvedValueOnce(makeOkResponse({ ...sampleProxyPayload, yr: 'second' }))

    const p1 = getProxyData(55.0, 12.0)
    const p2 = getProxyData(56.0, 13.0)
    await drainTimersAndMicrotasks()

    const [r1, r2] = await Promise.all([p1, p2])

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(r1.yr).toBe('first')
    expect(r2.yr).toBe('second')
  })

  it('clears the in-flight cache after a successful fetch, allowing a fresh request', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeOkResponse({ ...sampleProxyPayload, yr: 'first' }))
      .mockResolvedValueOnce(makeOkResponse({ ...sampleProxyPayload, yr: 'second' }))

    const first = getProxyData(55.0, 12.0)
    await drainTimersAndMicrotasks()
    await first

    // Cache is cleared after first resolves — second call triggers a new fetch
    const second = getProxyData(55.0, 12.0)
    await drainTimersAndMicrotasks()
    const result = await second

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result.yr).toBe('second')
  })

  it('clears the in-flight cache after a failed fetch, allowing a subsequent call', async () => {
    // 3 failures (initial + 2 retries), then 1 success on the next independent call
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'))
      .mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'))
      .mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'))
      .mockResolvedValueOnce(makeOkResponse(sampleProxyPayload))

    const failing = getProxyData(55.0, 12.0)
    // Catch it so it doesn't surface as unhandled while we drain timers
    const failingCaught = failing.catch(() => null)
    await drainTimersAndMicrotasks()
    await failingCaught
    await expect(failing).rejects.toThrow('HTTP 500')

    // Cache cleared → next call should trigger a fresh fetch
    const recovery = getProxyData(55.0, 12.0)
    await drainTimersAndMicrotasks()
    const result = await recovery

    // 3 failed attempts + 1 successful recovery
    expect(global.fetch).toHaveBeenCalledTimes(4)
    expect(result).toEqual(sampleProxyPayload)
  })

  it('propagates HTTP error after exhausting all retries', async () => {
    // Same bad response for all 3 attempts (initial + 2 retries)
    ;(global.fetch as jest.Mock).mockResolvedValue(makeErrorResponse(503, 'Service Unavailable'))

    const promise = getProxyData(55.0, 12.0)
    const caught = promise.catch(() => null) // prevent unhandled rejection during timer drain
    await drainTimersAndMicrotasks()
    await caught

    await expect(promise).rejects.toThrow('HTTP 503: Service Unavailable')
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('propagates a network-level error after exhausting all retries', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(makeErrorResponse(502, 'Bad Gateway'))

    const promise = getProxyData(55.0, 12.0)
    const caught = promise.catch(() => null)
    await drainTimersAndMicrotasks()
    await caught

    await expect(promise).rejects.toThrow('HTTP 502: Bad Gateway')
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('retries on HTTP error and succeeds on the second attempt', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'))
      .mockResolvedValueOnce(makeOkResponse(sampleProxyPayload))

    const promise = getProxyData(55.0, 12.0)
    await drainTimersAndMicrotasks()
    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual(sampleProxyPayload)
  })

  it('retries twice on HTTP error and succeeds on the third attempt', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeErrorResponse(503, 'Service Unavailable'))
      .mockResolvedValueOnce(makeErrorResponse(503, 'Service Unavailable'))
      .mockResolvedValueOnce(makeOkResponse(sampleProxyPayload))

    const promise = getProxyData(55.0, 12.0)
    await drainTimersAndMicrotasks()
    const result = await promise

    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(result).toEqual(sampleProxyPayload)
  })

  it('aborts the request when the timeout fires and retries', async () => {
    // First attempt hangs; AbortController fires after 10 s and rejects the fetch
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce((_url: string, init: RequestInit) => {
        return new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
          // Deliberately never resolves — abort signal drives rejection
        })
      })
      // Subsequent retries succeed immediately
      .mockResolvedValueOnce(makeOkResponse(sampleProxyPayload))

    const promise = getProxyData(55.0, 12.0)
    // Advance past the 10 s abort timeout so the signal fires
    await drainTimersAndMicrotasks()
    const result = await promise

    // First attempt aborted, second attempt succeeded
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(result).toEqual(sampleProxyPayload)
  })

  it('rejects when all retries are aborted by timeout', async () => {
    // All three attempts hang until aborted
    const makeHangingFetch = (_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })

    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(makeHangingFetch)
      .mockImplementationOnce(makeHangingFetch)
      .mockImplementationOnce(makeHangingFetch)

    const promise = getProxyData(55.0, 12.0)
    const caught = promise.catch(() => null)
    await drainTimersAndMicrotasks()
    await caught

    await expect(promise).rejects.toThrow()
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })
})
