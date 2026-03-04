import React from 'react'
import { render, screen } from '@testing-library/react'
import { DmiWeatherDisplay } from '@/components/DmiWeatherDisplay'
import { DmiCurrentConditions } from '@/lib/schemas/dmi'
import { WeatherDiff } from '@/lib/api'

const baseDmiData: DmiCurrentConditions = {
  temperature: { value: 14.5, unit: '°C' },
  windSpeed: { value: 8.2, unit: 'm/s' },
  weatherDescription: { code: 2, description: 'Partly cloudy' },
  timestamp: '2026-03-03T12:00:00Z',
}

const fullDmiData: DmiCurrentConditions = {
  ...baseDmiData,
  humidity: 65,
  windDirection: { value: 270, unit: 'degrees' },
}

const zeroDiff: WeatherDiff = {
  temperature: 0,
  windSpeed: 0,
  windDirection: 0,
  humidity: 0,
}

const positiveDiff: WeatherDiff = {
  temperature: 1.3,
  windSpeed: 2.5,
  windDirection: 30,
  humidity: 4,
}

const negativeDiff: WeatherDiff = {
  temperature: -1.3,
  windSpeed: -2.5,
  windDirection: -30,
  humidity: -4,
}

const nullDiff: WeatherDiff = {
  temperature: null,
  windSpeed: null,
  windDirection: null,
  humidity: null,
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

describe('DmiWeatherDisplay — loading state', () => {
  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <DmiWeatherDisplay data={baseDmiData} isLoading={true} />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('DMI Weather')).not.toBeInTheDocument()
  })

  it('defaults isLoading to false and renders content', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)
    expect(screen.getByText('DMI Weather')).toBeInTheDocument()
  })

  it('does not render skeleton when isLoading is false', () => {
    const { container } = render(
      <DmiWeatherDisplay data={baseDmiData} isLoading={false} />
    )
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
  })
})

// ─── Core fields ─────────────────────────────────────────────────────────────

describe('DmiWeatherDisplay — core fields', () => {
  it('renders all always-present fields', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)

    expect(screen.getByText('DMI Weather')).toBeInTheDocument()
    expect(screen.getByText('Temperature:')).toBeInTheDocument()
    expect(screen.getByText('14.5°C')).toBeInTheDocument()
    expect(screen.getByText('Wind Speed:')).toBeInTheDocument()
    expect(screen.getByText('8.2 m/s')).toBeInTheDocument()
    expect(screen.getByText('Conditions:')).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('formats timestamp as localised time string', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })
})

// ─── Optional fields ─────────────────────────────────────────────────────────

describe('DmiWeatherDisplay — optional fields', () => {
  it('renders humidity when provided', () => {
    render(<DmiWeatherDisplay data={{ ...baseDmiData, humidity: 72 }} />)
    expect(screen.getByText('Humidity:')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('does not render humidity row when absent', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)
    expect(screen.queryByText('Humidity:')).not.toBeInTheDocument()
  })

  it('renders wind direction when provided', () => {
    render(
      <DmiWeatherDisplay
        data={{ ...baseDmiData, windDirection: { value: 180, unit: 'degrees' } }}
      />
    )
    expect(screen.getByText('Wind Direction:')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('does not render wind direction row when absent', () => {
    render(<DmiWeatherDisplay data={baseDmiData} />)
    expect(screen.queryByText('Wind Direction:')).not.toBeInTheDocument()
  })

  it('renders all optional fields together', () => {
    render(<DmiWeatherDisplay data={fullDmiData} />)
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('W')).toBeInTheDocument()
  })
})

// ─── Diff absent / null values ───────────────────────────────────────────────

describe('DmiWeatherDisplay — no diff badges when diff is absent', () => {
  it('shows no badges when diff prop is not provided', () => {
    render(<DmiWeatherDisplay data={fullDmiData} />)
    expect(screen.queryByText(/^\(/)).not.toBeInTheDocument()
  })

  it('shows no badges when all diff fields are null', () => {
    render(<DmiWeatherDisplay data={fullDmiData} diff={nullDiff} />)
    expect(screen.queryByText(/^\(/)).not.toBeInTheDocument()
  })
})

// ─── DiffBadge — positive values (orange) ────────────────────────────────────

describe('DmiWeatherDisplay — DiffBadge positive values', () => {
  it('shows +temperature badge with leading plus sign', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={positiveDiff} />)
    expect(screen.getByText('(+1.3°C)')).toBeInTheDocument()
  })

  it('applies orange colour class for positive temperature diff', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={positiveDiff} />)
    const badge = screen.getByText('(+1.3°C)')
    expect(badge).toHaveClass('text-orange-600')
  })

  it('shows +windSpeed badge', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={positiveDiff} />)
    expect(screen.getByText('(+2.5 m/s)')).toBeInTheDocument()
  })

  it('shows +humidity badge when humidity is present', () => {
    render(<DmiWeatherDisplay data={{ ...baseDmiData, humidity: 80 }} diff={positiveDiff} />)
    expect(screen.getByText('(+4%)')).toBeInTheDocument()
  })

  it('shows +windDirection badge when wind direction is present', () => {
    render(
      <DmiWeatherDisplay
        data={{ ...baseDmiData, windDirection: { value: 270, unit: 'degrees' } }}
        diff={positiveDiff}
      />
    )
    expect(screen.getByText('(+30°)')).toBeInTheDocument()
  })
})

