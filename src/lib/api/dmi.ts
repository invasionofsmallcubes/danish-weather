import { DmiWeatherDataSchema, DmiCurrentConditionsSchema } from '@/lib/schemas/dmi'
import { getWeatherDescription } from '@/lib/utils/weatherCodes'
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
    const url = `/api/weather?latitude=${latitude}&longitude=${longitude}`
    const response = await fetchWithRetry(url, { timeout: 5000, retries: 2 })
    const data = await response.json()

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
