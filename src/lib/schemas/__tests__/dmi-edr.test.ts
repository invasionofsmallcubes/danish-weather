import {
  DmiEdrFeatureSchema,
  DmiEdrResponseSchema,
  DmiEdrForecastHourSchema,
} from '@/lib/schemas/dmi'

const validFeature = {
  type: 'Feature' as const,
  geometry: {
    type: 'Point' as const,
    coordinates: [12.5683, 55.6761] as [number, number],
  },
  properties: {
    step: '2026-03-04T10:00:00.000Z',
    'temperature-2m': 278.77,
    'wind-speed': 4.41,
    'wind-dir': 294.43,
    'relative-humidity-2m': 82.36,
    'total-precipitation': 0.0,
  },
}

describe('DmiEdrFeatureSchema', () => {
  it('parses a valid feature', () => {
    const result = DmiEdrFeatureSchema.parse(validFeature)
    expect(result.properties['temperature-2m']).toBe(278.77)
    expect(result.properties['wind-speed']).toBe(4.41)
    expect(result.properties['wind-dir']).toBe(294.43)
    expect(result.properties['relative-humidity-2m']).toBe(82.36)
    expect(result.properties['total-precipitation']).toBe(0.0)
    expect(result.properties.step).toBe('2026-03-04T10:00:00.000Z')
  })

  it('defaults total-precipitation to 0 when missing', () => {
    const featureWithoutPrecip = {
      ...validFeature,
      properties: {
        ...validFeature.properties,
        'total-precipitation': undefined,
      },
    }
    const result = DmiEdrFeatureSchema.parse(featureWithoutPrecip)
    expect(result.properties['total-precipitation']).toBe(0)
  })

  it('rejects a feature missing temperature-2m', () => {
    const bad = {
      ...validFeature,
      properties: {
        step: '2026-03-04T10:00:00.000Z',
        'wind-speed': 4.41,
        'wind-dir': 294.43,
        'relative-humidity-2m': 82.36,
      },
    }
    expect(() => DmiEdrFeatureSchema.parse(bad)).toThrow()
  })

  it('rejects wrong geometry type', () => {
    const bad = {
      ...validFeature,
      geometry: { type: 'Polygon', coordinates: [] },
    }
    expect(() => DmiEdrFeatureSchema.parse(bad)).toThrow()
  })
})

describe('DmiEdrResponseSchema', () => {
  it('parses a valid FeatureCollection with multiple features', () => {
    const collection = {
      type: 'FeatureCollection' as const,
      features: [validFeature, { ...validFeature, properties: { ...validFeature.properties, step: '2026-03-04T11:00:00.000Z' } }],
    }
    const result = DmiEdrResponseSchema.parse(collection)
    expect(result.features).toHaveLength(2)
  })

  it('parses an empty features array', () => {
    const empty = { type: 'FeatureCollection' as const, features: [] }
    const result = DmiEdrResponseSchema.parse(empty)
    expect(result.features).toHaveLength(0)
  })

  it('rejects non-FeatureCollection type', () => {
    const bad = { type: 'Feature', features: [validFeature] }
    expect(() => DmiEdrResponseSchema.parse(bad)).toThrow()
  })
})

describe('DmiEdrForecastHourSchema', () => {
  it('parses a valid domain forecast hour', () => {
    const hour = {
      time: '2026-03-04T10:00:00.000Z',
      temperature: 5.6,
      windSpeed: 4.4,
      windDirection: 294,
      humidity: 82,
      precipitation: 0.0,
    }
    const result = DmiEdrForecastHourSchema.parse(hour)
    expect(result.temperature).toBe(5.6)
    expect(result.windDirection).toBe(294)
  })

  it('rejects missing time field', () => {
    const bad = {
      temperature: 5.6,
      windSpeed: 4.4,
      windDirection: 294,
      humidity: 82,
      precipitation: 0,
    }
    expect(() => DmiEdrForecastHourSchema.parse(bad)).toThrow()
  })
})
