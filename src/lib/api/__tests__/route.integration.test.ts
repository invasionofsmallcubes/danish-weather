/**
 * @jest-environment node
 */

/**
 * Integration tests that call the REAL external weather APIs directly.
 *
 * These test the same endpoints that the Next.js route handler (/api/weather) calls:
 * - MET Norway (api.met.no) — the "yr" source
 * - Open-Meteo (api.open-meteo.com) — the "dmi" source
 *
 * Coordinates used: Copenhagen (55.6761, 12.5683)
 */

const API_TIMEOUT = 30_000

// Same coordinates the app uses
const COPENHAGEN = { lat: 55.6761, lon: 12.5683 }
const AARHUS = { lat: 56.1629, lon: 10.2039 }

async function fetchMetNorway(latitude: number, longitude: number) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DanishWeatherApp/1.0 (https://github.com/yourusername/danishweather)',
    },
  })
  if (!response.ok) {
    throw new Error(`MET Norway HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

async function fetchOpenMeteo(latitude: number, longitude: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', latitude.toString())
  url.searchParams.set('longitude', longitude.toString())
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,weather_code')
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

describe('MET Norway API (real integration)', () => {
  it(
    'should return a valid response for Copenhagen',
    async () => {
      const data = await fetchMetNorway(COPENHAGEN.lat, COPENHAGEN.lon)

      expect(data.properties).toBeDefined()
      expect(Array.isArray(data.properties.timeseries)).toBe(true)
      expect(data.properties.timeseries.length).toBeGreaterThan(0)

      const first = data.properties.timeseries[0]
      expect(first.time).toBeDefined()
      expect(typeof first.time).toBe('string')

      const instant = first.data.instant.details
      expect(typeof instant.air_temperature).toBe('number')
      expect(typeof instant.wind_speed).toBe('number')

      // Temperature within plausible range for Denmark
      expect(instant.air_temperature).toBeGreaterThanOrEqual(-40)
      expect(instant.air_temperature).toBeLessThanOrEqual(50)

      // Wind speed non-negative
      expect(instant.wind_speed).toBeGreaterThanOrEqual(0)
    },
    API_TIMEOUT,
  )

  it(
    'should return a valid response for Aarhus',
    async () => {
      const data = await fetchMetNorway(AARHUS.lat, AARHUS.lon)

      expect(data.properties).toBeDefined()
      expect(data.properties.timeseries.length).toBeGreaterThan(0)

      const instant = data.properties.timeseries[0].data.instant.details
      expect(typeof instant.air_temperature).toBe('number')
      expect(typeof instant.wind_speed).toBe('number')
    },
    API_TIMEOUT,
  )

  it(
    'should include symbol codes in at least some timeseries entries',
    async () => {
      const data = await fetchMetNorway(COPENHAGEN.lat, COPENHAGEN.lon)

      const withSymbol = data.properties.timeseries.find(
        (t: { data: { next_1_hours?: { summary: { symbol_code: string } } } }) =>
          t.data.next_1_hours?.summary?.symbol_code,
      )
      expect(withSymbol).toBeDefined()
      expect(typeof withSymbol.data.next_1_hours.summary.symbol_code).toBe('string')
      expect(withSymbol.data.next_1_hours.summary.symbol_code.length).toBeGreaterThan(0)
    },
    API_TIMEOUT,
  )

  it(
    'should include relative_humidity in instant details',
    async () => {
      const data = await fetchMetNorway(COPENHAGEN.lat, COPENHAGEN.lon)
      const instant = data.properties.timeseries[0].data.instant.details

      expect(typeof instant.relative_humidity).toBe('number')
      expect(instant.relative_humidity).toBeGreaterThanOrEqual(0)
      expect(instant.relative_humidity).toBeLessThanOrEqual(100)
    },
    API_TIMEOUT,
  )

  it(
    'should return multiple timeseries entries (forecast)',
    async () => {
      const data = await fetchMetNorway(COPENHAGEN.lat, COPENHAGEN.lon)

      // MET Norway typically returns many forecast entries
      expect(data.properties.timeseries.length).toBeGreaterThan(10)
    },
    API_TIMEOUT,
  )
})

describe('Open-Meteo API (real integration)', () => {
  it(
    'should return a valid response for Copenhagen',
    async () => {
      const data = await fetchOpenMeteo(COPENHAGEN.lat, COPENHAGEN.lon)

      expect(data.current).toBeDefined()
      expect(typeof data.current.temperature_2m).toBe('number')
      expect(typeof data.current.wind_speed_10m).toBe('number')
      expect(typeof data.current.weather_code).toBe('number')
      expect(typeof data.current.time).toBe('string')

      // Temperature within plausible range
      expect(data.current.temperature_2m).toBeGreaterThanOrEqual(-40)
      expect(data.current.temperature_2m).toBeLessThanOrEqual(50)

      // Wind speed non-negative (km/h)
      expect(data.current.wind_speed_10m).toBeGreaterThanOrEqual(0)

      // WMO weather code in valid range
      expect(data.current.weather_code).toBeGreaterThanOrEqual(0)
      expect(data.current.weather_code).toBeLessThanOrEqual(99)
    },
    API_TIMEOUT,
  )

  it(
    'should return a valid response for Aarhus',
    async () => {
      const data = await fetchOpenMeteo(AARHUS.lat, AARHUS.lon)

      expect(data.current).toBeDefined()
      expect(typeof data.current.temperature_2m).toBe('number')
      expect(typeof data.current.wind_speed_10m).toBe('number')
    },
    API_TIMEOUT,
  )

  it(
    'should include coordinate metadata in the response',
    async () => {
      const data = await fetchOpenMeteo(COPENHAGEN.lat, COPENHAGEN.lon)

      // Open-Meteo echoes back the coordinates
      expect(typeof data.latitude).toBe('number')
      expect(typeof data.longitude).toBe('number')
      // Should be close to what we requested (API may round slightly)
      expect(data.latitude).toBeCloseTo(COPENHAGEN.lat, 0)
      expect(data.longitude).toBeCloseTo(COPENHAGEN.lon, 0)
    },
    API_TIMEOUT,
  )

  it(
    'should return a time string in ISO-like format',
    async () => {
      const data = await fetchOpenMeteo(COPENHAGEN.lat, COPENHAGEN.lon)

      // Open-Meteo returns time like "2026-03-04T07:00"
      expect(data.current.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
    },
    API_TIMEOUT,
  )
})

describe('DMI EDR API (real integration)', () => {
  const EDR_BASE =
    'https://dmigw.govcloud.dk/v1/forecastedr/collections/harmonie_dini_sf/position'

  function buildEdrUrl(lat: number, lon: number): string {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const datetime = `${now.toISOString().replace('.000Z', 'Z')}/${end.toISOString().replace('.000Z', 'Z')}`
    const url = new URL(EDR_BASE)
    url.searchParams.set('coords', `POINT(${lon} ${lat})`)
    url.searchParams.set(
      'parameter-name',
      'temperature-2m,wind-speed,wind-dir,relative-humidity-2m,total-precipitation',
    )
    url.searchParams.set('f', 'GeoJSON')
    url.searchParams.set('datetime', datetime)
    return url.toString()
  }

  it(
    'should return a GeoJSON FeatureCollection for Copenhagen',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data.type).toBe('FeatureCollection')
      expect(Array.isArray(data.features)).toBe(true)
      expect(data.features.length).toBeGreaterThan(0)
    },
    API_TIMEOUT,
  )

  it(
    'should return ~24 hourly features for Copenhagen',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      const data = await response.json()

      // EDR steps are 1h, so we expect roughly 24 features
      expect(data.features.length).toBeGreaterThanOrEqual(20)
      expect(data.features.length).toBeLessThanOrEqual(26)
    },
    API_TIMEOUT,
  )

  it(
    'should include all required parameters in each feature',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      const data = await response.json()

      const first = data.features[0]
      const p = first.properties

      expect(typeof p['temperature-2m']).toBe('number')
      expect(typeof p['wind-speed']).toBe('number')
      expect(typeof p['wind-dir']).toBe('number')
      expect(typeof p['relative-humidity-2m']).toBe('number')
      expect(typeof p.step).toBe('string')
    },
    API_TIMEOUT,
  )

  it(
    'should return temperatures in Kelvin (values around 273±50)',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      const data = await response.json()

      const first = data.features[0]
      const tempK: number = first.properties['temperature-2m']

      // Denmark: roughly -20°C to 40°C → 253K to 313K
      expect(tempK).toBeGreaterThan(253)
      expect(tempK).toBeLessThan(313)
    },
    API_TIMEOUT,
  )

  it(
    'should return wind speeds in m/s (non-negative, plausible range)',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      const data = await response.json()

      for (const feature of data.features.slice(0, 5)) {
        const ws: number = feature.properties['wind-speed']
        expect(ws).toBeGreaterThanOrEqual(0)
        expect(ws).toBeLessThan(60) // extreme upper bound
      }
    },
    API_TIMEOUT,
  )

  it(
    'should return wind direction in 0–360 range',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      const data = await response.json()

      for (const feature of data.features.slice(0, 5)) {
        const wd: number = feature.properties['wind-dir']
        expect(wd).toBeGreaterThanOrEqual(0)
        expect(wd).toBeLessThanOrEqual(360)
      }
    },
    API_TIMEOUT,
  )

  it(
    'should return humidity in 0–100 range',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      const data = await response.json()

      for (const feature of data.features.slice(0, 5)) {
        const rh: number = feature.properties['relative-humidity-2m']
        expect(rh).toBeGreaterThanOrEqual(0)
        expect(rh).toBeLessThanOrEqual(100)
      }
    },
    API_TIMEOUT,
  )

  it(
    'should have ascending step timestamps',
    async () => {
      const response = await fetch(buildEdrUrl(COPENHAGEN.lat, COPENHAGEN.lon))
      const data = await response.json()

      const times: number[] = data.features.map(
        (f: { properties: { step: string } }) => new Date(f.properties.step).getTime(),
      )

      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i - 1])
      }
    },
    API_TIMEOUT,
  )
})

describe('Cross-API consistency (real integration)', () => {
  it(
    'should report temperatures within 10°C of each other for Copenhagen',
    async () => {
      const [metData, openMeteoData] = await Promise.all([
        fetchMetNorway(COPENHAGEN.lat, COPENHAGEN.lon),
        fetchOpenMeteo(COPENHAGEN.lat, COPENHAGEN.lon),
      ])

      const yrTemp = metData.properties.timeseries[0].data.instant.details.air_temperature
      const dmiTemp = openMeteoData.current.temperature_2m

      // Both APIs should agree within a 10°C margin for the same location
      expect(Math.abs(yrTemp - dmiTemp)).toBeLessThan(10)
    },
    API_TIMEOUT,
  )

  it(
    'should report wind speeds within a reasonable margin for Copenhagen',
    async () => {
      const [metData, openMeteoData] = await Promise.all([
        fetchMetNorway(COPENHAGEN.lat, COPENHAGEN.lon),
        fetchOpenMeteo(COPENHAGEN.lat, COPENHAGEN.lon),
      ])

      const yrWind = metData.properties.timeseries[0].data.instant.details.wind_speed // m/s
      const dmiWind = openMeteoData.current.wind_speed_10m / 3.6 // Convert km/h to m/s

      // Wind speeds should be within 10 m/s of each other
      expect(Math.abs(yrWind - dmiWind)).toBeLessThan(10)
    },
    API_TIMEOUT,
  )

  it(
    'should both return valid data when called in parallel',
    async () => {
      const results = await Promise.allSettled([
        fetchMetNorway(COPENHAGEN.lat, COPENHAGEN.lon),
        fetchOpenMeteo(COPENHAGEN.lat, COPENHAGEN.lon),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('fulfilled')
    },
    API_TIMEOUT,
  )
})
