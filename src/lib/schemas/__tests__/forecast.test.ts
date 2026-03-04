import { ForecastHourSchema } from '@/lib/schemas/forecast'

describe('ForecastHourSchema', () => {
  const valid = {
    time: '2026-03-04T10:00:00.000Z',
    temperature: 5.6,
    windSpeed: 4.4,
    windDirection: 294,
    humidity: 82,
    precipitation: 0.0,
  }

  it('parses a valid forecast hour', () => {
    const result = ForecastHourSchema.parse(valid)
    expect(result.temperature).toBe(5.6)
    expect(result.windSpeed).toBe(4.4)
    expect(result.windDirection).toBe(294)
    expect(result.humidity).toBe(82)
    expect(result.precipitation).toBe(0.0)
  })

  it('accepts non-zero precipitation', () => {
    const result = ForecastHourSchema.parse({ ...valid, precipitation: 1.4 })
    expect(result.precipitation).toBe(1.4)
  })

  it('rejects missing time', () => {
    const { time: _omit, ...noTime } = valid
    expect(() => ForecastHourSchema.parse(noTime)).toThrow()
  })

  it('rejects non-numeric temperature', () => {
    expect(() => ForecastHourSchema.parse({ ...valid, temperature: 'cold' })).toThrow()
  })

  it('rejects missing humidity', () => {
    const { humidity: _omit, ...noHumidity } = valid
    expect(() => ForecastHourSchema.parse(noHumidity)).toThrow()
  })
})
