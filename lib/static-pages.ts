export const IS_STATIC_PAGES =
  (import.meta.env.VITE_STATIC_PAGES as string | undefined) === 'true';

const USER_KEY = 'roam.githubPages.user';
const INTERACTIONS_PREFIX = 'roam.githubPages.interactions.';

type StaticUser = {
  sub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

type StaticInteraction = {
  event_type: string;
  place_id?: string;
  place_name?: string;
  category?: string;
  search_query?: string;
  occurred_at: number;
};

type InteractionPayload = {
  eventType?: unknown;
  placeId?: unknown;
  placeName?: unknown;
  category?: unknown;
  searchQuery?: unknown;
};

type GoogleWeatherCondition = {
  description?: { text?: string };
  iconBaseUri?: string;
};

type GoogleWeatherCurrent = {
  temperature?: { degrees?: number };
  feelsLikeTemperature?: { degrees?: number };
  weatherCondition?: GoogleWeatherCondition;
  relativeHumidity?: number;
  precipitation?: { probability?: { percent?: number } };
  wind?: { speed?: { value?: number } };
};

type GoogleWeatherForecast = {
  forecastDays?: Array<{
    displayDate?: { year: number; month: number; day: number };
    maxTemperature?: { degrees?: number };
    minTemperature?: { degrees?: number };
    daytimeForecast?: { weatherCondition?: GoogleWeatherCondition };
  }>;
};

const cleanText = (value: unknown, max = 180) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : undefined;

function readUser(): StaticUser | null {
  try {
    const value = window.localStorage.getItem(USER_KEY);
    if (!value) return null;
    const user = JSON.parse(value) as Partial<StaticUser>;
    if (!user.sub || !user.email || !user.displayName) return null;
    return {
      sub: user.sub,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
}

function interactionsKey(sub: string) {
  return `${INTERACTIONS_PREFIX}${sub}`;
}

function readInteractions(user: StaticUser) {
  try {
    const value = window.localStorage.getItem(interactionsKey(user.sub));
    if (!value) return [] as StaticInteraction[];
    const interactions = JSON.parse(value) as StaticInteraction[];
    return Array.isArray(interactions) ? interactions.slice(0, 100) : [];
  } catch {
    return [] as StaticInteraction[];
  }
}

export function appHref(route = '') {
  const configuredBase =
    (import.meta.env.BASE_URL as string | undefined) || '/';
  const base = configuredBase.endsWith('/')
    ? configuredBase
    : `${configuredBase}/`;
  return route ? `${base}${route.replace(/^\//, '')}` : base;
}

export function readStaticProfile() {
  const user = readUser();
  if (!user) return null;
  const recent = readInteractions(user);
  const scores = new Map<string, number>();
  recent.forEach((interaction) => {
    if (interaction.category) {
      scores.set(
        interaction.category,
        (scores.get(interaction.category) ?? 0) + 1,
      );
    }
  });
  return {
    signedIn: true,
    googleConnected: true,
    user: {
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    recent: recent.slice(0, 24),
    affinities: [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, score]) => ({ category, score })),
  };
}

export function recordStaticInteraction(payload: InteractionPayload) {
  const user = readUser();
  const eventType = cleanText(payload.eventType, 32);
  if (!user || !eventType) return;
  const interactions = readInteractions(user);
  interactions.unshift({
    event_type: eventType,
    place_id: cleanText(payload.placeId),
    place_name: cleanText(payload.placeName),
    category: cleanText(payload.category, 48),
    search_query: cleanText(payload.searchQuery),
    occurred_at: Date.now(),
  });
  try {
    window.localStorage.setItem(
      interactionsKey(user.sub),
      JSON.stringify(interactions.slice(0, 100)),
    );
  } catch {
    // Discovery remains usable when browser storage is unavailable.
  }
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Google returned an invalid credential.');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const decoded = window.atob(padded);
  const bytes = Uint8Array.from(decoded, (character) =>
    character.charCodeAt(0),
  );
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<
    string,
    unknown
  >;
}

export function saveStaticGoogleCredential(credential: string) {
  const claims = decodeJwtPayload(credential);
  const sub = cleanText(claims.sub, 180);
  const email = cleanText(claims.email, 254);
  const displayName = cleanText(claims.name, 180) ?? email;
  if (!sub || !email || !displayName) {
    throw new Error('Google did not return the required profile details.');
  }
  const user: StaticUser = {
    sub,
    email,
    displayName,
    avatarUrl: cleanText(claims.picture, 1000) ?? null,
  };
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function disconnectStaticGoogle() {
  try {
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // The UI still signs out for this tab if storage is blocked.
  }
}

export async function fetchStaticWeather(
  apiKey: string,
  latitude: number,
  longitude: number,
) {
  const params = new URLSearchParams({
    key: apiKey,
    'location.latitude': String(latitude),
    'location.longitude': String(longitude),
    unitsSystem: 'METRIC',
    languageCode: 'en',
  });
  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(`https://weather.googleapis.com/v1/currentConditions:lookup?${params}`),
    fetch(
      `https://weather.googleapis.com/v1/forecast/days:lookup?${params}&days=3&pageSize=3`,
    ),
  ]);
  if (!currentResponse.ok || !forecastResponse.ok) {
    throw new Error('Weather unavailable');
  }
  const current = (await currentResponse.json()) as GoogleWeatherCurrent;
  const forecast = (await forecastResponse.json()) as GoogleWeatherForecast;
  return {
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
    },
    forecast: (forecast.forecastDays ?? []).map((day) => ({
      date: day.displayDate,
      high: day.maxTemperature?.degrees,
      low: day.minTemperature?.degrees,
      description: day.daytimeForecast?.weatherCondition?.description?.text,
      icon: day.daytimeForecast?.weatherCondition?.iconBaseUri
        ? `${day.daytimeForecast.weatherCondition.iconBaseUri}.svg`
        : null,
    })),
  };
}
