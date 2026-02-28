import { WeatherContainer } from '@/components/WeatherContainer'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Danish Weather</h1>
          <p className="text-lg text-gray-600">
            Real-time weather data from YR.no and DMI
          </p>
        </header>

        <div className="mb-8">
          <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Copenhagen Weather
            </h2>
            {/* Latitude and longitude for Copenhagen */}
            <WeatherContainer latitude={55.6761} longitude={12.5683} />
          </div>
        </div>

        <footer className="text-center text-sm text-gray-600">
          <p>
            Weather data from{' '}
            <a
              href="https://www.yr.no"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              YR.no
            </a>
            {' '}and{' '}
            <a
              href="https://www.dmi.dk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              DMI
            </a>
          </p>
          <p className="mt-2">Refresh every 10 minutes</p>
        </footer>
      </div>
    </main>
  )
}
