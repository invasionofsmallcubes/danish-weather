'use client'

import { useState, useEffect } from 'react'
import { fetchWeatherFromBothSources, WeatherComparison } from '@/lib/api'
import { YrWeatherDisplay } from './YrWeatherDisplay'
import { DmiWeatherDisplay } from './DmiWeatherDisplay'

interface WeatherContainerProps {
  latitude?: number
  longitude?: number
}

export function WeatherContainer({
  latitude = 55.6761,
  longitude = 12.5683,
}: WeatherContainerProps) {
  const [data, setData] = useState<WeatherComparison | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchWeatherFromBothSources(latitude, longitude)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    // Refresh data every 10 minutes
    const interval = setInterval(fetchData, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [latitude, longitude])

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-semibold">Warning:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {data?.yr ? (
          <YrWeatherDisplay data={data.yr} isLoading={isLoading} />
        ) : (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-4 text-2xl font-bold text-blue-900">YR.no Weather</h2>
            {data?.errors.yr && (
              <p className="text-red-600 text-sm">{data.errors.yr}</p>
            )}
            {isLoading && (
              <div className="animate-pulse space-y-2">
                <div className="h-6 w-24 bg-gray-300 rounded"></div>
                <div className="h-6 w-24 bg-gray-300 rounded"></div>
              </div>
            )}
          </div>
        )}

        {data?.dmi ? (
          <DmiWeatherDisplay data={data.dmi} isLoading={isLoading} />
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-4 text-2xl font-bold text-red-900">DMI Weather</h2>
            {data?.errors.dmi && (
              <p className="text-red-600 text-sm">{data.errors.dmi}</p>
            )}
            {isLoading && (
              <div className="animate-pulse space-y-2">
                <div className="h-6 w-24 bg-gray-300 rounded"></div>
                <div className="h-6 w-24 bg-gray-300 rounded"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
