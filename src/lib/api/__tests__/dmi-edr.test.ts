/**
 * Unit tests for fetchDmiEdrForecast.
 * Mocks getProxyData (the shared proxy layer) and verifies transformation logic.
 */
import { fetchDmiEdrForecast } from '@/lib/api/dmi'
import * as proxyModule from '@/lib/api/proxy'
import { DmiEdrForecastHour } from '@/lib/schemas/dmi'

jest.mock('@/lib/api/proxy', () => ({
  getProxyData: jest.fn(),
}))

const mockGetProxyData = proxyModule.getProxyData as jest.Mock

afterEach(() => {
  jest.clearAllMocks()
})

function mockProxyWithEdr(dmiEdr: unknown) {
  mockGetProxyData.mockResolvedValue({
    yr: null,
    dmi: null,
    dmiEdr,
    errors: { yr: null, dmi: null, dmiEdr: null },
  })
}

function mockProxyFailure(message: string) {
  mockGetProxyData.mockRejectedValue(new Error(message))
}

/** A realistic 24-entry EDR forecast payload (domain model, already in °C). */
function makeForecastPayload(count = 24): DmiEdrForecastHour[] {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(Date.UTC(2026, 2, 4, 10 + i)).toISOString(),
    temperature: Math.round((5 + i * 0.1) * 10) / 10,
    windSpeed: 4.4,
    windDirection: 294,
    humidity: 82,
    precipitation: 0,
  }))
}

describe('fetchDmiEdrForecast', () => {
  it('returns a typed array of DmiEdrForecastHour on success', async () => {
    const payload = makeForecastPayload(24)
    mockProxyWithEdr(payload)

    const result = await fetchDmiEdrForecast(55.6761, 12.5683)

    expect(result).toHaveLength(24)
    expect(result[0].temperature).toBe(5)
    expect(result[0].windSpeed).toBe(4.4)
    expect(result[0].windDirection).toBe(294)
    expect(result[0].humidity).toBe(82)
    expect(result[0].precipitation).toBe(0)
  })

  it('calls getProxyData with the correct coordinates', async () => {
    mockProxyWithEdr(makeForecastPayload(1))

    await fetchDmiEdrForecast(56.0, 10.0)

    expect(mockGetProxyData).toHaveBeenCalledWith(56.0, 10.0)
  })

  it('returns an empty array when dmiEdr is an empty array', async () => {
    mockProxyWithEdr([])

    const result = await fetchDmiEdrForecast(55.6761, 12.5683)
    expect(result).toEqual([])
  })

  it('throws when dmiEdr is null', async () => {
    mockProxyWithEdr(null)

    await expect(fetchDmiEdrForecast(55.6761, 12.5683)).rejects.toThrow(
      'Invalid DMI EDR response: dmiEdr is not an array',
    )
  })

  it('throws when dmiEdr is missing from response', async () => {
    mockGetProxyData.mockResolvedValue({ yr: null, dmi: null, errors: {} })

    await expect(fetchDmiEdrForecast(55.6761, 12.5683)).rejects.toThrow(
      'Invalid DMI EDR response: dmiEdr is not an array',
    )
  })

  it('throws a ZodError-wrapped message when an entry fails schema validation', async () => {
    const badPayload = [
      {
        // missing required fields
        time: '2026-03-04T10:00:00.000Z',
        temperature: 'not-a-number', // wrong type
      },
    ]
    mockProxyWithEdr(badPayload)

    await expect(fetchDmiEdrForecast(55.6761, 12.5683)).rejects.toThrow(
      'Invalid DMI EDR forecast',
    )
  })

  it('throws on proxy HTTP error', async () => {
    mockProxyFailure('HTTP 503: Service Unavailable')

    await expect(fetchDmiEdrForecast(55.6761, 12.5683)).rejects.toThrow(
      'HTTP 503: Service Unavailable',
    )
  })

  it('propagates network errors', async () => {
    mockProxyFailure('Network failure')

    await expect(fetchDmiEdrForecast(55.6761, 12.5683)).rejects.toThrow('Network failure')
  })

  it('returns entries with precipitation when present', async () => {
    const payload: DmiEdrForecastHour[] = [
      {
        time: '2026-03-04T10:00:00.000Z',
        temperature: 3.2,
        windSpeed: 6.1,
        windDirection: 180,
        humidity: 95,
        precipitation: 1.4,
      },
    ]
    mockProxyWithEdr(payload)

    const result = await fetchDmiEdrForecast(55.0, 12.0)
    expect(result[0].precipitation).toBe(1.4)
  })
})
