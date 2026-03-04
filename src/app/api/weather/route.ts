import { NextRequest, NextResponse } from 'next/server'
import { DmiEdrResponseSchema, type DmiEdrForecastHour } from '@/lib/schemas/dmi'
import { type ForecastHour } from '@/lib/schemas/forecast'

interface MetNorwayResponse {
  properties: {
    timeseries: Array<{
      time: string
      data: {
        instant: {
          details: {
            air_temperature: number
            wind_speed: number
            wind_from_direction?: number
            relative_humidity?: number
          }
        }
        next_1_hours?: {
          summary: {
            symbol_code: string
          }
          details?: {
            precipitation_amount?: number
          }
        }
      }
    }>
  }
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    wind_speed_10m: number
    weather_code: number
    time: string
  }
}

interface AggregatedWeatherResponse {
  yr: MetNorwayResponse | null
  yrForecast: ForecastHour[] | null
  dmi: OpenMeteoResponse | null
  dmiEdr: DmiEdrForecastHour[] | null
  errors: {
    yr: string | null
    yrForecast: string | null
    dmi: string | null
    dmiEdr: string | null
  }
}

async function fetchMetNorway(latitude: number, longitude: number): Promise<MetNorwayResponse | null> {
  try {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DanishWeatherApp/1.0 (https://github.com/yourusername/danishweather)',
      },
      cache: 'no-cache',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('MET Norway API error:', error)
    return null
  }
}

async function fetchOpenMeteo(latitude: number, longitude: number): Promise<OpenMeteoResponse | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', latitude.toString())
    url.searchParams.set('longitude', longitude.toString())
    url.searchParams.set('current', 'temperature_2m,wind_speed_10m,weather_code')

    const response = await fetch(url.toString(), {
      cache: 'no-cache',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Open-Meteo API error:', error)
    return null
  }
}

/**
 * Extract a 24-hour hourly forecast from a MET Norway locationforecast/2.0 response.
 * Uses next_1_hours precipitation when available; falls back to 0.
 * Returns entries aligned to whole hours, up to 24 steps.
 */
function extractYrForecast(raw: MetNorwayResponse): ForecastHour[] {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  return raw.properties.timeseries
    .filter((entry) => {
      const t = new Date(entry.time)
      return t >= now && t <= cutoff && entry.data.next_1_hours !== undefined
    })
    .slice(0, 25)
    .map((entry) => {
      const d = entry.data.instant.details
      const precip = entry.data.next_1_hours?.details?.precipitation_amount ?? 0
      return {
        time: entry.time,
        temperature: Math.round(d.air_temperature * 10) / 10,
        windSpeed: Math.round(d.wind_speed * 10) / 10,
        windDirection: Math.round(d.wind_from_direction ?? 0),
        humidity: Math.round(d.relative_humidity ?? 0),
        precipitation: Math.round(precip * 10) / 10,
      }
    })
}

/** Build an ISO-8601 datetime interval for the next 24 hours (UTC). */
function buildDatetimeInterval(): string {
  const now = new Date()
  // Round down to the current hour so the interval aligns with EDR steps
  now.setMinutes(0, 0, 0)
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return `${now.toISOString().replace('.000Z', 'Z')}/${end.toISOString().replace('.000Z', 'Z')}`
}

/**
 * Fetch 24-hour hourly forecast from DMI EDR API.
 * Collection: harmonie_dini_sf — HARMONIE model over Denmark, 1h resolution.
 * Temperature is in Kelvin in the raw response; converted to °C here.
 */
async function fetchDmiEdr(
  latitude: number,
  longitude: number,
): Promise<DmiEdrForecastHour[]> {
  const url = new URL(
    'https://dmigw.govcloud.dk/v1/forecastedr/collections/harmonie_dini_sf/position',
  )
  url.searchParams.set('coords', `POINT(${longitude} ${latitude})`)
  url.searchParams.set(
    'parameter-name',
    'temperature-2m,wind-speed,wind-dir,relative-humidity-2m,total-precipitation',
  )
  url.searchParams.set('f', 'GeoJSON')
  url.searchParams.set('datetime', buildDatetimeInterval())

  const response = await fetch(url.toString(), { cache: 'no-cache' })

  if (!response.ok) {
    throw new Error(`DMI EDR HTTP ${response.status}: ${response.statusText}`)
  }

  const raw: unknown = await response.json()
  const parsed = DmiEdrResponseSchema.parse(raw)

  return parsed.features.map((feature) => {
    const p = feature.properties
    return {
      time: p.step,
      temperature: Math.round((p['temperature-2m'] - 273.15) * 10) / 10,
      windSpeed: Math.round(p['wind-speed'] * 10) / 10,
      windDirection: Math.round(p['wind-dir']),
      humidity: Math.round(p['relative-humidity-2m']),
      precipitation: Math.round((p['total-precipitation'] ?? 0) * 10) / 10,
    }
  })
}

export async function GET(request: NextRequest): Promise<NextResponse<AggregatedWeatherResponse>> {
  const searchParams = request.nextUrl.searchParams
  const latitude = parseFloat(searchParams.get('latitude') ?? '0')
  const longitude = parseFloat(searchParams.get('longitude') ?? '0')

  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      {
        yr: null,
        yrForecast: null,
        dmi: null,
        dmiEdr: null,
        errors: {
          yr: 'Invalid latitude or longitude',
          yrForecast: 'Invalid latitude or longitude',
          dmi: 'Invalid latitude or longitude',
          dmiEdr: 'Invalid latitude or longitude',
        },
      },
      { status: 400 },
    )
  }

  // Fetch all upstream sources in parallel
  const [yrResult, dmiResult, dmiEdrResult] = await Promise.allSettled([
    fetchMetNorway(latitude, longitude),
    fetchOpenMeteo(latitude, longitude),
    fetchDmiEdr(latitude, longitude),
  ])

  const yr = yrResult.status === 'fulfilled' ? yrResult.value : null
  const dmi = dmiResult.status === 'fulfilled' ? dmiResult.value : null
  const dmiEdr = dmiEdrResult.status === 'fulfilled' ? dmiEdrResult.value : null

  // Derive YR 24h forecast from the already-fetched MET Norway response
  let yrForecast: ForecastHour[] | null = null
  let yrForecastError: string | null = null
  if (yr) {
    try {
      yrForecast = extractYrForecast(yr)
    } catch (err) {
      yrForecastError = err instanceof Error ? err.message : String(err)
    }
  } else {
    yrForecastError = yrResult.status === 'rejected' ? String(yrResult.reason) : 'No YR data'
  }

  const response: AggregatedWeatherResponse = {
    yr,
    yrForecast,
    dmi,
    dmiEdr,
    errors: {
      yr: yrResult.status === 'rejected' ? String(yrResult.reason) : null,
      yrForecast: yrForecastError,
      dmi: dmiResult.status === 'rejected' ? String(dmiResult.reason) : null,
      dmiEdr: dmiEdrResult.status === 'rejected' ? String(dmiEdrResult.reason) : null,
    },
  }

  // Fail only if ALL sources failed
  if (!yr && !dmi && !dmiEdr) {
    return NextResponse.json(response, { status: 503 })
  }

  return NextResponse.json(response)
}
