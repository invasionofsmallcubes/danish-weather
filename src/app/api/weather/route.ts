import { NextRequest, NextResponse } from 'next/server'

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
  dmi: OpenMeteoResponse | null
  errors: {
    yr: string | null
    dmi: string | null
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

export async function GET(request: NextRequest): Promise<NextResponse<AggregatedWeatherResponse>> {
  const searchParams = request.nextUrl.searchParams
  const latitude = parseFloat(searchParams.get('latitude') ?? '0')
  const longitude = parseFloat(searchParams.get('longitude') ?? '0')

  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      {
        yr: null,
        dmi: null,
        errors: {
          yr: 'Invalid latitude or longitude',
          dmi: 'Invalid latitude or longitude',
        },
      },
      { status: 400 },
    )
  }

  // Fetch both APIs in parallel
  const [yrResult, dmiResult] = await Promise.allSettled([
    fetchMetNorway(latitude, longitude),
    fetchOpenMeteo(latitude, longitude),
  ])

  const yr = yrResult.status === 'fulfilled' ? yrResult.value : null
  const dmi = dmiResult.status === 'fulfilled' ? dmiResult.value : null

  const response: AggregatedWeatherResponse = {
    yr,
    dmi,
    errors: {
      yr: yrResult.status === 'rejected' ? String(yrResult.reason) : null,
      dmi: dmiResult.status === 'rejected' ? String(dmiResult.reason) : null,
    },
  }

  // If both failed, return 503
  if (!yr && !dmi) {
    return NextResponse.json(response, { status: 503 })
  }

  return NextResponse.json(response)
}
