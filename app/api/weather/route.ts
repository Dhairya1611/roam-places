import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!env.GOOGLE_WEATHER_API_KEY) {
    return Response.json(
      { error: 'Weather is not configured yet.' },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return Response.json(
      { error: 'Valid coordinates are required.' },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    key: env.GOOGLE_WEATHER_API_KEY,
    'location.latitude': String(lat),
    'location.longitude': String(lng),
    unitsSystem: 'METRIC',
    languageCode: 'en',
  });

  try {
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(
        `https://weather.googleapis.com/v1/currentConditions:lookup?${params}`,
      ),
      fetch(
        `https://weather.googleapis.com/v1/forecast/days:lookup?${params}&days=3&pageSize=3`,
      ),
    ]);
    if (!currentResponse.ok || !forecastResponse.ok) {
      return Response.json(
        { error: 'Weather is temporarily unavailable.' },
        { status: 502 },
      );
    }

    const current = (await currentResponse.json()) as any;
    const forecast = (await forecastResponse.json()) as any;
    return Response.json(
      {
        current: {
          temperature: current.temperature?.degrees,
          feelsLike: current.feelsLikeTemperature?.degrees,
          description:
            current.weatherCondition?.description?.text ?? 'Current conditions',
          icon: current.weatherCondition?.iconBaseUri
            ? `${current.weatherCondition.iconBaseUri}.svg`
            : null,
          humidity: current.relativeHumidity,
          precipitation: current.precipitation?.probability?.percent,
          wind: current.wind?.speed?.value,
          isDaytime: current.isDaytime,
        },
        forecast: (forecast.forecastDays ?? []).map((day: any) => ({
          date: day.displayDate,
          high: day.maxTemperature?.degrees,
          low: day.minTemperature?.degrees,
          description: day.daytimeForecast?.weatherCondition?.description?.text,
          icon: day.daytimeForecast?.weatherCondition?.iconBaseUri
            ? `${day.daytimeForecast.weatherCondition.iconBaseUri}.svg`
            : null,
        })),
      },
      { headers: { 'Cache-Control': 'public, max-age=600' } },
    );
  } catch {
    return Response.json(
      { error: 'Weather is temporarily unavailable.' },
      { status: 502 },
    );
  }
}
