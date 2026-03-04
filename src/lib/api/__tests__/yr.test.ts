/**
 * Tests for the YR.no (MET Norway) client module.
 *
 * These tests mock the fetch call to `/api/weather` (the Next.js proxy)
 * and verify the transformation, validation, and error-handling logic
 * in fetchYrWeatherData and fetchYrCurrentConditions.
 */
import { fetchYrWeatherData, fetchYrCurrentConditions } from '@/lib/api/yr'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
})

function mockFetchSuccess(yrPayload: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ yr: yrPayload }),
  })
}

function mockFetchFailure(status: number, statusText: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
  })
}

// Realistic MET Norway response shape
const validMetNorwayPayload = {
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
            summary: {
              symbol_code: 'partlycloudy_day',
            },
          },
        },
      },
      {
        time: '2026-03-04T08:00:00Z',
        data: {
          instant: {
            details: {
              air_temperature: 7.8,
              wind_speed: 6.1,
              wind_from_direction: 215,
              relative_humidity: 76,
            },
          },
          next_1_hours: {
            summary: {
              symbol_code: 'cloudy',
            },
          },
        },
      },
    ],
  },
}

describe('fetchYrWeatherData', () => {
  it('should transform a valid MET Norway response into YrWeatherData', async () => {
    mockFetchSuccess(validMetNorwayPayload)

    const result = await fetchYrWeatherData(55.6761, 12.5683)

    // Location
    expect(result.location.id).toBe('yr-55.6761-12.5683')
    expect(result.location.name).toBe('Location')

    // Current conditions (first timeseries entry)
    expect(result.current.temperature.value).toBe(7.2)
    expect(result.current.temperature.unit).toBe('celsius')
    expect(result.current.windSpeed.value).toBe(5.8)
    expect(result.current.windSpeed.unit).toBe('m/s')
    expect(result.current.windDirection).toEqual({ value: 210, unit: 'degrees' })
    expect(result.current.relativeHumidity).toBe(78)
    expect(result.current.weatherIcon.code).toBe('partlycloudy_day')
    expect(result.current.weatherIcon.description).toBe('Partly cloudy')
    expect(result.current.timestamp).toBe('2026-03-04T07:00:00Z')

    // Forecast should be empty array (the module doesn't populate it)
    expect(result.forecast).toEqual([])

    // lastUpdated should be a valid ISO date
    expect(new Date(result.lastUpdated).getTime()).not.toBeNaN()
  })

  it('should call fetch with the correct URL', async () => {
    mockFetchSuccess(validMetNorwayPayload)

    await fetchYrWeatherData(56.0, 10.0)

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/weather?latitude=56&longitude=10',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('should handle missing wind_from_direction (optional field)', async () => {
    const payloadNoWindDir = {
      properties: {
        timeseries: [
          {
            time: '2026-03-04T07:00:00Z',
            data: {
              instant: {
                details: {
                  air_temperature: 5.0,
                  wind_speed: 3.0,
                },
              },
              next_1_hours: {
                summary: {
                  symbol_code: 'clearsky_day',
                },
              },
            },
          },
        ],
      },
    }
    mockFetchSuccess(payloadNoWindDir)

    const result = await fetchYrWeatherData(55.0, 12.0)

    expect(result.current.windDirection).toBeUndefined()
    expect(result.current.relativeHumidity).toBeUndefined()
    expect(result.current.weatherIcon.description).toBe('Clear sky')
  })

  it('should handle missing next_1_hours (symbol code falls back to "unknown")', async () => {
    const payloadNoSymbol = {
      properties: {
        timeseries: [
          {
            time: '2026-03-04T07:00:00Z',
            data: {
              instant: {
                details: {
                  air_temperature: 5.0,
                  wind_speed: 3.0,
                },
              },
              // No next_1_hours
            },
          },
        ],
      },
    }
    mockFetchSuccess(payloadNoSymbol)

    const result = await fetchYrWeatherData(55.0, 12.0)

    expect(result.current.weatherIcon.code).toBe('unknown')
    expect(result.current.weatherIcon.description).toBe('Unknown')
  })

  it('should throw when MET Norway response is null', async () => {
    mockFetchSuccess(null)

    await expect(fetchYrWeatherData(55.0, 12.0)).rejects.toThrow(
      'Invalid MET Norway response structure',
    )
  })

  it('should throw when timeseries is empty', async () => {
    mockFetchSuccess({ properties: { timeseries: [] } })

    await expect(fetchYrWeatherData(55.0, 12.0)).rejects.toThrow(
      'Invalid MET Norway response structure',
    )
  })

  it('should throw when properties is missing', async () => {
    mockFetchSuccess({ type: 'Feature' })

    await expect(fetchYrWeatherData(55.0, 12.0)).rejects.toThrow(
      'Invalid MET Norway response structure',
    )
  })

  it('should throw a Zod error wrapped as Error when temperature is not a number', async () => {
    const invalidPayload = {
      properties: {
        timeseries: [
          {
            time: '2026-03-04T07:00:00Z',
            data: {
              instant: {
                details: {
                  air_temperature: 'warm', // invalid
                  wind_speed: 3.0,
                },
              },
              next_1_hours: {
                summary: { symbol_code: 'clearsky_day' },
              },
            },
          },
        ],
      },
    }
    mockFetchSuccess(invalidPayload)

    await expect(fetchYrWeatherData(55.0, 12.0)).rejects.toThrow('Invalid YR.no response')
  })

  it('should throw on HTTP error after retries', async () => {
    mockFetchFailure(503, 'Service Unavailable')

    await expect(fetchYrWeatherData(55.0, 12.0)).rejects.toThrow(
      'HTTP 503: Service Unavailable',
    )
  }, 15_000)

  it('should throw on network failure after retries', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed'))

    await expect(fetchYrWeatherData(55.0, 12.0)).rejects.toThrow('fetch failed')
  }, 15_000)

  it('should map various MET Norway symbol codes correctly', async () => {
    const testCases: Array<{ code: string; expected: string }> = [
      { code: 'clearsky_day', expected: 'Clear sky' },
      { code: 'clearsky_night', expected: 'Clear sky' },
      { code: 'clearsky_polartwilight', expected: 'Clear sky' },
      { code: 'cloudy', expected: 'Cloudy' },
      { code: 'partlycloudy_day', expected: 'Partly cloudy' },
      { code: 'partlycloudy_night', expected: 'Partly cloudy' },
      { code: 'partlycloudy_polartwilight', expected: 'Partly cloudy' },
      { code: 'lightrain', expected: 'Light rain' },
      { code: 'lightsnow', expected: 'Light snow' },
      { code: 'rain', expected: 'Rain' },
      { code: 'snow', expected: 'Snow' },
      { code: 'rainandthunder', expected: 'Rain and thunder' },
      { code: 'snowandthunder', expected: 'Snow and thunder' },
      { code: 'some_unknown_code', expected: 'Unknown' },
    ]

    for (const { code, expected } of testCases) {
      const payload = {
        properties: {
          timeseries: [
            {
              time: '2026-03-04T07:00:00Z',
              data: {
                instant: {
                  details: {
                    air_temperature: 10,
                    wind_speed: 5,
                  },
                },
                next_1_hours: {
                  summary: { symbol_code: code },
                },
              },
            },
          ],
        },
      }
      mockFetchSuccess(payload)

      const result = await fetchYrWeatherData(55.0, 12.0)
      expect(result.current.weatherIcon.description).toBe(expected)
    }
  })
})

