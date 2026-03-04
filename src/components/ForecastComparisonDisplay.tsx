'use client'

import { ForecastHour } from '@/lib/schemas/forecast'
import { degreesToCompass } from '@/lib/utils/wind'

interface ForecastComparisonDisplayProps {
  dmi: ForecastHour[]
  yr: ForecastHour[]
  isLoading?: boolean
}

function formatHour(isoTime: string): string {
  return new Date(isoTime).toLocaleTimeString('en-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Copenhagen',
  })
}

function formatDay(isoTime: string): string {
  return new Date(isoTime).toLocaleDateString('en-DK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'Europe/Copenhagen',
  })
}

/**
 * Align DMI and YR forecast entries by hour (ISO time string, truncated to the hour).
 * Returns rows where either or both sources may have data for that slot.
 */
interface AlignedRow {
  time: string           // canonical ISO time key
  dmi: ForecastHour | null
  yr: ForecastHour | null
}

function alignByHour(dmi: ForecastHour[], yr: ForecastHour[]): AlignedRow[] {
  const toHourKey = (iso: string) => iso.substring(0, 13) // "2026-03-04T10"

  const dmiMap = new Map(dmi.map((h) => [toHourKey(h.time), h]))
  const yrMap  = new Map(yr.map((h)  => [toHourKey(h.time), h]))

  const allKeys = Array.from(new Set([...dmiMap.keys(), ...yrMap.keys()])).sort()

  return allKeys.map((key) => ({
    time: (dmiMap.get(key) ?? yrMap.get(key))!.time,
    dmi:  dmiMap.get(key) ?? null,
    yr:   yrMap.get(key)  ?? null,
  }))
}

function groupByDay(rows: AlignedRow[]): Map<string, AlignedRow[]> {
  const groups = new Map<string, AlignedRow[]>()
  for (const row of rows) {
    const day = formatDay(row.time)
    const existing = groups.get(day) ?? []
    existing.push(row)
    groups.set(day, existing)
  }
  return groups
}

/** Highlight cell when the two values differ by more than the threshold. */
function diffClass(a: number | null, b: number | null, threshold: number): string {
  if (a === null || b === null) return ''
  return Math.abs(a - b) >= threshold ? 'text-amber-600 font-semibold' : ''
}

function PrecipCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-300">—</span>
  if (value === 0)    return <span className="text-gray-400">—</span>
  return <span className="text-blue-600 font-medium">{value} mm</span>
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="h-7 w-64 bg-gray-200 rounded mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 w-full bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}

