/**
 * Unit tests for fetchYrForecast.
 * Mocks getProxyData (the shared proxy layer).
 */
import { fetchYrForecast } from '@/lib/api/yr'
import * as proxyModule from '@/lib/api/proxy'
import { ForecastHour } from '@/lib/schemas/forecast'

jest.mock('@/lib/api/proxy', () => ({
  getProxyData: jest.fn(),
}))

const mockGetProxyData = proxyModule.getProxyData as jest.Mock

afterEach(() => jest.clearAllMocks())

function makeForecastPayload(count = 24): ForecastHour[] {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(Date.UTC(2026, 2, 4, 9 + i)).toISOString(),
    temperature: Math.round((4 + i * 0.2) * 10) / 10,
    windSpeed: 4.7,
    windDirection: 295,
    humidity: 90,
    precipitation: 0,
  }))
}

function mockProxyWithYrForecast(yrForecast: unknown) {
  mockGetProxyData.mockResolvedValue({
    yr: null,
    yrForecast,
    dmi: null,
    dmiEdr: null,
    errors: { yr: null, yrForecast: null, dmi: null, dmiEdr: null },
  })
}

describe('fetchYrForecast', () => {
  it('returns a typed ForecastHour array on success', async () => {
    const payload = makeForecastPayload(24)
    mockProxyWithYrForecast(payload)

    const result = await fetchYrForecast(55.6761, 12.5683)

    expect(result).toHaveLength(24)
    expect(result[0].temperature).toBe(4)
    expect(result[0].windSpeed).toBe(4.7)
    expect(result[0].windDirection).toBe(295)
    expect(result[0].humidity).toBe(90)
    expect(result[0].precipitation).toBe(0)
  })

  it('calls getProxyData with the correct coordinates', async () => {
    mockProxyWithYrForecast(makeForecastPayload(1))

    await fetchYrForecast(56.0, 10.0)

    expect(mockGetProxyData).toHaveBeenCalledWith(56.0, 10.0)
  })

  it('returns an empty array when yrForecast is []', async () => {
    mockProxyWithYrForecast([])

    const result = await fetchYrForecast(55.6761, 12.5683)
    expect(result).toEqual([])
  })

  it('throws when yrForecast is null', async () => {
    mockProxyWithYrForecast(null)

    await expect(fetchYrForecast(55.6761, 12.5683)).rejects.toThrow(
      'Invalid YR forecast response: yrForecast is not an array',
    )
  })

  it('throws when yrForecast key is missing', async () => {
    mockGetProxyData.mockResolvedValue({ yr: null, dmi: null, dmiEdr: null, errors: {} })

    await expect(fetchYrForecast(55.6761, 12.5683)).rejects.toThrow(
      'Invalid YR forecast response: yrForecast is not an array',
    )
  })

  it('throws a wrapped ZodError when an entry fails schema validation', async () => {
    mockProxyWithYrForecast([{ time: '2026-03-04T10:00:00Z', temperature: 'cold' }])

    await expect(fetchYrForecast(55.6761, 12.5683)).rejects.toThrow('Invalid YR forecast data')
  })

  it('throws on proxy failure', async () => {
    mockGetProxyData.mockRejectedValue(new Error('HTTP 503: Service Unavailable'))

    await expect(fetchYrForecast(55.6761, 12.5683)).rejects.toThrow(
      'HTTP 503: Service Unavailable',
    )
  })

  it('includes precipitation when present', async () => {
    mockProxyWithYrForecast([
      {
        time: '2026-03-04T10:00:00Z',
        temperature: 3.0,
        windSpeed: 5.0,
        windDirection: 200,
        humidity: 95,
        precipitation: 2.1,
      },
    ])

    const result = await fetchYrForecast(55.0, 12.0)
    expect(result[0].precipitation).toBe(2.1)
  })
})
