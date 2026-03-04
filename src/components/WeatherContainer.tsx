'use client'

import { useState, useEffect } from 'react'
import { fetchWeatherFromBothSources, WeatherComparison } from '@/lib/api'
import { fetchDmiEdrForecast } from '@/lib/api/dmi'
import { fetchYrForecast } from '@/lib/api/yr'
import { ForecastHour } from '@/lib/schemas/forecast'
import { YrWeatherDisplay } from './YrWeatherDisplay'
import { DmiWeatherDisplay } from './DmiWeatherDisplay'
import { ForecastComparisonDisplay } from './ForecastComparisonDisplay'

interface WeatherContainerProps {
  latitude?: number
  longitude?: number
}

export function WeatherContainer({
  latitude = 55.6761,
  longitude = 12.5683,
}: WeatherContainerProps) {
  const [data, setData]                       = useState<WeatherComparison | null>(null)
  const [dmiForecast, setDmiForecast]         = useState<ForecastHour[]>([])
  const [yrForecast, setYrForecast]           = useState<ForecastHour[]>([])
  const [isLoading, setIsLoading]             = useState(true)
  const [isForecastLoading, setIsForecastLoading] = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const [forecastError, setForecastError]     = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setIsForecastLoading(true)
        setError(null)
        setForecastError(null)

        // All three fetch calls share one underlying /api/weather request via proxy.ts
        const [currentResult, dmiForecastResult, yrForecastResult] =
          await Promise.allSettled([
            fetchWeatherFromBothSources(latitude, longitude),
            fetchDmiEdrForecast(latitude, longitude),
            fetchYrForecast(latitude, longitude),
          ])

        if (currentResult.status === 'fulfilled') {
          setData(currentResult.value)
        } else {
          setError(
            currentResult.reason instanceof Error
              ? currentResult.reason.message
              : 'Failed to fetch weather data',
          )
        }

        if (dmiForecastResult.status === 'fulfilled') {
          setDmiForecast(dmiForecastResult.value)
        }
        if (yrForecastResult.status === 'fulfilled') {
          setYrForecast(yrForecastResult.value)
        }

        // Surface a combined forecast error only if both failed
        if (
          dmiForecastResult.status === 'rejected' &&
          yrForecastResult.status === 'rejected'
        ) {
          setForecastError('Both DMI and YR forecast data are unavailable.')
        }
      } finally {
        setIsLoading(false)
        setIsForecastLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [latitude, longitude])

  return (
    <div className="w-full space-y-6">
      {error && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-semibold">Warning:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Current conditions — side by side */}
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
                <div className="h-6 w-24 bg-gray-300 rounded" />
                <div className="h-6 w-24 bg-gray-300 rounded" />
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
                <div className="h-6 w-24 bg-gray-300 rounded" />
                <div className="h-6 w-24 bg-gray-300 rounded" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 24h forecast comparison — full width */}
      {forecastError && !isForecastLoading && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          <p className="font-semibold">Forecast unavailable:</p>
          <p className="text-sm">{forecastError}</p>
        </div>
      )}
      <ForecastComparisonDisplay
        dmi={dmiForecast}
        yr={yrForecast}
        isLoading={isForecastLoading}
      />
    </div>
  )
}
