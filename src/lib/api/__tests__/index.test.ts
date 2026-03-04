/**
 * Tests for the weather comparison orchestrator (lib/api/index.ts).
 *
 * These tests mock the underlying fetchYrCurrentConditions and
 * fetchDmiCurrentConditions to verify the parallel fetching and
 * error-aggregation logic of fetchWeatherFromBothSources.
 */
import { fetchWeatherFromBothSources, type WeatherComparison } from '@/lib/api/index'

// We mock the individual API modules, not fetch itself
jest.mock('@/lib/api/yr', () => ({
  fetchYrCurrentConditions: jest.fn(),
}))
jest.mock('@/lib/api/dmi', () => ({
  fetchDmiCurrentConditions: jest.fn(),
}))

import { fetchYrCurrentConditions } from '@/lib/api/yr'
import { fetchDmiCurrentConditions } from '@/lib/api/dmi'

const mockFetchYr = fetchYrCurrentConditions as jest.MockedFunction<typeof fetchYrCurrentConditions>
const mockFetchDmi = fetchDmiCurrentConditions as jest.MockedFunction<typeof fetchDmiCurrentConditions>

const validYrConditions = {
  temperature: { value: 7.2, unit: 'celsius' as const },
  windSpeed: { value: 5.8, unit: 'm/s' as const },
  windDirection: { value: 210, unit: 'degrees' as const },
  relativeHumidity: 78,
  weatherIcon: { code: 'partlycloudy_day', description: 'Partly cloudy' },
  timestamp: '2026-03-04T07:00:00Z',
}

