import { render, screen } from '@testing-library/react'
import { ForecastComparisonDisplay } from '@/components/ForecastComparisonDisplay'
import { ForecastHour } from '@/lib/schemas/forecast'

const dmiHours: ForecastHour[] = [
  {
    time: '2026-03-04T10:00:00.000Z',
    temperature: 5.6,
    windSpeed: 4.4,
    windDirection: 294,
    humidity: 82,
    precipitation: 0,
  },
  {
    time: '2026-03-04T11:00:00.000Z',
    temperature: 6.4,
    windSpeed: 3.7,
    windDirection: 300,
    humidity: 79,
    precipitation: 1.2,
  },
]

const yrHours: ForecastHour[] = [
  {
    time: '2026-03-04T10:00:00Z',
    temperature: 5.0,
    windSpeed: 4.7,
    windDirection: 295,
    humidity: 90,
    precipitation: 0,
  },
  {
    time: '2026-03-04T11:00:00Z',
    temperature: 6.2,
    windSpeed: 4.5,
    windDirection: 295,
    humidity: 88,
    precipitation: 0,
  },
]

describe('ForecastComparisonDisplay', () => {
  it('renders the heading', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getByText('24h Forecast Comparison')).toBeInTheDocument()
  })

  it('renders DMI and YR source attribution', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getAllByText(/DMI/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/YR/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders column sub-headers DMI and YR', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    const dmiHeaders = screen.getAllByText('DMI')
    const yrHeaders  = screen.getAllByText('YR')
    expect(dmiHeaders.length).toBeGreaterThanOrEqual(1)
    expect(yrHeaders.length).toBeGreaterThanOrEqual(1)
  })

  it('renders DMI temperature values', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getByText('5.6°')).toBeInTheDocument()
    expect(screen.getByText('6.4°')).toBeInTheDocument()
  })

  it('renders YR temperature values', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getByText('5°')).toBeInTheDocument()
    expect(screen.getByText('6.2°')).toBeInTheDocument()
  })

  it('renders DMI wind speed values', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getByText('4.4')).toBeInTheDocument()
    expect(screen.getByText('3.7')).toBeInTheDocument()
  })

  it('renders YR wind speed values', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getAllByText('4.7').length).toBeGreaterThanOrEqual(1)
  })

  it('renders wind direction as compass labels', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    // 294° and 295° both → WNW
    expect(screen.getAllByText('WNW').length).toBeGreaterThanOrEqual(1)
  })

  it('renders precipitation when non-zero (DMI)', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getByText('1.2 mm')).toBeInTheDocument()
  })

  it('renders dashes for zero precipitation', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    // Multiple zero-precip rows → multiple dashes
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('renders humidity values', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={yrHours} />)
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = render(
      <ForecastComparisonDisplay dmi={[]} yr={[]} isLoading />,
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('24h Forecast Comparison')).not.toBeInTheDocument()
  })

  it('shows empty state message when both arrays are empty', () => {
    render(<ForecastComparisonDisplay dmi={[]} yr={[]} />)
    expect(screen.getByText('24h Forecast Comparison')).toBeInTheDocument()
    expect(screen.getByText(/no forecast data available/i)).toBeInTheDocument()
  })

  it('renders when only DMI data is provided', () => {
    render(<ForecastComparisonDisplay dmi={dmiHours} yr={[]} />)
    expect(screen.getByText('5.6°')).toBeInTheDocument()
  })

  it('renders when only YR data is provided', () => {
    render(<ForecastComparisonDisplay dmi={[]} yr={yrHours} />)
    expect(screen.getByText('5°')).toBeInTheDocument()
  })

  it('aligns hours from both sources by time slot', () => {
    // DMI has hour T+0, YR has hour T+0 and T+1 — both T+0 rows should appear once
    const dmiOne: ForecastHour[] = [
      { time: '2026-03-04T10:00:00.000Z', temperature: 5.6, windSpeed: 4.4, windDirection: 294, humidity: 82, precipitation: 0 },
    ]
    const yrTwo: ForecastHour[] = [
      { time: '2026-03-04T10:00:00Z', temperature: 5.0, windSpeed: 4.7, windDirection: 295, humidity: 90, precipitation: 0 },
      { time: '2026-03-04T11:00:00Z', temperature: 6.0, windSpeed: 4.0, windDirection: 280, humidity: 85, precipitation: 0 },
    ]
    render(<ForecastComparisonDisplay dmi={dmiOne} yr={yrTwo} />)
    // DMI temp for T+0
    expect(screen.getByText('5.6°')).toBeInTheDocument()
    // YR temp for T+1 (DMI has no entry → rendered as dash)
    expect(screen.getByText('6°')).toBeInTheDocument()
  })

  it('renders 24 rows for full equal-length forecasts', () => {
    const make = (offset: number): ForecastHour[] =>
      Array.from({ length: 24 }, (_, i) => ({
        time: new Date(Date.UTC(2026, 2, 4, 9 + i)).toISOString(),
        temperature: 5 + offset,
        windSpeed: 4.4,
        windDirection: 270,
        humidity: 80,
        precipitation: 0,
      }))

    render(<ForecastComparisonDisplay dmi={make(0)} yr={make(1)} />)
    // DMI temperature (5°) appears 24 times, YR (6°) appears 24 times
    expect(screen.getAllByText('5°')).toHaveLength(24)
    expect(screen.getAllByText('6°')).toHaveLength(24)
  })
})
