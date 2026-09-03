declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    GOOGLE_MAPS_BROWSER_KEY?: string;
    GOOGLE_WEATHER_API_KEY?: string;
    GOOGLE_OAUTH_CLIENT_ID?: string;
    SESSION_SECRET?: string;
  }
}
