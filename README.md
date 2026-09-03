# Roam

Roam is a Google Maps-powered outing planner for discovering monuments, parks,
restaurants, cafes, arcades, malls, museums, markets, nightlife, spiritual
places, and cinemas. It combines live place search, route distance and travel
time, destination weather, Uber/Rapido links, Google sign-in, visit history,
recommendations, and a weather-aware outing planner.

## Two deployment targets

- `npm run dev` / `npm run build` runs the full server-backed Sites edition,
  including database-backed profiles and API routes.
- `npm run build:pages` creates the static GitHub Pages edition in
  `dist-pages`. Google sign-in and activity history are stored in the visitor's
  browser because GitHub Pages does not run server code.

The repository contains both editions so the complete application source is
preserved.

## Local setup

Copy `.env.example` to an ignored local environment file and provide the Google
credentials used by the deployment target. Never commit real keys.

```bash
npm install
npm run dev
```

To preview the Pages edition locally:

```bash
VITE_STATIC_PAGES=true \
VITE_PAGES_BASE=/ \
VITE_GOOGLE_MAPS_API_KEY=your_browser_key \
VITE_GOOGLE_OAUTH_CLIENT_ID=your_client_id \
npm run build:pages
npm run preview:pages
```

## GitHub Pages secrets

The deployment workflow expects these repository Actions secrets:

- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_OAUTH_CLIENT_ID`

The Maps key is included in the browser bundle by design, so restrict it in
Google Cloud to the exact GitHub Pages referrer and only the APIs used by Roam.
Also add the GitHub Pages origin to the OAuth client's authorized JavaScript
origins.
