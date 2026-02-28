import { z } from 'zod'

// DMI Schemas - Open-Meteo API
// Real API response structure from api.open-meteo.com

export const OpenMeteoCurrentSchema = z.object({
  temperature_2m: z.number(),
  wind_speed_10m: z.number(),
  weather_code: z.number(),
  relative_humidity: z.number().optional(),
  time: z.string(),
})

export const DmiCurrentConditionsSchema = z.object({
  temperature: z.object({
    value: z.number(),
    unit: z.literal('°C'),
  }),
  windSpeed: z.object({
    value: z.number(),
    unit: z.literal('m/s'),
  }),
  windDirection: z.object({
    value: z.number(),
    unit: z.literal('degrees'),
  }).optional(),
  humidity: z.number().optional(),
  weatherDescription: z.object({
    code: z.number(),
    description: z.string(),
  }),
  timestamp: z.string(),
})

export const DmiWeatherDataSchema = z.object({
  location: z.object({
    id: z.string(),
    name: z.string(),
    country: z.literal('DK'),
    latitude: z.number(),
    longitude: z.number(),
  }),
  current: DmiCurrentConditionsSchema,
  forecast: z.array(z.object({
    time: z.string(),
    temperature: z.object({
      value: z.number(),
      unit: z.literal('°C'),
    }),
    precipitation: z.number().optional(),
    weatherDescription: z.object({
      code: z.number(),
      description: z.string(),
    }),
    windSpeed: z.object({
      value: z.number(),
      unit: z.literal('m/s'),
    }),
  })),
  lastUpdated: z.string(),
})

export type DmiWeatherData = z.infer<typeof DmiWeatherDataSchema>
export type DmiCurrentConditions = z.infer<typeof DmiCurrentConditionsSchema>
export type OpenMeteoCurrent = z.infer<typeof OpenMeteoCurrentSchema>
