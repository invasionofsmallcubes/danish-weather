'use client'

import { DmiCurrentConditions } from '@/lib/schemas/dmi'

interface DmiWeatherDisplayProps {
  data: DmiCurrentConditions
  isLoading?: boolean
}

export function DmiWeatherDisplay({ data, isLoading = false }: DmiWeatherDisplayProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg bg-gray-200 p-6">
        <div className="h-8 w-32 bg-gray-300 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-6 w-24 bg-gray-300 rounded"></div>
          <div className="h-6 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-red-900">DMI Weather</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Temperature:</span>
          <span className="text-2xl font-semibold text-red-600">
            {data.temperature.value}{data.temperature.unit}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Wind Speed:</span>
          <span className="text-lg font-semibold text-red-600">
            {data.windSpeed.value} {data.windSpeed.unit}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Conditions:</span>
          <span className="text-lg font-semibold text-red-600">
            {data.weatherDescription.description}
          </span>
        </div>
        {data.humidity !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Humidity:</span>
            <span className="text-lg font-semibold text-red-600">
              {data.humidity}%
            </span>
          </div>
        )}
        {data.windDirection && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Wind Direction:</span>
            <span className="text-lg font-semibold text-red-600">
              {data.windDirection.value}°
            </span>
          </div>
        )}
        <div className="pt-2 border-t border-red-200">
          <span className="text-sm text-gray-600">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}
