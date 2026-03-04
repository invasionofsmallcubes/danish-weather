/**
 * Tests for the DMI (Open-Meteo) client module.
 *
 * These tests mock the fetch call to `/api/weather` (the Next.js proxy)
 * and verify the transformation, validation, and error-handling logic
 * in fetchDmiWeatherData and fetchDmiCurrentConditions.
 */
import { fetchDmiWeatherData, fetchDmiCurrentConditions } from '@/lib/api/dmi'

// Save original fetch
const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
})

function mockFetchSuccess(dmiPayload: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ dmi: dmiPayload }),
  })
}

function mockFetchFailure(status: number, statusText: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
  })
}

// Realistic Open-Meteo response matching what the proxy returns
const validOpenMeteoPayload = {
  current: {
    temperature_2m: 8.5,
    wind_speed_10m: 18.0, // km/h
    weather_code: 3,
    relative_humidity: 82,
    time: '2026-03-04T07:00',
  },
}

describe('fetchDmiWeatherData', () => {
  it('should transform a valid Open-Meteo response into DmiWeatherData', async () => {
    mockFetchSuccess(validOpenMeteoPayload)

    const result = await fetchDmiWeatherData(55.6761, 12.5683)

    // Location
    expect(result.location.id).toBe('dmi-55.6761-12.5683')
    expect(result.location.name).toBe('Location')
    expect(result.location.country).toBe('DK')
    expect(result.location.latitude).toBe(55.6761)
    expect(result.location.longitude).toBe(12.5683)

    // Current conditions
    expect(result.current.temperature.value).toBe(8.5)
    expect(result.current.temperature.unit).toBe('°C')

    // Wind speed should be converted from km/h to m/s
    expect(result.current.windSpeed.value).toBeCloseTo(18.0 / 3.6, 2)
    expect(result.current.windSpeed.unit).toBe('m/s')

    expect(result.current.humidity).toBe(82)
    expect(result.current.weatherDescription.code).toBe(3)
    expect(result.current.weatherDescription.description).toBe('Overcast')
    expect(result.current.timestamp).toBe('2026-03-04T07:00')

    // Forecast should be empty array
    expect(result.forecast).toEqual([])

    // lastUpdated should be a valid ISO date
    expect(new Date(result.lastUpdated).getTime()).not.toBeNaN()
  })

  it('should call fetch with the correct URL', async () => {
    mockFetchSuccess(validOpenMeteoPayload)

    await fetchDmiWeatherData(56.0, 10.0)

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/weather?latitude=56&longitude=10',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('should handle missing relative_humidity (optional field)', async () => {
    const payloadWithoutHumidity = {
      current: {
        temperature_2m: 5.0,
        wind_speed_10m: 10.0,
        weather_code: 0,
        time: '2026-03-04T08:00',
      },
    }
    mockFetchSuccess(payloadWithoutHumidity)

    const result = await fetchDmiWeatherData(55.0, 12.0)

    expect(result.current.humidity).toBeUndefined()
    expect(result.current.weatherDescription.description).toBe('Clear sky')
  })

  it('should throw when Open-Meteo response is null', async () => {
    mockFetchSuccess(null)

    await expect(fetchDmiWeatherData(55.0, 12.0)).rejects.toThrow(
      'Invalid Open-Meteo response structure',
    )
  })

  it('should throw when Open-Meteo current field is missing', async () => {
    mockFetchSuccess({ latitude: 55.0 })

    await expect(fetchDmiWeatherData(55.0, 12.0)).rejects.toThrow(
      'Invalid Open-Meteo response structure',
    )
  })

  it('should throw a Zod error wrapped as Error when data does not match schema', async () => {
    const invalidPayload = {
      current: {
        temperature_2m: 'not-a-number', // invalid
        wind_speed_10m: 10,
        weather_code: 3,
        time: '2026-03-04T08:00',
      },
    }
    mockFetchSuccess(invalidPayload)

    await expect(fetchDmiWeatherData(55.0, 12.0)).rejects.toThrow('Invalid DMI response')
  })

  it('should throw on HTTP error after retries', async () => {
    mockFetchFailure(500, 'Internal Server Error')

    await expect(fetchDmiWeatherData(55.0, 12.0)).rejects.toThrow('HTTP 500: Internal Server Error')
  }, 15_000)

  it('should throw on network failure after retries', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    await expect(fetchDmiWeatherData(55.0, 12.0)).rejects.toThrow('Network error')
  }, 15_000)

  it('should map various WMO weather codes correctly', async () => {
    const testCases: Array<{ code: number; expected: string }> = [
      { code: 0, expected: 'Clear sky' },
      { code: 1, expected: 'Mainly clear' },
      { code: 61, expected: 'Slight rain' },
      { code: 75, expected: 'Heavy snow' },
      { code: 95, expected: 'Thunderstorm' },
      { code: 42, expected: 'Unknown' },
    ]

    for (const { code, expected } of testCases) {
      const payload = {
        current: {
          temperature_2m: 10,
          wind_speed_10m: 5,
          weather_code: code,
          time: '2026-03-04T08:00',
        },
      }
      mockFetchSuccess(payload)

      const result = await fetchDmiWeatherData(55.0, 12.0)
      expect(result.current.weatherDescription.description).toBe(expected)
    }
  })
})

