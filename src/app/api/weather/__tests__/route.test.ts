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

// Realistic MET Norway fixture
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
            details: { precipitation_amount: 0 },
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
    weather_code: 3,
    time: '2026-03-04T07:00',
  },
}

function mockBothAPIs(
  metResponse: { ok: boolean; status?: number; statusText?: string; json?: () => Promise<unknown> },
  openMeteoResponse: { ok: boolean; status?: number; statusText?: string; json?: () => Promise<unknown> },
) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('api.met.no')) {
      return Promise.resolve(metResponse)
    }
    if (url.includes('api.open-meteo.com')) {
      return Promise.resolve(openMeteoResponse)
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`))
  })
}

function successResponse(data: unknown) {
  return { ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(data) }
}

function errorResponse(status: number, statusText: string) {
  return { ok: false, status, statusText }
}

afterEach(() => {
  global.fetch = originalFetch
})

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
})

describe('GET /api/weather — successful responses', () => {
  it('should return 200 with both APIs succeeding', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toEqual(metNorwayFixture)
    expect(data.dmi).toEqual(openMeteoFixture)
    expect(data.errors.yr).toBeNull()
    expect(data.errors.dmi).toBeNull()
  })

  it('should call MET Norway with correct URL and User-Agent', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    await GET(request)

    const fetchMock = global.fetch as jest.Mock
    const metCall = fetchMock.mock.calls.find((call: string[]) =>
      call[0].includes('api.met.no'),
    )
    expect(metCall).toBeDefined()
    expect(metCall[0]).toContain('lat=55.6761')
    expect(metCall[0]).toContain('lon=12.5683')
    expect(metCall[1].headers['User-Agent']).toContain('DanishWeatherApp')
  })

  it('should call Open-Meteo with correct URL parameters', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '56.0', longitude: '10.0' })
    await GET(request)

    const fetchMock = global.fetch as jest.Mock
    const openMeteoCall = fetchMock.mock.calls.find((call: string[]) =>
      call[0].includes('api.open-meteo.com'),
    )
    expect(openMeteoCall).toBeDefined()
    expect(openMeteoCall[0]).toContain('latitude=56')
    expect(openMeteoCall[0]).toContain('longitude=10')
    expect(openMeteoCall[0]).toContain('current=temperature_2m')
  })

  it('should handle decimal coordinates correctly', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should handle negative coordinates', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '-33.8688', longitude: '151.2093' })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})

describe('GET /api/weather — partial failures', () => {
  it('should return 200 with yr=null when MET Norway returns HTTP error', async () => {
    mockBothAPIs(
      errorResponse(500, 'Internal Server Error'),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toBeNull()
    expect(data.dmi).toEqual(openMeteoFixture)
    // fetchMetNorway catches errors and returns null, so errors.yr stays null
    expect(data.errors.yr).toBeNull()
  })

  it('should return 200 with dmi=null when Open-Meteo returns HTTP error', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      errorResponse(503, 'Service Unavailable'),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toEqual(metNorwayFixture)
    expect(data.dmi).toBeNull()
    expect(data.errors.dmi).toBeNull()
  })

  it('should return 200 with yr=null when MET Norway fetch throws', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('api.met.no')) {
        return Promise.reject(new Error('Network timeout'))
      }
      return Promise.resolve(successResponse(openMeteoFixture))
    })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    // fetchMetNorway catches errors internally and returns null
    expect(response.status).toBe(200)
    expect(data.yr).toBeNull()
    expect(data.dmi).toEqual(openMeteoFixture)
  })

  it('should return 200 with dmi=null when Open-Meteo fetch throws', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('api.open-meteo.com')) {
        return Promise.reject(new Error('DNS failure'))
      }
      return Promise.resolve(successResponse(metNorwayFixture))
    })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.yr).toEqual(metNorwayFixture)
    expect(data.dmi).toBeNull()
  })
})

describe('GET /api/weather — total failure', () => {
  it('should return 503 when both APIs return HTTP errors', async () => {
    mockBothAPIs(
      errorResponse(500, 'Internal Server Error'),
      errorResponse(503, 'Service Unavailable'),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.yr).toBeNull()
    expect(data.dmi).toBeNull()
  })

  it('should return 503 when both fetches throw', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Global network failure'))

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.yr).toBeNull()
    expect(data.dmi).toBeNull()
  })
})

describe('GET /api/weather — response structure', () => {
  it('should always return yr, dmi, and errors fields', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data).toHaveProperty('yr')
    expect(data).toHaveProperty('dmi')
    expect(data).toHaveProperty('errors')
    expect(data.errors).toHaveProperty('yr')
    expect(data.errors).toHaveProperty('dmi')
  })

  it('should return the correct Content-Type header', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)

    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should include full MET Norway timeseries structure', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    const ts = data.yr.properties.timeseries[0]
    expect(ts.time).toBe('2026-03-04T07:00:00Z')
    expect(ts.data.instant.details.air_temperature).toBe(7.2)
    expect(ts.data.instant.details.wind_speed).toBe(5.8)
    expect(ts.data.next_1_hours.summary.symbol_code).toBe('partlycloudy_day')
  })

  it('should include full Open-Meteo current structure', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    expect(data.dmi.current.temperature_2m).toBe(8.5)
    expect(data.dmi.current.wind_speed_10m).toBe(18.0)
    expect(data.dmi.current.weather_code).toBe(3)
    expect(data.dmi.current.time).toBe('2026-03-04T07:00')
  })
})

describe('GET /api/weather — parallel execution', () => {
  it('should call both APIs in parallel', async () => {
    let metCallTime: number | undefined
    let openMeteoCallTime: number | undefined

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('api.met.no')) {
        metCallTime = Date.now()
        return Promise.resolve(successResponse(metNorwayFixture))
      }
      if (url.includes('api.open-meteo.com')) {
        openMeteoCallTime = Date.now()
        return Promise.resolve(successResponse(openMeteoFixture))
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    await GET(request)

    expect(metCallTime).toBeDefined()
    expect(openMeteoCallTime).toBeDefined()
    // Both should be called nearly simultaneously
    expect(Math.abs(metCallTime! - openMeteoCallTime!)).toBeLessThan(50)
  })

  it('should not let one failure block the other', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('api.met.no')) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error('slow fail')), 50))
      }
      return Promise.resolve(successResponse(openMeteoFixture))
    })

    const request = buildRequest({ latitude: '55.6761', longitude: '12.5683' })
    const response = await GET(request)
    const data = await response.json()

    // Open-Meteo should still succeed
    expect(response.status).toBe(200)
    expect(data.dmi).toEqual(openMeteoFixture)
    expect(data.yr).toBeNull()
  })
})

describe('GET /api/weather — edge cases', () => {
  it('should handle very large coordinate values', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '89.9999', longitude: '179.9999' })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should handle negative latitude (southern hemisphere)', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '-33.8688', longitude: '151.2093' })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should handle negative longitude (western hemisphere)', async () => {
    mockBothAPIs(
      successResponse(metNorwayFixture),
      successResponse(openMeteoFixture),
    )

    const request = buildRequest({ latitude: '40.7128', longitude: '-74.0060' })
    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})
