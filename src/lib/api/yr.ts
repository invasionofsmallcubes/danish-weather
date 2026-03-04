import { YrWeatherDataSchema, YrCurrentConditionsSchema, YrForecastHourSchema, type YrForecastHour } from '@/lib/schemas/yr'
import { getProxyData } from './proxy'
import { z } from 'zod'

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
    const data = await getProxyData(latitude, longitude)

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

/**
 * Fetch 24-hour hourly forecast from YR.no (via Next.js proxy).
 * The route extracts this server-side from the MET Norway timeseries.
 */
export async function fetchYrForecast(
  latitude: number,
  longitude: number,
): Promise<YrForecastHour[]> {
  const data = await getProxyData(latitude, longitude)

  const raw = data.yrForecast as unknown

  if (!Array.isArray(raw)) {
    throw new Error('Invalid YR forecast response: yrForecast is not an array')
  }

  try {
    return z.array(YrForecastHourSchema).parse(raw)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid YR forecast data: ${error.message}`)
    }
    throw error
  }
}
