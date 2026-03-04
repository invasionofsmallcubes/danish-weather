# Spec: DMI EDR API — 24h Forecast

## Goal
Replace the Open-Meteo "DMI" data source with the real DMI EDR API
(`https://dmigw.govcloud.dk/v1/forecastedr`) and display a 24-hour
hourly forecast panel in the UI.

## EDR Endpoint
- Collection: `harmonie_dini_sf` (Denmark + immediate surroundings, 1h steps)
- Query type: `position`
- URL pattern:
  ```
  GET https://dmigw.govcloud.dk/v1/forecastedr/collections/harmonie_dini_sf/position
    ?coords=POINT({lon} {lat})
    &parameter-name=temperature-2m,wind-speed,wind-dir,relative-humidity-2m,total-precipitation
    &f=GeoJSON
    &datetime={now}/{now+24h}   (ISO 8601 interval, UTC)
  ```
- No API key required (public endpoint)
- Response: GeoJSON FeatureCollection, one Feature per hour
- Temperature is in **Kelvin** → convert to °C (`K - 273.15`)

## Response shape (per feature)
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [lon, lat] },
  "properties": {
    "step": "2026-03-04T10:00:00.000Z",
    "temperature-2m": 278.77,          // Kelvin
    "wind-speed": 4.41,                // m/s
    "wind-dir": 294.43,                // degrees true north
    "relative-humidity-2m": 82.36,     // %
    "total-precipitation": 0.0         // mm
  }
}
```

## Architecture changes

### 1. `src/lib/schemas/dmi.ts`
- Add `DmiEdrFeatureSchema` — validates one GeoJSON feature
- Add `DmiEdrResponseSchema` — validates the full FeatureCollection
- Add `DmiEdrForecastHourSchema` — domain model per hour (already in °C)
- Keep existing schemas for backward compat (route still needs `DmiWeatherDataSchema`)

### 2. `src/app/api/weather/route.ts`
- Add `fetchDmiEdr(lat, lon)` — calls EDR directly (server-side, no CORS issue)
- Returns typed `DmiEdrHourly[]` for the forecast
- Replace `fetchOpenMeteo` with `fetchDmiEdr` for the DMI slot
- Keep `fetchMetNorway` (yr source) unchanged
- Update `AggregatedWeatherResponse` to carry `dmiEdr` forecast array

### 3. `src/lib/api/dmi.ts`
- Add `fetchDmiEdrForecast(lat, lon)` — calls `/api/weather`, reads `dmiEdr`
- Returns `DmiEdrForecastHour[]` (24 entries)
- Keep `fetchDmiCurrentConditions` working (derives current from EDR hour[0])

### 4. `src/components/DmiForecastDisplay.tsx` (new)
- Renders the 24h hourly table/grid
- Columns: time, temp (°C), wind speed (m/s), wind dir (compass), precip (mm), humidity (%)
- Loading skeleton & error state

### 5. `src/components/WeatherContainer.tsx`
- Fetch EDR forecast in parallel with existing sources
- Wire `DmiForecastDisplay` below the existing cards

### 6. Tests
- `src/lib/schemas/__tests__/dmi-edr.test.ts` — Zod schema unit tests
- `src/lib/api/__tests__/dmi-edr.test.ts` — client unit tests (mock fetch)
- `src/components/__tests__/DmiForecastDisplay.test.tsx` — render tests
- `src/lib/api/__tests__/route.integration.test.ts` — add EDR integration test

## Edge cases
- EDR returns 0 features → show "no forecast data" message
- Kelvin conversion must never produce NaN
- `datetime` param must be computed at request time (server-side) to stay current
- Temperature could be fractional → round to 1 decimal
- `total-precipitation` might be missing on some steps → treat as 0
