import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { WeatherContainer } from '@/components/WeatherContainer'
import * as apiModule from '@/lib/api'
import * as dmiApiModule from '@/lib/api/dmi'
import * as yrApiModule from '@/lib/api/yr'

// Mock the weather comparison API module
jest.mock('@/lib/api', () => ({
  fetchWeatherFromBothSources: jest.fn(),
}))

// Mock both forecast functions so WeatherContainer tests stay unit-level
jest.mock('@/lib/api/dmi', () => ({
  ...jest.requireActual('@/lib/api/dmi'),
  fetchDmiEdrForecast: jest.fn(),
}))

jest.mock('@/lib/api/yr', () => ({
  ...jest.requireActual('@/lib/api/yr'),
  fetchYrForecast: jest.fn(),
}))

const mockYrData = {
  temperature: { value: 15, unit: 'celsius' as const },
  windSpeed: { value: 10, unit: 'm/s' as const },
  weatherIcon: { code: 'partlycloudy_day', description: 'Partly cloudy' },
  timestamp: '2026-03-03T12:00:00Z',
  relativeHumidity: 65,
}

const mockDmiData = {
  temperature: { value: 14, unit: '°C' as const },
  windSpeed: { value: 11, unit: 'm/s' as const },
  weatherDescription: { code: 2, description: 'Partly cloudy' },
  timestamp: '2026-03-03T12:00:00Z',
  humidity: 68,
}

const fullMockData = {
  yr: mockYrData,
  dmi: mockDmiData,
  errors: { yr: null, dmi: null },
}

describe('WeatherContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockResolvedValue(fullMockData)
    // Both forecasts resolve with empty arrays by default in these unit tests
    ;(dmiApiModule.fetchDmiEdrForecast as jest.Mock).mockResolvedValue([])
    ;(yrApiModule.fetchYrForecast as jest.Mock).mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders weather data when loaded successfully', async () => {
    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      expect(apiModule.fetchWeatherFromBothSources).toHaveBeenCalledWith(55.6761, 12.5683)
    })

    expect(screen.getByText('YR.no Weather')).toBeInTheDocument()
    expect(screen.getByText('DMI Weather')).toBeInTheDocument()
  })

  it('uses custom latitude and longitude when provided', async () => {
    await act(async () => {
      render(<WeatherContainer latitude={56.0} longitude={13.0} />)
    })

    await waitFor(() => {
      expect(apiModule.fetchWeatherFromBothSources).toHaveBeenCalledWith(56.0, 13.0)
    })
  })

  it('handles Error objects gracefully', async () => {
    const errorMessage = 'Failed to fetch weather data'
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    )

    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    expect(screen.getByText('Warning:')).toBeInTheDocument()
  })

  it('handles non-Error thrown values gracefully', async () => {
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockRejectedValue(
      'some string error'
    )

    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch weather data')).toBeInTheDocument()
    })
  })

  it('shows YR error placeholder when yr data is null with error', async () => {
    const mockWithYrError = {
      yr: null,
      dmi: mockDmiData,
      errors: { yr: 'YR API is down', dmi: null },
    }
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockResolvedValue(mockWithYrError)

    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      expect(screen.getByText('YR API is down')).toBeInTheDocument()
    })

    // DMI should still render normally
    expect(screen.getByText('DMI Weather')).toBeInTheDocument()
  })

  it('shows DMI error placeholder when dmi data is null with error', async () => {
    const mockWithDmiError = {
      yr: mockYrData,
      dmi: null,
      errors: { yr: null, dmi: 'DMI API is down' },
    }
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockResolvedValue(mockWithDmiError)

    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      expect(screen.getByText('DMI API is down')).toBeInTheDocument()
    })

    // YR should still render normally
    expect(screen.getByText('YR.no Weather')).toBeInTheDocument()
  })

  it('shows both error placeholders when both sources fail', async () => {
    const mockBothErrors = {
      yr: null,
      dmi: null,
      errors: { yr: 'YR failed', dmi: 'DMI failed' },
    }
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockResolvedValue(mockBothErrors)

    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      expect(screen.getByText('YR failed')).toBeInTheDocument()
      expect(screen.getByText('DMI failed')).toBeInTheDocument()
    })
  })

  it('shows placeholder without error text when data is null but no error message', async () => {
    const mockNoData = {
      yr: null,
      dmi: null,
      errors: { yr: null, dmi: null },
    }
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockResolvedValue(mockNoData)

    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      // The headings in placeholder divs should be present (YR + DMI + DMI Forecast)
      const headings = screen.getAllByRole('heading', { level: 2 })
      expect(headings.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('YR.no Weather')).toBeInTheDocument()
      expect(screen.getByText('DMI Weather')).toBeInTheDocument()
    })
  })

  it('refreshes data every 10 minutes', async () => {
    await act(async () => {
      render(<WeatherContainer />)
    })

    await waitFor(() => {
      expect(apiModule.fetchWeatherFromBothSources).toHaveBeenCalledTimes(1)
    })

    // Advance time by 10 minutes
    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000)
    })

    await waitFor(() => {
      expect(apiModule.fetchWeatherFromBothSources).toHaveBeenCalledTimes(2)
    })
  })

  it('clears interval on unmount', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

    let unmount: () => void
    await act(async () => {
      const result = render(<WeatherContainer />)
      unmount = result.unmount
    })

    await waitFor(() => {
      expect(apiModule.fetchWeatherFromBothSources).toHaveBeenCalledTimes(1)
    })

    act(() => {
      unmount()
    })

    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('shows loading skeletons in placeholders when data is null and still loading', async () => {
    // Create a promise that never resolves during the test to keep loading state
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    ;(apiModule.fetchWeatherFromBothSources as jest.Mock).mockReturnValue(pendingPromise)

    const { container } = render(<WeatherContainer />)

    // Should show loading skeletons in the placeholder areas
    const pulseElements = container.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)

    // Clean up by resolving the promise
    await act(async () => {
      resolvePromise!(fullMockData)
    })
  })
})
