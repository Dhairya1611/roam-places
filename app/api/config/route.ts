import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    {
      mapsApiKey: env.GOOGLE_MAPS_BROWSER_KEY ?? '',
      googleClientId: env.GOOGLE_OAUTH_CLIENT_ID ?? '',
      weatherConfigured: Boolean(env.GOOGLE_WEATHER_API_KEY),
    },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
}
