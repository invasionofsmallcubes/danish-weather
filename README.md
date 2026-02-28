# Danish Weather App

A modern, type-safe weather application that fetches and displays real-time weather data from **YR.no** (MET Norway API) and **DMI** (Open-Meteo API). Built with Next.js, TypeScript, and Tailwind CSS with server-side proxying to eliminate CORS issues.

## Features

- ⛅ Real-time weather data from two independent, free APIs
- 🎯 Type-safe with TypeScript and Zod schema validation
- 📱 Responsive design with Tailwind CSS
- ⚡ Fast, server-side API proxying via Next.js API routes
- 🔄 Automatic data refresh every 10 minutes
- 🛡️ Graceful error handling with user-friendly fallbacks
- 🎨 Clean, modern UI with loading and error states

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Validation**: Zod (runtime schema validation)
- **Styling**: Tailwind CSS 3
- **HTTP Client**: Native Fetch API with exponential backoff retry logic
- **CI/CD**: GitHub Actions

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── weather/
│   │       └── route.ts            # Backend API proxy (MET Norway + Open-Meteo)
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home page
│   └── globals.css                 # Global styles
├── components/
│   ├── WeatherContainer.tsx        # Main weather fetching component
│   ├── YrWeatherDisplay.tsx        # YR.no weather display
│   └── DmiWeatherDisplay.tsx       # DMI weather display
└── lib/
    ├── api/
    │   ├── index.ts                # API aggregation logic
    │   ├── yr.ts                   # YR.no/MET Norway client
    │   └── dmi.ts                  # DMI/Open-Meteo client
    ├── schemas/
    │   ├── yr.ts                   # MET Norway data schemas
    │   ├── dmi.ts                  # Open-Meteo data schemas
    │   └── weatherCodes.ts         # WMO weather code mappings
    └── utils/
        └── weatherCodes.ts         # Weather description utilities
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/danish-weather.git
   cd danish-weather
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   No API keys needed - both MET Norway and Open-Meteo are free and public APIs.

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Architecture

### Backend API Proxy

This app uses a **server-side API proxy** pattern to avoid CORS issues:

- Browser requests → Next.js API Route (`/api/weather`) → External APIs
- Server-to-server communication bypasses browser CORS restrictions
- Single API route accepts `latitude` and `longitude` query parameters
- Returns aggregated response from both data sources

### API Integrations

**YR.no / MET Norway**
- Endpoint: `https://api.met.no/weatherapi/locationforecast/2.0/compact`
- Requires User-Agent header (set server-side)
- Returns: Temperature, wind speed, weather symbol codes, detailed forecasts

**DMI / Open-Meteo**  
- Endpoint: `https://api.open-meteo.com/v1/forecast`
- No authentication required
- Returns: Current temperature, wind speed, WMO weather codes

### Data Flow

1. Client loads homepage
2. WeatherContainer mounts and calls `fetchWeatherFromBothSources(lat, lng)`
3. Client calls `/api/weather?latitude=55.6761&longitude=12.5683`
4. API route fetches from both MET Norway and Open-Meteo in parallel
5. Responses are parsed and validated with Zod
6. Data is returned to client and displayed
7. Auto-refresh every 10 minutes via `setInterval`

## Features Explained

### Type-Safe Data Handling

All API responses are validated at runtime using Zod schemas:

- `src/lib/schemas/yr.ts` - MET Norway API response structure
- `src/lib/schemas/dmi.ts` - Open-Meteo API response structure
- Invalid responses throw descriptive errors

### Error Handling

- Network errors are caught and displayed gracefully
- Failed requests retry up to 2 times with exponential backoff (1s, 2s delay)
- Per-request timeout of 5 seconds
- One API failure doesn't block the other
- Users see error messages but can still view available data

### Data Transformation

- Wind speed converted from km/h to m/s for DMI
- WMO weather codes mapped to human-readable descriptions
- Timestamps normalized to ISO 8601 format
- All data validated against schemas before display

## Customization

### Change Location

Update coordinates in `src/app/page.tsx`:

```typescript
<WeatherContainer 
  latitude={59.9139}  // Your latitude
  longitude={10.7522}  // Your longitude
/>
```

### Update Refresh Interval

Change interval in `src/components/WeatherContainer.tsx`:

```typescript
const interval = setInterval(fetchData, 5 * 60 * 1000)  // 5 minutes
```

### Styling

- Tailwind config: `tailwind.config.ts`
- Global styles: `src/app/globals.css`
- Component styles: Inline Tailwind classes in component files

## Environment Variables

Create `.env.local` (optional):

```env
# No environment variables required for public APIs
# But you can add your own configuration here
```

## License

This project is licensed under the **GNU General Public License v3.0** (GPL-3.0).

See the [LICENSE](LICENSE) file for details.

**Key requirements:**
- Any derivative works must also be open source under GPL-3.0
- You must disclose modifications
- Commercial use is allowed, but must remain open source
- Includes warranty disclaimer
