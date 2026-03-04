import React from 'react'
import { render, screen } from '@testing-library/react'
import { DmiWeatherDisplay } from '@/components/DmiWeatherDisplay'
import { DmiCurrentConditions } from '@/lib/schemas/dmi'

const baseDmiData: DmiCurrentConditions = {
  temperature: { value: 14.5, unit: '°C' },
  windSpeed: { value: 8.2, unit: 'm/s' },
  weatherDescription: { code: 2, description: 'Partly cloudy' },
  timestamp: '2026-03-03T12:00:00Z',
}

describe('DmiWeatherDisplay', () => {
  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <DmiWeatherDisplay data={baseDmiData} isLoading={true} />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    // Should NOT render the actual weather data
    expect(screen.queryByText('DMI Weather')).not.toBeInTheDocument()
  })

  it('renders weather data when not loading', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)

    expect(screen.getByText('DMI Weather')).toBeInTheDocument()
    expect(screen.getByText('Temperature:')).toBeInTheDocument()
    expect(screen.getByText('14.5°C')).toBeInTheDocument()
    expect(screen.getByText('8.2 m/s')).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
  })

  it('renders humidity when provided', () => {
    const dataWithHumidity: DmiCurrentConditions = {
      ...baseDmiData,
      humidity: 72,
    }

    render(<DmiWeatherDisplay data={dataWithHumidity} />)

    expect(screen.getByText('Humidity:')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('does not render humidity when not provided', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)

    expect(screen.queryByText('Humidity:')).not.toBeInTheDocument()
  })

  it('renders wind direction when provided', () => {
    const dataWithWindDirection: DmiCurrentConditions = {
      ...baseDmiData,
      windDirection: { value: 180, unit: 'degrees' },
    }

    render(<DmiWeatherDisplay data={dataWithWindDirection} />)

    expect(screen.getByText('Wind Direction:')).toBeInTheDocument()
    expect(screen.getByText('S (180°)')).toBeInTheDocument()
  })

  it('does not render wind direction when not provided', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)

    expect(screen.queryByText('Wind Direction:')).not.toBeInTheDocument()
  })

  it('formats timestamp as localized time string', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)

    // The "Last updated:" label should be present
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('renders all optional fields together', () => {
    const fullData: DmiCurrentConditions = {
      ...baseDmiData,
      humidity: 65,
      windDirection: { value: 270, unit: 'degrees' },
    }

    render(<DmiWeatherDisplay data={fullData} />)

    expect(screen.getByText('DMI Weather')).toBeInTheDocument()
    expect(screen.getByText('14.5°C')).toBeInTheDocument()
    expect(screen.getByText('8.2 m/s')).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('W (270°)')).toBeInTheDocument()
  })

  it('defaults isLoading to false', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)

    // Should render actual content, not skeleton
    expect(screen.getByText('DMI Weather')).toBeInTheDocument()
  })
})
