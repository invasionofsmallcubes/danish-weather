import React from 'react'
import { render, screen } from '@testing-library/react'
import { YrWeatherDisplay } from '@/components/YrWeatherDisplay'
import { YrCurrentConditions } from '@/lib/schemas/yr'

const baseYrData: YrCurrentConditions = {
  temperature: { value: 12.3, unit: 'celsius' },
  windSpeed: { value: 5.4, unit: 'm/s' },
  weatherIcon: { code: 'partlycloudy_day', description: 'Partly cloudy' },
  timestamp: '2026-03-03T14:00:00Z',
}

describe('YrWeatherDisplay', () => {
  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <YrWeatherDisplay data={baseYrData} isLoading={true} />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    // Should NOT render the actual weather data
    expect(screen.queryByText('YR.no Weather')).not.toBeInTheDocument()
  })

  it('renders weather data when not loading', () => {
    render(<YrWeatherDisplay data={baseYrData} />)

    expect(screen.getByText('YR.no Weather')).toBeInTheDocument()
    expect(screen.getByText('Temperature:')).toBeInTheDocument()
    expect(screen.getByText('12.3°C')).toBeInTheDocument()
    expect(screen.getByText('5.4 m/s')).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
  })

  it('renders temperature with celsius unit correctly', () => {
    render(<YrWeatherDisplay data={baseYrData} />)
    expect(screen.getByText('12.3°C')).toBeInTheDocument()
  })

  it('renders humidity when provided', () => {
    const dataWithHumidity: YrCurrentConditions = {
      ...baseYrData,
      relativeHumidity: 85,
    }

    render(<YrWeatherDisplay data={dataWithHumidity} />)

    expect(screen.getByText('Humidity:')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('does not render humidity when not provided', () => {
    render(<YrWeatherDisplay data={baseYrData} />)

    expect(screen.queryByText('Humidity:')).not.toBeInTheDocument()
  })

  it('renders wind direction when provided', () => {
    const dataWithWindDirection: YrCurrentConditions = {
      ...baseYrData,
      windDirection: { value: 225, unit: 'degrees' },
    }

    render(<YrWeatherDisplay data={dataWithWindDirection} />)

    expect(screen.getByText('Wind Direction:')).toBeInTheDocument()
    expect(screen.getByText('225°')).toBeInTheDocument()
  })

  it('does not render wind direction when not provided', () => {
    render(<YrWeatherDisplay data={baseYrData} />)

    expect(screen.queryByText('Wind Direction:')).not.toBeInTheDocument()
  })

  it('formats timestamp as localized time string', () => {
    render(<YrWeatherDisplay data={baseYrData} />)

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('renders all optional fields together', () => {
    const fullData: YrCurrentConditions = {
      ...baseYrData,
      relativeHumidity: 90,
      windDirection: { value: 45, unit: 'degrees' },
    }

    render(<YrWeatherDisplay data={fullData} />)

    expect(screen.getByText('YR.no Weather')).toBeInTheDocument()
    expect(screen.getByText('12.3°C')).toBeInTheDocument()
    expect(screen.getByText('5.4 m/s')).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('45°')).toBeInTheDocument()
  })

  it('defaults isLoading to false', () => {
    render(<YrWeatherDisplay data={baseYrData} />)

    expect(screen.getByText('YR.no Weather')).toBeInTheDocument()
  })

  it('renders F suffix when temperature unit is not celsius', () => {
    // Force a non-celsius unit to cover the ternary branch
    const dataWithFahrenheit = {
      ...baseYrData,
      temperature: { value: 55, unit: 'fahrenheit' as any },
    }

    render(<YrWeatherDisplay data={dataWithFahrenheit} />)

    expect(screen.getByText('55°F')).toBeInTheDocument()
  })
})
