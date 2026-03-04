/**
 * Shared proxy client for /api/weather.
 *
 * Next.js 15 deduplicates fetch() calls to the same URL within a render,
 * returning the same Response object. Since a Response body can only be
 * consumed once, multiple callers that each do response.json() on the same
 * URL would all fail after the first read.
 *
 * This module owns ONE fetch call per (latitude, longitude) pair and caches
 * the parsed JSON in a Map keyed by the request URL. All client API functions
 * (yr.ts, dmi.ts) call getProxyData() instead of fetching /api/weather directly.
 */

import { type ForecastHour } from '@/lib/schemas/forecast'

interface ProxyResponse {
  yr: unknown
  yrForecast: ForecastHour[] | null
  dmi: unknown
  dmiEdr: ForecastHour[] | null
  errors: {
    yr: string | null
    yrForecast: string | null
    dmi: string | null
    dmiEdr: string | null
  }
}

interface FetchOptions {
  timeout?: number
  retries?: number
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 10000,
  retries: 2,
}

/** In-flight promise cache — cleared after each resolved fetch so data stays fresh. */
const inFlight = new Map<string, Promise<ProxyResponse>>()

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const timeout = options.timeout ?? /* v8 ignore next */ DEFAULT_OPTIONS.timeout
  const retries = options.retries ?? /* v8 ignore next */ DEFAULT_OPTIONS.retries

  let lastError: Error | null = null

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, { signal: controller.signal })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : /* v8 ignore next */ new Error(String(error))
      /* v8 ignore start */
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
      /* v8 ignore stop */
    }
  }

  throw lastError ?? /* v8 ignore next */ new Error('Failed to fetch after retries')
}

/**
 * Fetch /api/weather once per URL and return the parsed body.
 * Concurrent calls with the same URL share a single in-flight request.
 */
export async function getProxyData(
  latitude: number,
  longitude: number,
): Promise<ProxyResponse> {
  const url = `/api/weather?latitude=${latitude}&longitude=${longitude}`

  const existing = inFlight.get(url)
  if (existing) return existing

  const promise = fetchWithRetry(url, { timeout: 10000, retries: 2 })
    .then((res) => res.json() as Promise<ProxyResponse>)
    .finally(() => inFlight.delete(url))

  inFlight.set(url, promise)
  return promise
}
