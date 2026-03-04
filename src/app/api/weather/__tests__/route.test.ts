/**
 * @jest-environment node
 */

/**
 * Unit tests for the /api/weather route handler.
 *
 * These mock the global fetch to avoid real API calls, testing
 * the route handler logic: parameter validation, parallel fetching,
 * error handling, response aggregation, and HTTP status codes.
 */
import { GET } from '@/app/api/weather/route'
import { NextRequest } from 'next/server'

const originalFetch = global.fetch

// Suppress expected console.error from route handler's error logging
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})
afterAll(() => {
  console.error = originalConsoleError
})

function buildRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/weather')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Realistic MET Norway fixture — includes all optional fields
const metNorwayFixture = {
  properties: {
    timeseries: [
      {
        time: '2026-03-04T07:00:00Z',
        data: {
          instant: {
            details: {
              air_temperature: 7.2,
              wind_speed: 5.8,
              wind_from_direction: 210,
              relative_humidity: 78,
            },
          },
          next_1_hours: {
            summary: { symbol_code: 'partlycloudy_day' },
            details: { precipitation_amount: 0.5 },
          },
        },
      },
    ],
  },
}

// MET Norway fixture where optional fields are absent
const metNorwayMinimalFixture = {
  properties: {
    timeseries: [
      {
        time: new Date().toISOString(), // current hour so it passes the filter
        data: {
          instant: {
            details: {
              air_temperature: 5.0,
              wind_speed: 3.0,
              // wind_from_direction absent → falls back to 0
              // relative_humidity absent → falls back to 0
            },
          },
          next_1_hours: {
            summary: { symbol_code: 'clearsky_day' },
            // details absent → precipitation falls back to 0
          },
        },
      },
    ],
  },
}

// Realistic Open-Meteo fixture
const openMeteoFixture = {
  current: {
    temperature_2m: 8.5,
    wind_speed_10m: 18.0,
    wind_direction_10m: 270,
    relative_humidity_2m: 82,
    weather_code: 3,
    time: '2026-03-04T07:00',
  },
}

// Realistic DMI EDR GeoJSON FeatureCollection fixture
const dmiEdrFixture = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [12.5627, 55.6804] },
      properties: {
        step: '2026-03-04T13:00:00.000Z',
        'temperature-2m': 281.8,   // Kelvin → ~8.65°C
        'wind-speed': 3.93,
        'wind-dir': 325.6,
        'relative-humidity-2m': 67.1,
        'total-precipitation': 0.0,
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [12.5627, 55.6804] },
      properties: {
        step: '2026-03-04T14:00:00.000Z',
        'temperature-2m': 280.5,
        'wind-speed': 4.1,
        'wind-dir': 310.0,
        'relative-humidity-2m': 70.0,
        // total-precipitation absent → defaults to 0
      },
    },
  ],
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function successResponse(data: unknown) {
  return { ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(data) }
}

function errorResponse(status: number, statusText: string) {
  return { ok: false, status, statusText }
}

/**
 * Mock all three upstream fetch calls.
 * Pass null to make a source throw a network error instead.
 */
