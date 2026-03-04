import { fetchYrCurrentConditions } from './yr'
import { fetchDmiCurrentConditions } from './dmi'

/** Per-field difference: DMI value minus YR value, rounded to 1 decimal. */
export interface WeatherDiff {
  temperature: number | null   // °C
  windSpeed: number | null     // m/s
  windDirection: number | null // degrees
  humidity: number | null      // %
}

export interface WeatherComparison {
  yr: Awaited<ReturnType<typeof fetchYrCurrentConditions>> | null
  dmi: Awaited<ReturnType<typeof fetchDmiCurrentConditions>> | null
  diff: WeatherDiff
  errors: {
    yr: string | null
    dmi: string | null
  }
}

/** Compute DMI − YR for each shared field. Returns null when either side is missing. */
function computeDiff(
  yr: Awaited<ReturnType<typeof fetchYrCurrentConditions>> | null,
  dmi: Awaited<ReturnType<typeof fetchDmiCurrentConditions>> | null,
): WeatherDiff {
  const round1 = (n: number) => Math.round(n * 10) / 10

  return {
    temperature:
      yr && dmi
        ? round1(dmi.temperature.value - yr.temperature.value)
        : null,
    windSpeed:
      yr && dmi
        ? round1(dmi.windSpeed.value - yr.windSpeed.value)
        : null,
    windDirection:
      yr?.windDirection && dmi?.windDirection
        ? round1(dmi.windDirection.value - yr.windDirection.value)
        : null,
    humidity:
      yr?.relativeHumidity !== undefined && dmi?.humidity !== undefined
        ? round1(dmi.humidity - yr.relativeHumidity)
        : null,
  }
}

/**
 * Fetch weather data from both sources in parallel
 */
export async function fetchWeatherFromBothSources(
  latitude: number,
  longitude: number,
): Promise<WeatherComparison> {
  const [yrResult, dmiResult] = await Promise.allSettled([
    fetchYrCurrentConditions(latitude, longitude),
    fetchDmiCurrentConditions(latitude, longitude),
  ])

  const yr = yrResult.status === 'fulfilled' ? yrResult.value : null
  const dmi = dmiResult.status === 'fulfilled' ? dmiResult.value : null

  return {
    yr,
    dmi,
    diff: computeDiff(yr, dmi),
    errors: {
      yr: yrResult.status === 'rejected' ? String(yrResult.reason) : null,
      dmi: dmiResult.status === 'rejected' ? String(dmiResult.reason) : null,
    },
  }
}