const validDmiConditions = {
  temperature: { value: 8.5, unit: '°C' as const },
  windSpeed: { value: 5.0, unit: 'm/s' as const },
  humidity: 82,
  weatherDescription: { code: 3, description: 'Overcast' },
  timestamp: '2026-03-04T07:00',
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('fetchWeatherFromBothSources', () => {
  it('should return data from both sources when both succeed', async () => {
    mockFetchYr.mockResolvedValue(validYrConditions)
    mockFetchDmi.mockResolvedValue(validDmiConditions)

    const result: WeatherComparison = await fetchWeatherFromBothSources(55.6761, 12.5683)

    expect(result.yr).toEqual(validYrConditions)
    expect(result.dmi).toEqual(validDmiConditions)
    expect(result.errors.yr).toBeNull()
    expect(result.errors.dmi).toBeNull()
  })

  it('should pass latitude and longitude to both API calls', async () => {
    mockFetchYr.mockResolvedValue(validYrConditions)
    mockFetchDmi.mockResolvedValue(validDmiConditions)

    await fetchWeatherFromBothSources(56.0, 10.0)

    expect(mockFetchYr).toHaveBeenCalledWith(56.0, 10.0)
    expect(mockFetchDmi).toHaveBeenCalledWith(56.0, 10.0)
  })

  it('should return yr=null with error when YR fails', async () => {
    mockFetchYr.mockRejectedValue(new Error('YR API timeout'))
    mockFetchDmi.mockResolvedValue(validDmiConditions)

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    expect(result.yr).toBeNull()
    expect(result.dmi).toEqual(validDmiConditions)
    expect(result.errors.yr).toContain('YR API timeout')
    expect(result.errors.dmi).toBeNull()
  })

  it('should return dmi=null with error when DMI fails', async () => {
    mockFetchYr.mockResolvedValue(validYrConditions)
    mockFetchDmi.mockRejectedValue(new Error('DMI validation failed'))

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    expect(result.yr).toEqual(validYrConditions)
    expect(result.dmi).toBeNull()
    expect(result.errors.yr).toBeNull()
    expect(result.errors.dmi).toContain('DMI validation failed')
  })

  it('should return both null with errors when both fail', async () => {
    mockFetchYr.mockRejectedValue(new Error('YR down'))
    mockFetchDmi.mockRejectedValue(new Error('DMI down'))

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    expect(result.yr).toBeNull()
    expect(result.dmi).toBeNull()
    expect(result.errors.yr).toContain('YR down')
    expect(result.errors.dmi).toContain('DMI down')
  })

  it('should handle non-Error rejection values', async () => {
    mockFetchYr.mockRejectedValue('string error')
    mockFetchDmi.mockRejectedValue(42)

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    expect(result.yr).toBeNull()
    expect(result.dmi).toBeNull()
    expect(result.errors.yr).toBe('string error')
    expect(result.errors.dmi).toBe('42')
  })

  it('should call both APIs in parallel (not sequentially)', async () => {
    let yrCallTime: number | undefined
    let dmiCallTime: number | undefined

    mockFetchYr.mockImplementation(async () => {
      yrCallTime = Date.now()
      await new Promise((r) => setTimeout(r, 50))
      return validYrConditions
    })

    mockFetchDmi.mockImplementation(async () => {
      dmiCallTime = Date.now()
      await new Promise((r) => setTimeout(r, 50))
      return validDmiConditions
    })

    await fetchWeatherFromBothSources(55.0, 12.0)

    // Both should have been called nearly simultaneously (within 20ms)
    expect(yrCallTime).toBeDefined()
    expect(dmiCallTime).toBeDefined()
    expect(Math.abs(yrCallTime! - dmiCallTime!)).toBeLessThan(20)
  })

  it('should use Promise.allSettled so one failure does not cancel the other', async () => {
    // DMI fails immediately, but YR should still complete
    mockFetchDmi.mockRejectedValue(new Error('instant fail'))
    mockFetchYr.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50))
      return validYrConditions
    })

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    expect(result.yr).toEqual(validYrConditions)
    expect(result.dmi).toBeNull()
    expect(result.errors.dmi).toContain('instant fail')
  })

  it('should have the correct WeatherComparison shape', async () => {
    mockFetchYr.mockResolvedValue(validYrConditions)
    mockFetchDmi.mockResolvedValue(validDmiConditions)

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    // Verify shape with explicit key checks
    expect(Object.keys(result).sort()).toEqual(['diff', 'dmi', 'errors', 'yr'])
    expect(Object.keys(result.errors).sort()).toEqual(['dmi', 'yr'])
    expect(Object.keys(result.diff).sort()).toEqual([
      'humidity', 'temperature', 'windDirection', 'windSpeed',
    ])
  })

  it('should compute correct diffs when both sources succeed', async () => {
    mockFetchYr.mockResolvedValue(validYrConditions)
    mockFetchDmi.mockResolvedValue(validDmiConditions)

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    // DMI 8.5 − YR 7.2 = 1.3
    expect(result.diff.temperature).toBe(1.3)
    // DMI 5.0 − YR 5.8 = −0.8
    expect(result.diff.windSpeed).toBe(-0.8)
    // DMI 82 − YR 78 = 4
    expect(result.diff.humidity).toBe(4)
    // validDmiConditions has no windDirection → null
    expect(result.diff.windDirection).toBeNull()
  })

  it('should compute windDirection diff when both sides provide it', async () => {
    const dmiWithDir = {
      ...validDmiConditions,
      windDirection: { value: 240, unit: 'degrees' as const },
    }
    mockFetchYr.mockResolvedValue(validYrConditions)   // windDirection 210
    mockFetchDmi.mockResolvedValue(dmiWithDir)          // windDirection 240

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    // 240 − 210 = 30
    expect(result.diff.windDirection).toBe(30)
  })

  it('should return null diffs when both sources fail', async () => {
    mockFetchYr.mockRejectedValue(new Error('YR down'))
    mockFetchDmi.mockRejectedValue(new Error('DMI down'))

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    expect(result.diff.temperature).toBeNull()
    expect(result.diff.windSpeed).toBeNull()
    expect(result.diff.windDirection).toBeNull()
    expect(result.diff.humidity).toBeNull()
  })

  it('should return null diffs when one source fails', async () => {
    mockFetchYr.mockRejectedValue(new Error('YR down'))
    mockFetchDmi.mockResolvedValue(validDmiConditions)

    const result = await fetchWeatherFromBothSources(55.0, 12.0)

    expect(result.diff.temperature).toBeNull()
    expect(result.diff.windSpeed).toBeNull()
    expect(result.diff.humidity).toBeNull()
  })
})