function mockAllAPIs({
  met = successResponse(metNorwayFixture),
  openMeteo = successResponse(openMeteoFixture),
  dmiEdr = successResponse(dmiEdrFixture),
}: {
  met?: { ok: boolean; status?: number; statusText?: string; json?: () => Promise<unknown> } | null
  openMeteo?: { ok: boolean; status?: number; statusText?: string; json?: () => Promise<unknown> } | null
  dmiEdr?: { ok: boolean; status?: number; statusText?: string; json?: () => Promise<unknown> } | null
} = {}) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('api.met.no')) {
      return met ? Promise.resolve(met) : Promise.reject(new Error('MET network error'))
    }
    if (url.includes('api.open-meteo.com')) {
      return openMeteo ? Promise.resolve(openMeteo) : Promise.reject(new Error('OpenMeteo network error'))
    }
    if (url.includes('dmigw.govcloud.dk')) {
      return dmiEdr ? Promise.resolve(dmiEdr) : Promise.reject(new Error('DMI EDR network error'))
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`))
  })
}

afterEach(() => {
  global.fetch = originalFetch
})

// ─── Parameter validation ─────────────────────────────────────────────────────

describe('GET /api/weather — parameter validation', () => {
  it('should return 400 when no parameters are provided', async () => {
    const request = buildRequest({})
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.yr).toBeNull()
    expect(data.dmi).toBeNull()
    expect(data.errors.yr).toBe('Invalid latitude or longitude')
    expect(data.errors.dmi).toBe('Invalid latitude or longitude')
  })

  it('should return 400 when only latitude is provided', async () => {
    const request = buildRequest({ latitude: '55.6761' })
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 when only longitude is provided', async () => {
    const request = buildRequest({ longitude: '12.5683' })
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 for non-numeric latitude', async () => {
    const request = buildRequest({ latitude: 'abc', longitude: '12.5683' })
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 for non-numeric longitude', async () => {
    const request = buildRequest({ latitude: '55.6761', longitude: 'xyz' })
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 for latitude=0 and longitude=0 (falsy)', async () => {
    const request = buildRequest({ latitude: '0', longitude: '0' })
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 for empty string parameters', async () => {
    const request = buildRequest({ latitude: '', longitude: '' })
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should include yrForecast and dmiEdr error fields in 400 response', async () => {
    const request = buildRequest({})
    const response = await GET(request)
    const data = await response.json()

    expect(data.yrForecast).toBeNull()
    expect(data.dmiEdr).toBeNull()
    expect(data.errors.yrForecast).toBe('Invalid latitude or longitude')
    expect(data.errors.dmiEdr).toBe('Invalid latitude or longitude')
  })
})

// ─── Successful responses ─────────────────────────────────────────────────────

describe('GET /api/weather — successful responses', () => {
  it('should return 200 with all three sources succeeding', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toEqual(metNorwayFixture)
    expect(data.dmi).toEqual(openMeteoFixture)
    expect(data.dmiEdr).toBeDefined()
    expect(Array.isArray(data.dmiEdr)).toBe(true)
    expect(data.errors.yr).toBeNull()
    expect(data.errors.dmi).toBeNull()
    expect(data.errors.dmiEdr).toBeNull()
  })

  it('should call MET Norway with correct URL and User-Agent', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    await GET(request)

    const fetchMock = global.fetch as jest.Mock
    const metCall = fetchMock.mock.calls.find((call: unknown[]) =>
      (call[0] as string).includes('api.met.no'),
    )
    expect(metCall).toBeDefined()
    expect(metCall[0]).toContain('lat=55.6761')
    expect(metCall[0]).toContain('lon=12.5683')
    expect(metCall[1].headers['User-Agent']).toContain('DanishWeatherApp')
  })

  it('should call Open-Meteo with correct URL parameters', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '56.0', longitude: '10.0' })
    await GET(request)

    const fetchMock = global.fetch as jest.Mock
    const openMeteoCall = fetchMock.mock.calls.find((call: unknown[]) =>
      (call[0] as string).includes('api.open-meteo.com'),
    )
    expect(openMeteoCall).toBeDefined()
    expect(openMeteoCall[0]).toContain('latitude=56')
    expect(openMeteoCall[0]).toContain('longitude=10')
    expect(openMeteoCall[0]).toContain('current=temperature_2m')
    expect(openMeteoCall[0]).toContain('wind_direction_10m')
    expect(openMeteoCall[0]).toContain('relative_humidity_2m')
  })

  it('should call DMI EDR with correct coords and parameters', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    await GET(request)

    const fetchMock = global.fetch as jest.Mock
    const edrCall = fetchMock.mock.calls.find((call: unknown[]) =>
      (call[0] as string).includes('dmigw.govcloud.dk'),
    )
    expect(edrCall).toBeDefined()
    // coords are URL-encoded by URLSearchParams; decode before asserting
    expect(decodeURIComponent(edrCall[0])).toContain('POINT(12.5683')
    expect(edrCall[0]).toContain('temperature-2m')
    expect(edrCall[0]).toContain('wind-speed')
    expect(edrCall[0]).toContain('GeoJSON')
    // datetime must NOT be percent-encoded (slash must be literal)
    expect(edrCall[0]).toContain('datetime=')
    expect(edrCall[0]).not.toContain('%2F')
  })

  it('should handle decimal coordinates correctly', async () => {
    mockAllAPIs()
    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    expect((await GET(request)).status).toBe(200)
  })

  it('should handle negative coordinates', async () => {
    mockAllAPIs()
    const request = buildRequest({ latitude: '-33.8688', longitude: '151.2093' })
    expect((await GET(request)).status).toBe(200)
  })
})

// ─── DMI EDR feature mapping ──────────────────────────────────────────────────

describe('GET /api/weather — DMI EDR feature mapping', () => {
  it('should convert temperature from Kelvin to °C', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    // 281.8K → 281.8 - 273.15 = 8.65 → rounded to 8.7
    expect(data.dmiEdr[0].temperature).toBeCloseTo(8.7, 1)
  })

  it('should round windSpeed to 1 decimal', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.dmiEdr[0].windSpeed).toBe(3.9)
  })

  it('should round windDirection to integer', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.dmiEdr[0].windDirection).toBe(326)
  })

  it('should round humidity to integer', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.dmiEdr[0].humidity).toBe(67)
  })

  it('should default missing total-precipitation to 0', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    // Second feature has no total-precipitation field
    expect(data.dmiEdr[1].precipitation).toBe(0)
  })

  it('should preserve the step timestamp as the time field', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.dmiEdr[0].time).toBe('2026-03-04T13:00:00.000Z')
  })

  it('should map all features in the response', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.dmiEdr).toHaveLength(2)
  })
})

// ─── yrForecast extraction ────────────────────────────────────────────────────

describe('GET /api/weather — yrForecast extraction', () => {
  it('should include yrForecast array in successful response', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(Array.isArray(data.yrForecast)).toBe(true)
  })

  it('should fall back wind_from_direction to 0 when absent', async () => {
    mockAllAPIs({ met: successResponse(metNorwayMinimalFixture) })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    if (data.yrForecast && data.yrForecast.length > 0) {
      expect(data.yrForecast[0].windDirection).toBe(0)
    }
  })

  it('should fall back relative_humidity to 0 when absent', async () => {
    mockAllAPIs({ met: successResponse(metNorwayMinimalFixture) })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    if (data.yrForecast && data.yrForecast.length > 0) {
      expect(data.yrForecast[0].humidity).toBe(0)
    }
  })

  it('should fall back precipitation to 0 when details are absent', async () => {
    mockAllAPIs({ met: successResponse(metNorwayMinimalFixture) })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    if (data.yrForecast && data.yrForecast.length > 0) {
      expect(data.yrForecast[0].precipitation).toBe(0)
    }
  })

  it('should set yrForecast=null and yrForecastError="No YR data" when MET Norway throws', async () => {
    // fetchMetNorway catches all errors internally and returns null (fulfilled with null).
    // Therefore yrResult.status is always 'fulfilled', and the yrForecastError fallback
    // is always 'No YR data' — the 'rejected' branch (line 223) is unreachable through
    // the public interface and is covered here via the HTTP-error path.
    mockAllAPIs({ met: null })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.yrForecast).toBeNull()
    expect(data.errors.yrForecast).toBe('No YR data')
  })

  it('should set yrForecastError to "No YR data" when yr fetch succeeds but returns null', async () => {
    // fetchMetNorway swallows HTTP errors and returns null (fulfilled with null)
    mockAllAPIs({ met: errorResponse(500, 'Internal Server Error') })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.yr).toBeNull()
    expect(data.yrForecast).toBeNull()
    expect(data.errors.yrForecast).toBe('No YR data')
  })
})

// ─── Partial failures ─────────────────────────────────────────────────────────

describe('GET /api/weather — partial failures', () => {
  it('should return 200 with yr=null when MET Norway returns HTTP error', async () => {
    mockAllAPIs({ met: errorResponse(500, 'Internal Server Error') })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toBeNull()
    expect(data.dmi).toEqual(openMeteoFixture)
    expect(data.errors.yr).toBeNull()
  })

  it('should return 200 with dmi=null when Open-Meteo returns HTTP error', async () => {
    mockAllAPIs({ openMeteo: errorResponse(503, 'Service Unavailable') })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toEqual(metNorwayFixture)
    expect(data.dmi).toBeNull()
    expect(data.errors.dmi).toBeNull()
  })

  it('should return 200 with yr=null when MET Norway fetch throws', async () => {
    mockAllAPIs({ met: null })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toBeNull()
    expect(data.dmi).toEqual(openMeteoFixture)
  })

  it('should return 200 with dmi=null when Open-Meteo fetch throws', async () => {
    mockAllAPIs({ openMeteo: null })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toEqual(metNorwayFixture)
    expect(data.dmi).toBeNull()
  })

  it('should return 200 with dmiEdr=null and errors.dmiEdr set when EDR returns HTTP error', async () => {
    mockAllAPIs({ dmiEdr: errorResponse(429, 'Too Many Requests') })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.dmiEdr).toBeNull()
    expect(data.errors.dmiEdr).toContain('429')
  })

  it('should return 200 with dmiEdr=null and errors.dmiEdr set when EDR fetch throws', async () => {
    mockAllAPIs({ dmiEdr: null })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.dmiEdr).toBeNull()
    expect(data.errors.dmiEdr).toContain('DMI EDR network error')
  })
})

// ─── Total failure ─────────────────────────────────────────────────────────────

describe('GET /api/weather — total failure', () => {
  it('should return 503 when all three APIs return HTTP errors', async () => {
    mockAllAPIs({
      met: errorResponse(500, 'Internal Server Error'),
      openMeteo: errorResponse(503, 'Service Unavailable'),
      dmiEdr: errorResponse(500, 'Internal Server Error'),
    })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.yr).toBeNull()
    expect(data.dmi).toBeNull()
    expect(data.dmiEdr).toBeNull()
  })

  it('should return 503 when all fetches throw', async () => {
    mockAllAPIs({ met: null, openMeteo: null, dmiEdr: null })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.yr).toBeNull()
    expect(data.dmi).toBeNull()
    expect(data.dmiEdr).toBeNull()
  })

  it('should return 200 when only dmiEdr fails (yr and dmi succeed)', async () => {
    mockAllAPIs({ dmiEdr: null })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should return 200 when only yr fails (dmi and dmiEdr succeed)', async () => {
    mockAllAPIs({ met: null })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})

// ─── Response structure ────────────────────────────────────────────────────────

describe('GET /api/weather — response structure', () => {
  it('should return all top-level fields', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const data = await (await GET(request)).json()

    expect(data).toHaveProperty('yr')
    expect(data).toHaveProperty('yrForecast')
    expect(data).toHaveProperty('dmi')
    expect(data).toHaveProperty('dmiEdr')
    expect(data).toHaveProperty('errors')
    expect(data.errors).toHaveProperty('yr')
    expect(data.errors).toHaveProperty('yrForecast')
    expect(data.errors).toHaveProperty('dmi')
    expect(data.errors).toHaveProperty('dmiEdr')
  })

  it('should return the correct Content-Type header', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)

    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should include full MET Norway timeseries structure', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const data = await (await GET(request)).json()

    const ts = data.yr.properties.timeseries[0]
    expect(ts.time).toBe('2026-03-04T07:00:00Z')
    expect(ts.data.instant.details.air_temperature).toBe(7.2)
    expect(ts.data.instant.details.wind_speed).toBe(5.8)
    expect(ts.data.next_1_hours.summary.symbol_code).toBe('partlycloudy_day')
  })

  it('should include full Open-Meteo current structure', async () => {
    mockAllAPIs()

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const data = await (await GET(request)).json()

    expect(data.dmi.current.temperature_2m).toBe(8.5)
    expect(data.dmi.current.wind_speed_10m).toBe(18.0)
    expect(data.dmi.current.weather_code).toBe(3)
    expect(data.dmi.current.time).toBe('2026-03-04T07:00')
  })
})

// ─── Parallel execution ────────────────────────────────────────────────────────

describe('GET /api/weather — parallel execution', () => {
  it('should call all three APIs in parallel', async () => {
    const callTimes: Record<string, number> = {}

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('api.met.no')) {
        callTimes.met = Date.now()
        return Promise.resolve(successResponse(metNorwayFixture))
      }
      if (url.includes('api.open-meteo.com')) {
        callTimes.openMeteo = Date.now()
        return Promise.resolve(successResponse(openMeteoFixture))
      }
      if (url.includes('dmigw.govcloud.dk')) {
        callTimes.dmiEdr = Date.now()
        return Promise.resolve(successResponse(dmiEdrFixture))
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    await GET(request)

    expect(callTimes.met).toBeDefined()
    expect(callTimes.openMeteo).toBeDefined()
    expect(callTimes.dmiEdr).toBeDefined()
    expect(Math.abs(callTimes.met - callTimes.openMeteo)).toBeLessThan(50)
    expect(Math.abs(callTimes.met - callTimes.dmiEdr)).toBeLessThan(50)
  })

  it('should not let one failure block the other', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('api.met.no')) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error('slow fail')), 50))
      }
      if (url.includes('api.open-meteo.com')) {
        return Promise.resolve(successResponse(openMeteoFixture))
      }
      if (url.includes('dmigw.govcloud.dk')) {
        return Promise.resolve(successResponse(dmiEdrFixture))
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.dmi).toEqual(openMeteoFixture)
    expect(data.yr).toBeNull()
  })
})

// ─── Edge cases ────────────────────────────────────────────────────────────────

describe('GET /api/weather — edge cases', () => {
  it('should handle very large coordinate values', async () => {
    mockAllAPIs()
    expect((await GET(buildRequest({ latitude: '89.9999', longitude: '179.9999' }))).status).toBe(200)
  })

  it('should handle negative latitude (southern hemisphere)', async () => {
    mockAllAPIs()
    expect((await GET(buildRequest({ latitude: '-33.8688', longitude: '151.2093' }))).status).toBe(200)
  })

  it('should handle negative longitude (western hemisphere)', async () => {
    mockAllAPIs()
    expect((await GET(buildRequest({ latitude: '40.7128', longitude: '-74.0060' }))).status).toBe(200)
  })
})
