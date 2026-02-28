import { z } from 'zod'

// YR.no API Schemas - MET Norway API (api.met.no)
// Real API response structure from locationforecast/2.0/compact

export const YrInstantDetailsSchema = z.object({
  air_temperature: z.number(),
  wind_speed: z.number(),
  wind_from_direction: z.number().optional(),
  relative_humidity: z.number().optional(),
})

export const YrSymbolCodeSchema = z.object({
  code: z.string(),
  description: z.string(),
})

export const YrCurrentConditionsSchema = z.object({
  temperature: z.object({
    value: z.number(),
    unit: z.literal('celsius'),
  }),
  windSpeed: z.object({
    value: z.number(),
    unit: z.literal('m/s'),
  }),
  windDirection: z.object({
    value: z.number(),
    unit: z.literal('degrees'),
  }).optional(),
  relativeHumidity: z.number().optional(),
  weatherIcon: z.object({
    code: z.string(),
    description: z.string(),
  }),
  timestamp: z.string(),
})

export const YrWeatherDataSchema = z.object({
  location: z.object({
    id: z.string(),
    name: z.string(),
  }),
  current: YrCurrentConditionsSchema,
  forecast: z.array(z.object({
    time: z.string(),
    temperature: z.object({
      value: z.number(),
      unit: z.literal('celsius'),
    }),
    precipitation: z.number().optional(),
    weatherIcon: z.object({
      code: z.string(),
      description: z.string(),
    }),
    windSpeed: z.object({
      value: z.number(),
      unit: z.literal('m/s'),
    }),
  })),
  lastUpdated: z.string(),
})

export type YrWeatherData = z.infer<typeof YrWeatherDataSchema>
export type YrCurrentConditions = z.infer<typeof YrCurrentConditionsSchema>
