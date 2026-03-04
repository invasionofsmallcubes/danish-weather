import { DmiWeatherDataSchema, DmiCurrentConditionsSchema, DmiEdrForecastHourSchema, type DmiEdrForecastHour } from '@/lib/schemas/dmi'
import { getWeatherDescription } from '@/lib/utils/weatherCodes'
import { getProxyData } from './proxy'
import { z } from 'zod'

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    wind_speed_10m: number
    weather_code: number
    relative_humidity?: number
    time: string
  }
}

/**
 * Fetch weather data from backend API proxy
 * Fetches Open-Meteo data via Next.js API route
 */
export async function fetchDmiWeatherData(latitude: number, longitude: number) {
  try {
    const data = await getProxyData(latitude, longitude)

    // Extract Open-Meteo data from proxy response
    const openMeteoData = data.dmi as OpenMeteoResponse | null

    if (!openMeteoData?.current) {
      throw new Error('Invalid Open-Meteo response structure')
    }

    const current = openMeteoData.current
    const description = getWeatherDescription(current.weather_code)
    // Open-Meteo returns wind speed in km/h, convert to m/s
    const windSpeedMps = current.wind_speed_10m / 3.6

    // Validate and transform response
    const validated = DmiWeatherDataSchema.parse({
      location: {
        id: `dmi-${latitude}-${longitude}`,
        name: 'Location',
        country: 'DK' as const,
        latitude,
        longitude,
      },
      current: {
        temperature: { value: current.temperature_2m, unit: '°C' as const },
        windSpeed: { value: windSpeedMps, unit: 'm/s' as const },
        humidity: current.relative_humidity,
        weatherDescription: {
          code: current.weather_code,
          description,
        },
        timestamp: current.time,
      },
      forecast: [],
      lastUpdated: new Date().toISOString(),
    })

    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid DMI response: ${error.message}`)
    }
    throw error
  }
}

/**
 * Fetch current conditions from DMI (via Open-Meteo)
 */
export async function fetchDmiCurrentConditions(latitude: number, longitude: number) {
  try {
    const data = await fetchDmiWeatherData(latitude, longitude)
    return DmiCurrentConditionsSchema.parse(data.current)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid DMI conditions: ${error.message}`)
    }
    throw error
  }
}

/**
 * Fetch 24-hour hourly forecast from DMI EDR API (via Next.js proxy).
 * Returns up to 25 entries (current hour + next 24 hours).
 */
export async function fetchDmiEdrForecast(
  latitude: number,
  longitude: number,
): Promise<DmiEdrForecastHour[]> {
  const data = await getProxyData(latitude, longitude)

  const raw = data.dmiEdr as unknown

  if (!Array.isArray(raw)) {
    throw new Error('Invalid DMI EDR response: dmiEdr is not an array')
  }

  try {
    return z.array(DmiEdrForecastHourSchema).parse(raw)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid DMI EDR forecast: ${error.message}`)
    }
    throw error
  }
}
