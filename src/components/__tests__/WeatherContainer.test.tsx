import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { WeatherContainer } from '@/components/WeatherContainer';
import * as apiModule from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  fetchWeatherFromBothSources: jest.fn(),
}));

describe('WeatherContainer', () => {
  const mockWeatherData = {
    yr: {
      temperature: 15,
      weatherCode: 2,
      relativeHumidity: 65,
      windSpeed: 10,
      weatherIcon: {
        emoji: '🌤️',
        description: 'Partly cloudy',
      },
    },
    dmi: {
      temperature: 14,
      weatherCode: 2,
      humidity: 68,
      windSpeed: 11,
      weatherDescription: {
        emoji: '🌤️',
        description: 'Partly cloudy',
      },
    },
    errors: {
      yr: null,
      dmi: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiModule.fetchWeatherFromBothSources as jest.Mock).mockResolvedValue(
      mockWeatherData
    );
  });

  it('should render weather data when loaded successfully', async () => {
    render(<WeatherContainer />);

    await waitFor(() => {
      expect(apiModule.fetchWeatherFromBothSources).toHaveBeenCalledWith(
        55.6761,
        12.5683
      );
    });
  });

  it('should use custom latitude and longitude when provided', async () => {
    const customLat = 56.0;
    const customLon = 13.0;

    render(
      <WeatherContainer latitude={customLat} longitude={customLon} />
    );

    await waitFor(() => {
      expect(apiModule.fetchWeatherFromBothSources).toHaveBeenCalledWith(
        customLat,
        customLon
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch weather data';
    (apiModule.fetchWeatherFromBothSources as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    render(<WeatherContainer />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
