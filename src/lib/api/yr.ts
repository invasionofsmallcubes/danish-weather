import { YrWeatherDataSchema, YrCurrentConditionsSchema } from '@/lib/schemas/yr'
import { z } from 'zod'

interface FetchOptions {
  timeout?: number
  retries?: number
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 5000,
  retries: 2,
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const timeout = options.timeout ?? DEFAULT_OPTIONS.timeout
  const retries = options.retries ?? DEFAULT_OPTIONS.retries

  let lastError: Error | null = null

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries')
}

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
        }
      }
    }>
  }
}

/**
 * Map MET Norway symbol codes to descriptions
 */
function getSymbolDescription(code: string): string {
  const descriptions: Record<string, string> = {
    clearsky_day: 'Clear sky',
    clearsky_night: 'Clear sky',
    clearsky_polartwilight: 'Clear sky',
    cloudy: 'Cloudy',
    partlycloudy_day: 'Partly cloudy',
    partlycloudy_night: 'Partly cloudy',
    partlycloudy_polartwilight: 'Partly cloudy',
    lightrain: 'Light rain',
    lightsnow: 'Light snow',
    rain: 'Rain',
    snow: 'Snow',
    rainandthunder: 'Rain and thunder',
    snowandthunder: 'Snow and thunder',
  }
  return descriptions[code] ?? 'Unknown'
}

/**
 * Fetch weather data from backend API proxy
 * Fetches MET Norway data via Next.js API route
 */
export async function fetchYrWeatherData(latitude: number, longitude: number) {
  try {
    const url = `/api/weather?latitude=${latitude}&longitude=${longitude}`
    const response = await fetchWithRetry(url, { timeout: 5000, retries: 2 })
    const data = await response.json()

    // Extract MET Norway data from proxy response
    const metData = data.yr as MetNorwayResponse | null

    if (!metData?.properties?.timeseries?.[0]) {
      throw new Error('Invalid MET Norway response structure')
    }

    const current = metData.properties.timeseries[0]
    const instant = current.data.instant.details
    const symbolCode = current.data.next_1_hours?.summary?.symbol_code ?? 'unknown'

    // Validate and transform response
    const validated = YrWeatherDataSchema.parse({
      location: {
        id: `yr-${latitude}-${longitude}`,
        name: 'Location',
      },
      current: {
        temperature: { value: instant.air_temperature, unit: 'celsius' as const },
        windSpeed: { value: instant.wind_speed, unit: 'm/s' as const },
        windDirection: instant.wind_from_direction
          ? { value: instant.wind_from_direction, unit: 'degrees' as const }
          : undefined,
        relativeHumidity: instant.relative_humidity,
        weatherIcon: {
          code: symbolCode,
          description: getSymbolDescription(symbolCode),
        },
        timestamp: current.time,
      },
      forecast: [],
      lastUpdated: new Date().toISOString(),
    })

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid YR.no response: ${error.message}`)
    }
    throw error
  }
}

/**
 * Fetch current conditions from YR.no
 */
export async function fetchYrCurrentConditions(latitude: number, longitude: number) {
  try {
    const data = await fetchYrWeatherData(latitude, longitude)
    return YrCurrentConditionsSchema.parse(data.current)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid YR.no conditions: ${error.message}`)
    }
    throw error
  }
}
