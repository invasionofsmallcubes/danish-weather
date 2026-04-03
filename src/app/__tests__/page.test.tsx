import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

jest.mock('@/components/WeatherContainer', () => ({
  WeatherContainer: ({ latitude, longitude }: { latitude: number; longitude: number }) => (
    <div data-testid="weather-container" data-lat={latitude} data-lon={longitude}>
      Mocked WeatherContainer
    </div>
  ),
}))

jest.mock('@/components/Calendar', () => ({
  Calendar: () => <div data-testid="calendar">Mocked Calendar</div>,
}))

describe('Home page', () => {
  it('renders the page heading', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Danish Weather')
  })

  it('renders the subtitle', () => {
    render(<Home />)
    expect(
      screen.getByText('Real-time weather data from YR.no and DMI'),
    ).toBeInTheDocument()
  })

  it('renders the Copenhagen Weather section heading', () => {
    render(<Home />)
    expect(screen.getByText('Copenhagen Weather')).toBeInTheDocument()
  })

  it('renders WeatherContainer with Copenhagen coordinates', () => {
    render(<Home />)
    const container = screen.getByTestId('weather-container')
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute('data-lat', '55.6761')
    expect(container).toHaveAttribute('data-lon', '12.5683')
  })

  it('renders the footer with YR.no link', () => {
    render(<Home />)
    const yrLink = screen.getByRole('link', { name: 'YR.no' })
    expect(yrLink).toHaveAttribute('href', 'https://www.yr.no')
    expect(yrLink).toHaveAttribute('target', '_blank')
    expect(yrLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the footer with DMI link', () => {
    render(<Home />)
    const dmiLink = screen.getByRole('link', { name: 'DMI' })
    expect(dmiLink).toHaveAttribute('href', 'https://www.dmi.dk')
    expect(dmiLink).toHaveAttribute('target', '_blank')
    expect(dmiLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the refresh interval note', () => {
    render(<Home />)
    expect(screen.getByText('Refresh every 10 minutes')).toBeInTheDocument()
  })

  it('renders a main element as root', () => {
    render(<Home />)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
  })

  it('renders the header inside main', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.closest('header')).toBeInTheDocument()
  })

  it('renders the footer inside main', () => {
    render(<Home />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
  })
})
