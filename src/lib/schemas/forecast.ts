import { z } from 'zod'

/**
 * Shared domain model for a single forecast hour.
 * Used by both DMI EDR and YR.no forecast pipelines so the
 * comparison display can treat them uniformly.
 */
export const ForecastHourSchema = z.object({
  time: z.string(),         // ISO 8601 UTC
  temperature: z.number(),  // °C, rounded to 1 decimal
  windSpeed: z.number(),    // m/s, rounded to 1 decimal
  windDirection: z.number(),// degrees true north, rounded to integer
  humidity: z.number(),     // %, rounded to integer
  precipitation: z.number(),// mm, rounded to 1 decimal
})

export type ForecastHour = z.infer<typeof ForecastHourSchema>