describe('fetchDmiCurrentConditions', () => {
  it('should return only current conditions from a valid response', async () => {
    mockFetchSuccess(validOpenMeteoPayload)

    const result = await fetchDmiCurrentConditions(55.6761, 12.5683)

    expect(result.temperature.value).toBe(8.5)
    expect(result.temperature.unit).toBe('°C')
    expect(result.windSpeed.value).toBeCloseTo(18.0 / 3.6, 2)
    expect(result.windSpeed.unit).toBe('m/s')
    expect(result.humidity).toBe(82)
    expect(result.weatherDescription.code).toBe(3)
    expect(result.weatherDescription.description).toBe('Overcast')
    expect(result.timestamp).toBe('2026-03-04T07:00')
  })

  it('should not include location or forecast data', async () => {
    mockFetchSuccess(validOpenMeteoPayload)

    const result = await fetchDmiCurrentConditions(55.6761, 12.5683)

    // result should NOT have location or forecast keys
    expect(result).not.toHaveProperty('location')
    expect(result).not.toHaveProperty('forecast')
    expect(result).not.toHaveProperty('lastUpdated')
  })

  it('should propagate errors from fetchDmiWeatherData', async () => {
    mockFetchSuccess(null)

    await expect(fetchDmiCurrentConditions(55.0, 12.0)).rejects.toThrow(
      'Invalid Open-Meteo response structure',
    )
  })

  it('should wrap ZodError in fetchDmiCurrentConditions when current conditions schema fails', async () => {
    // We need to produce a response that passes fetchDmiWeatherData's schema
    // but fails DmiCurrentConditionsSchema.parse in fetchDmiCurrentConditions.
    // This is extremely unlikely in practice, but we can force it by mocking
    // the module internals. Instead, we test by importing and mocking at a lower level.
    // Since DmiCurrentConditionsSchema is a subset of DmiWeatherDataSchema.current,
    // we can mock the DmiCurrentConditionsSchema.parse to throw a ZodError.
    const { z } = await import('zod')
    const schemas = await import('@/lib/schemas/dmi')

    const originalParse = schemas.DmiCurrentConditionsSchema.parse
    schemas.DmiCurrentConditionsSchema.parse = () => {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['temperature'],
          message: 'forced test error',
        },
      ])
    }

    mockFetchSuccess(validOpenMeteoPayload)

    await expect(fetchDmiCurrentConditions(55.0, 12.0)).rejects.toThrow(
      'Invalid DMI conditions',
    )

    // Restore
    schemas.DmiCurrentConditionsSchema.parse = originalParse
  })
})
