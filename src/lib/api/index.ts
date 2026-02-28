import { fetchYrCurrentConditions } from './yr'
import { fetchDmiCurrentConditions } from './dmi'

export interface WeatherComparison {
  yr: Awaited<ReturnType<typeof fetchYrCurrentConditions>> | null
  dmi: Awaited<ReturnType<typeof fetchDmiCurrentConditions>> | null
  errors: {
    yr: string | null
    dmi: string | null
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

  return {
    yr: yrResult.status === 'fulfilled' ? yrResult.value : null,
    dmi: dmiResult.status === 'fulfilled' ? dmiResult.value : null,
    errors: {
      yr: yrResult.status === 'rejected' ? String(yrResult.reason) : null,
      dmi: dmiResult.status === 'rejected' ? String(dmiResult.reason) : null,
    },
  }
}