export function ForecastComparisonDisplay({
  dmi,
  yr,
  isLoading = false,
}: ForecastComparisonDisplayProps) {
  if (isLoading) return <LoadingSkeleton />

  const isEmpty = dmi.length === 0 && yr.length === 0

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <h2 className="mb-2 text-2xl font-bold text-gray-800">24h Forecast Comparison</h2>
        <p className="text-gray-500 text-sm">No forecast data available.</p>
      </div>
    )
  }

  const rows    = alignByHour(dmi, yr)
  const grouped = groupByDay(rows)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <h2 className="mb-1 text-2xl font-bold text-gray-800">24h Forecast Comparison</h2>
      <p className="mb-4 text-xs text-gray-400">
        DMI · HARMONIE model via EDR API&nbsp;&nbsp;|&nbsp;&nbsp;YR · MET Norway locationforecast 2.0
        <br />
        <span className="text-amber-600">Amber</span> values differ by more than the threshold between sources.
      </p>

      <div className="space-y-8 overflow-x-auto">
        {Array.from(grouped.entries()).map(([day, dayRows]) => (
          <div key={day}>
            <h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {day}
            </h3>

            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="text-left border-b-2 border-gray-200">
                  {/* Time column */}
                  <th className="pb-2 pr-3 font-medium text-gray-500 w-16">Time</th>

                  {/* Temperature */}
                  <th className="pb-2 pr-1 font-medium text-red-600 text-center" colSpan={2}>
                    Temp (°C)
                  </th>
                  <th className="pb-2 pr-3 w-2" />

                  {/* Wind speed */}
                  <th className="pb-2 pr-1 font-medium text-gray-600 text-center" colSpan={2}>
                    Wind (m/s)
                  </th>
                  <th className="pb-2 pr-3 w-2" />

                  {/* Wind direction */}
                  <th className="pb-2 pr-1 font-medium text-gray-600 text-center" colSpan={2}>
                    Dir
                  </th>
                  <th className="pb-2 pr-3 w-2" />

                  {/* Precipitation */}
                  <th className="pb-2 pr-1 font-medium text-blue-600 text-center" colSpan={2}>
                    Rain (mm)
                  </th>
                  <th className="pb-2 pr-3 w-2" />

                  {/* Humidity */}
                  <th className="pb-2 font-medium text-gray-600 text-center" colSpan={2}>
                    Humidity (%)
                  </th>
                </tr>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-1 pr-3" />
                  <th className="pb-1 pr-1 font-normal text-red-400">DMI</th>
                  <th className="pb-1 pr-1 font-normal text-blue-400">YR</th>
                  <th className="pb-1 pr-3" />
                  <th className="pb-1 pr-1 font-normal text-red-400">DMI</th>
                  <th className="pb-1 pr-1 font-normal text-blue-400">YR</th>
                  <th className="pb-1 pr-3" />
                  <th className="pb-1 pr-1 font-normal text-red-400">DMI</th>
                  <th className="pb-1 pr-1 font-normal text-blue-400">YR</th>
                  <th className="pb-1 pr-3" />
                  <th className="pb-1 pr-1 font-normal text-red-400">DMI</th>
                  <th className="pb-1 pr-1 font-normal text-blue-400">YR</th>
                  <th className="pb-1 pr-3" />
                  <th className="pb-1 pr-1 font-normal text-red-400">DMI</th>
                  <th className="pb-1 font-normal text-blue-400">YR</th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map((row) => {
                  const d = row.dmi
                  const y = row.yr
                  return (
                    <tr
                      key={row.time}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      {/* Time */}
                      <td className="py-1.5 pr-3 font-mono text-gray-500 text-xs">
                        {formatHour(row.time)}
                      </td>

                      {/* Temperature */}
                      <td className={`py-1.5 pr-1 ${diffClass(d?.temperature ?? null, y?.temperature ?? null, 2)}`}>
                        {d ? `${d.temperature}°` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`py-1.5 pr-1 ${diffClass(d?.temperature ?? null, y?.temperature ?? null, 2)}`}>
                        {y ? `${y.temperature}°` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="pr-3" />

                      {/* Wind speed */}
                      <td className={`py-1.5 pr-1 ${diffClass(d?.windSpeed ?? null, y?.windSpeed ?? null, 2)}`}>
                        {d ? d.windSpeed : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`py-1.5 pr-1 ${diffClass(d?.windSpeed ?? null, y?.windSpeed ?? null, 2)}`}>
                        {y ? y.windSpeed : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="pr-3" />

                      {/* Wind direction */}
                      <td className="py-1.5 pr-1 text-gray-600">
                        {d ? degreesToCompass(d.windDirection) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-1.5 pr-1 text-gray-600">
                        {y ? degreesToCompass(y.windDirection) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="pr-3" />

                      {/* Precipitation */}
                      <td className="py-1.5 pr-1">
                        <PrecipCell value={d?.precipitation ?? null} />
                      </td>
                      <td className="py-1.5 pr-1">
                        <PrecipCell value={y?.precipitation ?? null} />
                      </td>
                      <td className="pr-3" />

                      {/* Humidity */}
                      <td className={`py-1.5 pr-1 ${diffClass(d?.humidity ?? null, y?.humidity ?? null, 10)}`}>
                        {d ? `${d.humidity}%` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`py-1.5 ${diffClass(d?.humidity ?? null, y?.humidity ?? null, 10)}`}>
                        {y ? `${y.humidity}%` : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