describe('fetchYrCurrentConditions', () => {
  it('should return only current conditions from a valid response', async () => {
    mockFetchSuccess(validMetNorwayPayload)

    const result = await fetchYrCurrentConditions(55.6761, 12.5683)

    expect(result.temperature.value).toBe(7.2)
    expect(result.temperature.unit).toBe('celsius')
    expect(result.windSpeed.value).toBe(5.8)
    expect(result.windSpeed.unit).toBe('m/s')
    expect(result.windDirection).toEqual({ value: 210, unit: 'degrees' })
    expect(result.relativeHumidity).toBe(78)
    expect(result.weatherIcon.code).toBe('partlycloudy_day')
    expect(result.weatherIcon.description).toBe('Partly cloudy')
    expect(result.timestamp).toBe('2026-03-04T07:00:00Z')
  })

  it('should not include location or forecast data', async () => {
    mockFetchSuccess(validMetNorwayPayload)

    const result = await fetchYrCurrentConditions(55.6761, 12.5683)

    expect(result).not.toHaveProperty('location')
    expect(result).not.toHaveProperty('forecast')
    expect(result).not.toHaveProperty('lastUpdated')
  })

  it('should propagate errors from fetchYrWeatherData', async () => {
    mockFetchSuccess(null)

    await expect(fetchYrCurrentConditions(55.0, 12.0)).rejects.toThrow(
      'Invalid MET Norway response structure',
    )
  })

  it('should wrap ZodError in fetchYrCurrentConditions when current conditions schema fails', async () => {
    const { z } = await import('zod')
    const schemas = await import('@/lib/schemas/yr')

    const originalParse = schemas.YrCurrentConditionsSchema.parse
    schemas.YrCurrentConditionsSchema.parse = () => {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['temperature'],
          message: 'forced test error',
        },
      ])
    }

    mockFetchSuccess(validMetNorwayPayload)

    await expect(fetchYrCurrentConditions(55.0, 12.0)).rejects.toThrow(
      'Invalid YR.no conditions',
    )

    // Restore
    schemas.YrCurrentConditionsSchema.parse = originalParse
  })
})