// ─── DiffBadge — negative values (blue) ──────────────────────────────────────

describe('DmiWeatherDisplay — DiffBadge negative values', () => {
  it('shows −temperature badge without extra minus sign', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={negativeDiff} />)
    expect(screen.getByText('(-1.3°C)')).toBeInTheDocument()
  })

  it('applies blue colour class for negative temperature diff', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={negativeDiff} />)
    const badge = screen.getByText('(-1.3°C)')
    expect(badge).toHaveClass('text-blue-600')
  })

  it('shows −windSpeed badge', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={negativeDiff} />)
    expect(screen.getByText('(-2.5 m/s)')).toBeInTheDocument()
  })

  it('shows −humidity badge when humidity is present', () => {
    render(<DmiWeatherDisplay data={{ ...baseDmiData, humidity: 80 }} diff={negativeDiff} />)
    expect(screen.getByText('(-4%)')).toBeInTheDocument()
  })

  it('shows −windDirection badge when wind direction is present', () => {
    render(
      <DmiWeatherDisplay
        data={{ ...baseDmiData, windDirection: { value: 270, unit: 'degrees' } }}
        diff={negativeDiff}
      />
    )
    expect(screen.getByText('(-30°)')).toBeInTheDocument()
  })
})

// ─── DiffBadge — zero values (grey) ──────────────────────────────────────────

describe('DmiWeatherDisplay — DiffBadge zero values', () => {
  it('shows zero temperature badge without sign', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={zeroDiff} />)
    expect(screen.getByText('(0°C)')).toBeInTheDocument()
  })

  it('applies grey colour class for zero temperature diff', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={zeroDiff} />)
    const badge = screen.getByText('(0°C)')
    expect(badge).toHaveClass('text-gray-500')
  })

  it('shows zero windSpeed badge', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={zeroDiff} />)
    expect(screen.getByText('(0 m/s)')).toBeInTheDocument()
  })

  it('shows zero humidity badge when humidity is present', () => {
    render(<DmiWeatherDisplay data={{ ...baseDmiData, humidity: 80 }} diff={zeroDiff} />)
    expect(screen.getByText('(0%)')).toBeInTheDocument()
  })

  it('shows zero windDirection badge when wind direction is present', () => {
    render(
      <DmiWeatherDisplay
        data={{ ...baseDmiData, windDirection: { value: 270, unit: 'degrees' } }}
        diff={zeroDiff}
      />
    )
    expect(screen.getByText('(0°)')).toBeInTheDocument()
  })
})

// ─── Diff present but field missing from data ─────────────────────────────────

describe('DmiWeatherDisplay — diff suppressed when data field is absent', () => {
  it('does not show humidity diff when humidity data is absent', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={positiveDiff} />)
    // humidity row doesn't render at all, so no humidity badge either
    expect(screen.queryByText('(+4%)')).not.toBeInTheDocument()
  })

  it('does not show windDirection diff when windDirection data is absent', () => {
    render(<DmiWeatherDisplay data={baseDmiData} diff={positiveDiff} />)
    expect(screen.queryByText('(+30°)')).not.toBeInTheDocument()
  })
})

// ─── Mixed null/non-null diff fields ─────────────────────────────────────────

describe('DmiWeatherDisplay — partial diff (some fields null)', () => {
  it('shows only the non-null diff badges', () => {
    const partialDiff: WeatherDiff = {
      temperature: 2.0,
      windSpeed: null,
      windDirection: null,
      humidity: null,
    }
    render(<DmiWeatherDisplay data={fullDmiData} diff={partialDiff} />)

    expect(screen.getByText('(+2°C)')).toBeInTheDocument()
    expect(screen.queryByText(/\(.*m\/s\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(.*%\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(.*°\)/)).not.toBeInTheDocument()
  })
})
