'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  BrainCircuit,
  Bus,
  Car,
  Check,
  ChevronRight,
  Church,
  Clapperboard,
  Clock,
  CloudSun,
  Coffee,
  Compass,
  Droplets,
  ExternalLink,
  Footprints,
  Gamepad2,
  Heart,
  History,
  IndianRupee,
  Landmark,
  LoaderCircle,
  LocateFixed,
  MapPin,
  MoonStar,
  Navigation,
  Route as RouteIcon,
  Search,
  SearchX,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trees,
  University,
  Users,
  Utensils,
  WandSparkles,
  Wind,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  appHref,
  disconnectStaticGoogle,
  fetchStaticWeather,
  IS_STATIC_PAGES,
  readStaticProfile,
  recordStaticInteraction,
} from '@/lib/static-pages';

type CategoryId =
  | 'all'
  | 'monument'
  | 'picnic'
  | 'restaurant'
  | 'cafe'
  | 'arcade'
  | 'mall'
  | 'museum'
  | 'market'
  | 'nightlife'
  | 'spiritual'
  | 'cinema';
type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';
type Coordinates = { lat: number; lng: number };
type PlannerBudget = 'free' | 'value' | 'flexible';
type PlannerDuration = 'quick' | 'half-day' | 'full-day';

type Place = {
  id: string;
  name: string;
  category: Exclude<CategoryId, 'all'>;
  categoryLabel: string;
  address: string;
  description: string;
  rating?: number;
  reviewCount?: number;
  price?: string;
  openLabel: string;
  coordinates: Coordinates;
  image?: string;
  bestFor: string;
  googleMapsUri?: string;
  source: 'curated' | 'google';
};

type TripDetails = {
  distance: string;
  duration: string;
  isLive: boolean;
};

type RouteStats =
  | (TripDetails & {
      placeId: string;
    })
  | null;

type OriginResult = {
  id: string;
  label: string;
  address: string;
  coordinates: Coordinates;
};

type ProfileData = {
  googleConnected: boolean;
  user: { email: string; displayName: string; avatarUrl: string | null };
  recent: Array<{
    event_type: string;
    place_id?: string;
    place_name?: string;
    category?: string;
    search_query?: string;
    occurred_at: number;
  }>;
  affinities: Array<{ category: string; score: number }>;
};

type WeatherData = {
  current: {
    temperature?: number;
    feelsLike?: number;
    description: string;
    icon?: string | null;
    humidity?: number;
    precipitation?: number;
    wind?: number;
  };
  forecast: Array<{
    date?: { year: number; month: number; day: number };
    high?: number;
    low?: number;
    description?: string;
    icon?: string | null;
  }>;
};

type OutingPlan = {
  headline: string;
  rationale: string;
  weatherNote: string;
  estimatedCost: string;
  totalTime: string;
  stops: Array<{
    place: Place;
    arrival: string;
    stay: string;
    commute: string;
    reason: string;
  }>;
};

const BUILT_IN_MAPS_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
const DEFAULT_ORIGIN = { lat: 28.6315, lng: 77.2167 };

const categories: Array<{
  id: CategoryId;
  label: string;
  icon: typeof Compass;
  googleTypes: string[];
}> = [
  {
    id: 'all',
    label: 'All places',
    icon: Compass,
    googleTypes: [
      'tourist_attraction',
      'park',
      'restaurant',
      'cafe',
      'shopping_mall',
      'amusement_center',
      'museum',
      'market',
      'night_club',
      'hindu_temple',
      'movie_theater',
    ],
  },
  {
    id: 'monument',
    label: 'Monuments',
    icon: Landmark,
    googleTypes: ['historical_landmark', 'monument'],
  },
  {
    id: 'picnic',
    label: 'Picnic spots',
    icon: Trees,
    googleTypes: ['park', 'garden', 'picnic_ground'],
  },
  {
    id: 'restaurant',
    label: 'Restaurants',
    icon: Utensils,
    googleTypes: ['restaurant'],
  },
  { id: 'cafe', label: 'Cafes', icon: Coffee, googleTypes: ['cafe'] },
  {
    id: 'arcade',
    label: 'Arcades',
    icon: Gamepad2,
    googleTypes: ['amusement_center', 'video_arcade', 'bowling_alley'],
  },
  {
    id: 'mall',
    label: 'Malls',
    icon: ShoppingBag,
    googleTypes: ['shopping_mall'],
  },
  {
    id: 'museum',
    label: 'Museums',
    icon: University,
    googleTypes: ['museum', 'art_gallery', 'art_museum', 'history_museum'],
  },
  {
    id: 'market',
    label: 'Markets',
    icon: Store,
    googleTypes: ['market', 'farmers_market', 'flea_market'],
  },
  {
    id: 'nightlife',
    label: 'Nightlife',
    icon: MoonStar,
    googleTypes: ['night_club', 'bar', 'live_music_venue'],
  },
  {
    id: 'spiritual',
    label: 'Spiritual',
    icon: Church,
    googleTypes: [
      'hindu_temple',
      'mosque',
      'church',
      'buddhist_temple',
      'synagogue',
    ],
  },
  {
    id: 'cinema',
    label: 'Movies',
    icon: Clapperboard,
    googleTypes: ['movie_theater'],
  },
];

const travelModes: Array<{ id: TravelMode; label: string; icon: typeof Car }> =
  [
    { id: 'driving', label: 'Drive', icon: Car },
    { id: 'walking', label: 'Walk', icon: Footprints },
    { id: 'transit', label: 'Transit', icon: Bus },
    { id: 'bicycling', label: 'Cycle', icon: Bike },
  ];

const categoryMeta: Record<
  Exclude<CategoryId, 'all'>,
  { label: string; tint: string; icon: typeof Compass }
> = {
  monument: { label: 'Monument', tint: 'bg-[#ead8c0]', icon: Landmark },
  picnic: { label: 'Picnic spot', tint: 'bg-[#d7e5cf]', icon: Trees },
  restaurant: { label: 'Restaurant', tint: 'bg-[#edd7ca]', icon: Utensils },
  cafe: { label: 'Cafe', tint: 'bg-[#ecdcc7]', icon: Coffee },
  arcade: { label: 'Arcade', tint: 'bg-[#dcd7eb]', icon: Gamepad2 },
  mall: { label: 'Mall', tint: 'bg-[#d5dfe4]', icon: ShoppingBag },
  museum: { label: 'Museum', tint: 'bg-[#d9e2ea]', icon: University },
  market: { label: 'Market', tint: 'bg-[#f0dec7]', icon: Store },
  nightlife: { label: 'Nightlife', tint: 'bg-[#dcd8ea]', icon: MoonStar },
  spiritual: { label: 'Spiritual place', tint: 'bg-[#e8dfcf]', icon: Church },
  cinema: { label: 'Cinema', tint: 'bg-[#d8e1df]', icon: Clapperboard },
};

const curatedPlaces: Place[] = [
  {
    id: 'lodhi-garden',
    name: 'Lodhi Garden',
    category: 'picnic',
    categoryLabel: 'Picnic spot',
    address: 'Lodhi Road, Lodhi Gardens, New Delhi',
    description:
      'A green city escape where shaded paths, lawns and historic tombs make an easy slow afternoon.',
    rating: 4.6,
    reviewCount: 51200,
    price: 'Free',
    openLabel: 'Open until 8:00 PM',
    coordinates: { lat: 28.5931, lng: 77.2197 },
    image:
      'https://images.squarespace-cdn.com/content/v1/6298cb774cf3830bc9b342bf/d946fae3-8a94-4a4c-b47d-c71ab55a14bd/lodhi-garden.jpg?format=750w',
    bestFor: 'Walks & picnics',
    source: 'curated',
  },
  {
    id: 'india-gate',
    name: 'India Gate',
    category: 'monument',
    categoryLabel: 'Monument',
    address: 'Kartavya Path, India Gate, New Delhi',
    description:
      'The city’s iconic ceremonial landmark, best paired with an evening stroll along Kartavya Path.',
    rating: 4.6,
    reviewCount: 284000,
    price: 'Free',
    openLabel: 'Open 24 hours',
    coordinates: { lat: 28.6129, lng: 77.2295 },
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Delhi%2C_India%2C_India_Gate.jpg/640px-Delhi%2C_India%2C_India_Gate.jpg',
    bestFor: 'Sunset & history',
    source: 'curated',
  },
  {
    id: 'diggin-cafe',
    name: 'Diggin Cafe',
    category: 'cafe',
    categoryLabel: 'Cafe',
    address: 'Santushti Shopping Complex, Chanakyapuri',
    description:
      'A leafy, light-filled cafe with relaxed courtyard energy and a menu made for long catch-ups.',
    rating: 4.4,
    reviewCount: 9800,
    price: '₹₹',
    openLabel: 'Open until 10:00 PM',
    coordinates: { lat: 28.5978, lng: 77.1884 },
    image:
      'https://images-luxe.outlookindia.com/2025/12/17152636/Diggin-Cafe-2n-769x1024.jpg',
    bestFor: 'Coffee dates',
    source: 'curated',
  },
  {
    id: 'cafe-stone',
    name: 'The Cafe Stone',
    category: 'cafe',
    categoryLabel: 'Cafe',
    address: 'Mehrauli Archaeological Park, New Delhi',
    description:
      'A simple open-air cafe tucked among heritage ruins, with an atmosphere unlike the usual city stop.',
    rating: 4.3,
    reviewCount: 840,
    price: '₹₹',
    openLabel: 'Open until 7:00 PM',
    coordinates: { lat: 28.5221, lng: 77.1831 },
    image:
      'https://thepatriot.in/wp-content/uploads/2024/04/Cafe-Stone-image1-scaled.jpg',
    bestFor: 'Heritage breaks',
    source: 'curated',
  },
  {
    id: 'select-citywalk',
    name: 'Select CITYWALK',
    category: 'mall',
    categoryLabel: 'Mall',
    address: 'Saket District Centre, New Delhi',
    description:
      'A lively shopping, dining and cinema hub with enough variety for an unplanned afternoon out.',
    rating: 4.6,
    reviewCount: 118000,
    price: '₹₹₹',
    openLabel: 'Open until 11:00 PM',
    coordinates: { lat: 28.5286, lng: 77.2194 },
    image:
      'https://www.cvent.com/venues/_next/image?q=75&url=https%3A%2F%2Fimages.cvent.com%2FCSN%2Fbb66887d-372c-4a32-bc18-6a4a77dd3b80%2Fimages%2F173d126a3c624619a03904d8252786db_LARGE%21_%21644f869961c265c4aa9a40bbdb92205a.jpg&w=1080',
    bestFor: 'Shopping & movies',
    source: 'curated',
  },
  {
    id: 'sunder-nursery',
    name: 'Sunder Nursery',
    category: 'picnic',
    categoryLabel: 'Picnic spot',
    address: 'Nizamuddin, New Delhi',
    description:
      'A beautifully restored heritage park with gardens, water features and plenty of room to pause.',
    rating: 4.6,
    reviewCount: 35000,
    price: '₹50',
    openLabel: 'Open until 10:00 PM',
    coordinates: { lat: 28.5962, lng: 77.2473 },
    bestFor: 'Picnics & photos',
    source: 'curated',
  },
  {
    id: 'indian-accent',
    name: 'Indian Accent',
    category: 'restaurant',
    categoryLabel: 'Restaurant',
    address: 'The Lodhi, Lodhi Road, New Delhi',
    description:
      'Inventive Indian dining in a calm, contemporary setting for a memorable occasion.',
    rating: 4.7,
    reviewCount: 4200,
    price: '₹₹₹₹',
    openLabel: 'Opens at 7:00 PM',
    coordinates: { lat: 28.5918, lng: 77.2385 },
    bestFor: 'Special dinners',
    source: 'curated',
  },
  {
    id: 'yes-minister',
    name: 'Yes Minister',
    category: 'arcade',
    categoryLabel: 'Arcade',
    address: 'Essex Farms, Hauz Khas, New Delhi',
    description:
      'Bowling, arcade games and casual food under one roof—an easy group plan when the weather turns.',
    rating: 4.2,
    reviewCount: 5100,
    price: '₹₹',
    openLabel: 'Open until 12:00 AM',
    coordinates: { lat: 28.5484, lng: 77.1961 },
    bestFor: 'Groups & games',
    source: 'curated',
  },
  {
    id: 'qutub-minar',
    name: 'Qutub Minar',
    category: 'monument',
    categoryLabel: 'Monument',
    address: 'Seth Sarai, Mehrauli, New Delhi',
    description:
      'A soaring UNESCO-listed minaret surrounded by layered ruins and intricate stonework.',
    rating: 4.5,
    reviewCount: 152000,
    price: '₹40+',
    openLabel: 'Open until 8:00 PM',
    coordinates: { lat: 28.5244, lng: 77.1855 },
    bestFor: 'Architecture & history',
    source: 'curated',
  },
  {
    id: 'national-museum',
    name: 'National Museum',
    category: 'museum',
    categoryLabel: 'Museum',
    address: 'Janpath Road, Rajpath Area, New Delhi',
    description:
      'A thoughtful journey through Indian art and history, from ancient sculpture to decorative arts.',
    rating: 4.5,
    reviewCount: 15000,
    price: '₹20+',
    openLabel: 'Check today’s hours',
    coordinates: { lat: 28.6118, lng: 77.2195 },
    image:
      'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=82',
    bestFor: 'Art & history',
    source: 'curated',
  },
  {
    id: 'dilli-haat-ina',
    name: 'Dilli Haat INA',
    category: 'market',
    categoryLabel: 'Market',
    address: 'Sri Aurobindo Marg, INA, New Delhi',
    description:
      'An open-air craft bazaar mixing regional food, handmade goods and a relaxed festival atmosphere.',
    rating: 4.3,
    reviewCount: 42000,
    price: '₹30+',
    openLabel: 'Open until 10:00 PM',
    coordinates: { lat: 28.5731, lng: 77.2073 },
    image:
      'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?auto=format&fit=crop&w=900&q=82',
    bestFor: 'Crafts & street food',
    source: 'curated',
  },
  {
    id: 'hauz-khas-social',
    name: 'Hauz Khas Social',
    category: 'nightlife',
    categoryLabel: 'Nightlife',
    address: 'Hauz Khas Village, New Delhi',
    description:
      'A lively lake-facing social space that shifts easily from late lunch to music and evening plans.',
    rating: 4.2,
    reviewCount: 34000,
    price: '₹₹₹',
    openLabel: 'Open late',
    coordinates: { lat: 28.5543, lng: 77.1941 },
    image:
      'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=900&q=82',
    bestFor: 'Sunset & music',
    source: 'curated',
  },
  {
    id: 'akshardham',
    name: 'Swaminarayan Akshardham',
    category: 'spiritual',
    categoryLabel: 'Spiritual place',
    address: 'Noida Mor, Pandav Nagar, New Delhi',
    description:
      'A vast temple complex known for detailed stonework, gardens and an immersive cultural experience.',
    rating: 4.6,
    reviewCount: 52000,
    price: 'Free entry',
    openLabel: 'Closed Mondays',
    coordinates: { lat: 28.6127, lng: 77.2773 },
    image:
      'https://images.unsplash.com/photo-1600100397608-f010f420a925?auto=format&fit=crop&w=900&q=82',
    bestFor: 'Architecture & calm',
    source: 'curated',
  },
  {
    id: 'pvr-priya',
    name: 'PVR Priya',
    category: 'cinema',
    categoryLabel: 'Cinema',
    address: 'Basant Lok, Vasant Vihar, New Delhi',
    description:
      'A neighbourhood cinema landmark surrounded by cafes, quick bites and an easy evening-out atmosphere.',
    rating: 4.4,
    reviewCount: 9400,
    price: '₹₹',
    openLabel: 'Shows through the evening',
    coordinates: { lat: 28.5578, lng: 77.1645 },
    image:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=82',
    bestFor: 'Movies & dinner',
    source: 'curated',
  },
];

const categoryFallbackImages: Record<Exclude<CategoryId, 'all'>, string> = {
  monument: curatedPlaces[1].image!,
  picnic: curatedPlaces[0].image!,
  restaurant:
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=82',
  cafe: curatedPlaces[2].image!,
  arcade:
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=82',
  mall: curatedPlaces[4].image!,
  museum:
    'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=82',
  market:
    'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?auto=format&fit=crop&w=900&q=82',
  nightlife:
    'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=900&q=82',
  spiritual:
    'https://images.unsplash.com/photo-1600100397608-f010f420a925?auto=format&fit=crop&w=900&q=82',
  cinema:
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=82',
};

function loadGoogleMaps(apiKey: string) {
  const mapsWindow = window as typeof window & {
    google?: any;
    __roamMapsPromise?: Promise<void>;
    __roamGoogleMapsReady?: () => void;
  };

  if (mapsWindow.google?.maps?.importLibrary) return Promise.resolve();
  if (mapsWindow.__roamMapsPromise) return mapsWindow.__roamMapsPromise;

  mapsWindow.__roamMapsPromise = new Promise<void>((resolve, reject) => {
    const callbackName = '__roamGoogleMapsReady';
    const script = document.createElement('script');
    const timeoutId = window.setTimeout(() => {
      mapsWindow.__roamMapsPromise = undefined;
      delete mapsWindow.__roamGoogleMapsReady;
      reject(
        new Error(
          'Google Maps took too long to start. Please refresh and try again.',
        ),
      );
    }, 20_000);

    mapsWindow.__roamGoogleMapsReady = () => {
      window.clearTimeout(timeoutId);
      delete mapsWindow.__roamGoogleMapsReady;
      if (mapsWindow.google?.maps?.importLibrary) {
        resolve();
        return;
      }
      mapsWindow.__roamMapsPromise = undefined;
      reject(
        new Error(
          'Google Maps loaded without its required libraries. Please refresh and try again.',
        ),
      );
    };

    const parameters = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      loading: 'async',
      callback: callbackName,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${parameters.toString()}`;
    script.async = true;
    script.dataset.roamGoogleMaps = 'true';
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      mapsWindow.__roamMapsPromise = undefined;
      delete mapsWindow.__roamGoogleMapsReady;
      reject(
        new Error(
          'Google Maps could not be loaded. Check the API key and its website restrictions.',
        ),
      );
    };
    document.head.appendChild(script);
  });

  return mapsWindow.__roamMapsPromise;
}

function haversineDistance(a: Coordinates, b: Coordinates) {
  const radiusKm = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return radiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function estimateTrip(
  origin: Coordinates,
  destination: Coordinates,
  mode: TravelMode,
) {
  const directKm = haversineDistance(origin, destination);
  const routeFactor =
    mode === 'walking' ? 1.16 : mode === 'bicycling' ? 1.2 : 1.28;
  const distanceKm = Math.max(0.2, directKm * routeFactor);
  const speeds: Record<TravelMode, number> = {
    driving: 24,
    walking: 4.8,
    transit: 18,
    bicycling: 13,
  };
  const transferMinutes = mode === 'transit' ? 8 : mode === 'driving' ? 3 : 0;
  const duration = Math.max(
    2,
    Math.round((distanceKm / speeds[mode]) * 60 + transferMinutes),
  );
  return {
    distance:
      distanceKm < 10
        ? `${distanceKm.toFixed(1)} km`
        : `${Math.round(distanceKm)} km`,
    duration:
      duration >= 60
        ? `${Math.floor(duration / 60)} hr ${duration % 60} min`
        : `${duration} min`,
    isLive: false,
  };
}

function formatLiveTrip(distanceMeters?: number, durationMillis?: number) {
  if (!distanceMeters || !durationMillis) return null;
  const distanceKm = distanceMeters / 1000;
  const durationMinutes = Math.max(1, Math.round(durationMillis / 60000));
  return {
    distance:
      distanceKm < 10
        ? `${distanceKm.toFixed(1)} km`
        : `${Math.round(distanceKm)} km`,
    duration:
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60} min`
        : `${durationMinutes} min`,
    isLive: true,
  } satisfies TripDetails;
}

function formatReviews(count?: number) {
  if (!count) return '';
  if (count >= 1000)
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  return String(count);
}

function googleDirectionsUrl(
  place: Place,
  origin: Coordinates | null,
  mode: TravelMode,
) {
  const travelMode = mode === 'bicycling' ? 'bicycling' : mode;
  const originParameter = origin ? `&origin=${origin.lat},${origin.lng}` : '';
  return `https://www.google.com/maps/dir/?api=1${originParameter}&destination=${place.coordinates.lat},${place.coordinates.lng}&travelmode=${travelMode}`;
}

function uberRideUrl(place: Place, origin: Coordinates) {
  const pickup = encodeURIComponent(
    JSON.stringify({
      latitude: origin.lat,
      longitude: origin.lng,
      address: 'My location',
    }),
  );
  const dropoff = encodeURIComponent(
    JSON.stringify({
      latitude: place.coordinates.lat,
      longitude: place.coordinates.lng,
      address: place.address,
      nickname: place.name,
    }),
  );
  return `https://m.uber.com/looking?pickup=${pickup}&drop%5B0%5D=${dropoff}`;
}

function formatWeatherDay(date?: { year: number; month: number; day: number }) {
  if (!date) return 'Soon';
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(
    new Date(date.year, date.month - 1, date.day),
  );
}

function inferCategory(
  primaryType: string | undefined,
  fallback: Exclude<CategoryId, 'all'>,
): Exclude<CategoryId, 'all'> {
  if (!primaryType) return fallback;
  if (['park', 'garden', 'picnic_ground'].includes(primaryType))
    return 'picnic';
  if (primaryType === 'restaurant') return 'restaurant';
  if (['cafe', 'coffee_shop'].includes(primaryType)) return 'cafe';
  if (['shopping_mall', 'department_store'].includes(primaryType))
    return 'mall';
  if (
    ['amusement_center', 'video_arcade', 'bowling_alley'].includes(primaryType)
  )
    return 'arcade';
  if (['museum', 'art_gallery', 'art_museum'].includes(primaryType))
    return 'museum';
  if (['market', 'farmers_market', 'flea_market'].includes(primaryType))
    return 'market';
  if (['night_club', 'bar', 'live_music_venue'].includes(primaryType))
    return 'nightlife';
  if (
    [
      'hindu_temple',
      'mosque',
      'church',
      'buddhist_temple',
      'synagogue',
      'place_of_worship',
    ].includes(primaryType)
  )
    return 'spiritual';
  if (primaryType === 'movie_theater') return 'cinema';
  return primaryType.includes('landmark') || primaryType === 'monument'
    ? 'monument'
    : fallback;
}

function parseMinutes(duration: string) {
  const hours = Number(duration.match(/(\d+)\s*hr/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)\s*min/)?.[1] ?? 0);
  return hours * 60 + minutes || 20;
}

function priceEstimate(place: Place, budget: PlannerBudget) {
  if (place.price?.toLowerCase().includes('free')) return 0;
  if (place.price?.startsWith('₹') && /\d/.test(place.price)) {
    return Number(place.price.match(/\d+/)?.[0] ?? 0);
  }
  const level = place.price?.match(/₹/g)?.length ?? 1;
  const base = [0, 250, 650, 1400, 2600][Math.min(level, 4)];
  return budget === 'free' ? Math.min(base, 250) : base;
}

function formatPlanTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function PlaceVisual({
  place,
  className = '',
}: {
  place: Place;
  className?: string;
}) {
  const Icon = categoryMeta[place.category].icon;
  const fallbackImage = categoryFallbackImages[place.category];
  const [imageSrc, setImageSrc] = useState(place.image ?? fallbackImage);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageSrc(place.image ?? fallbackImage);
    setImageFailed(false);
  }, [fallbackImage, place.id, place.image]);

  return (
    <div
      className={`relative overflow-hidden ${categoryMeta[place.category].tint} ${className}`}
    >
      {!imageFailed && imageSrc ? (
        <img
          src={imageSrc}
          alt={`${place.name} photo`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
            else setImageFailed(true);
          }}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-white/25 to-primary/10">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/55 shadow-sm">
            <Icon className="text-primary/65" size={28} />
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
    </div>
  );
}

function LiveGoogleMap({
  apiKey,
  places,
  selected,
  origin,
  routeEnabled,
  travelMode,
  onSelect,
  onRouteStats,
  onError,
}: {
  apiKey: string;
  places: Place[];
  selected: Place;
  origin: Coordinates;
  routeEnabled: boolean;
  travelMode: TravelMode;
  onSelect: (id: string) => void;
  onRouteStats: (stats: RouteStats) => void;
  onError: (message: string) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any[]>([]);
  const routePolylinesRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then(async () => {
        if (cancelled || !elementRef.current) return;
        const google = (window as any).google;
        const { Map } = await google.maps.importLibrary('maps');
        mapRef.current = new Map(elementRef.current, {
          center: selected.coordinates,
          zoom: 13,
          mapId: 'DEMO_MAP_ID',
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });
        if (!cancelled) setReady(true);
      })
      .catch((error) =>
        onError(
          error instanceof Error
            ? error.message
            : 'Google Maps could not be loaded.',
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [apiKey, onError, selected.coordinates]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;

    void (async () => {
      const google = (window as any).google;
      const { AdvancedMarkerElement, PinElement } =
        await google.maps.importLibrary('marker');
      if (cancelled) return;
      markerRef.current.forEach((marker) => {
        marker.map = null;
      });
      markerRef.current = places.map((place, index) => {
        const isSelected = place.id === selected.id;
        const pin = new PinElement({
          background: isSelected ? '#1e5549' : '#fffdf7',
          borderColor: '#1e5549',
          glyphColor: isSelected ? '#fffdf7' : '#1e5549',
          glyph: String(index + 1),
          scale: isSelected ? 1.2 : 1,
        });
        const marker = new AdvancedMarkerElement({
          map: mapRef.current,
          position: place.coordinates,
          title: place.name,
          content: pin.element,
          zIndex: isSelected ? 10 : 1,
        });
        marker.addListener('click', () => onSelect(place.id));
        return marker;
      });

      if (routeEnabled) {
        const originPin = new PinElement({
          background: '#2676d9',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          glyph: '•',
          scale: 0.82,
        });
        markerRef.current.push(
          new AdvancedMarkerElement({
            map: mapRef.current,
            position: origin,
            title: 'Your starting point',
            content: originPin.element,
          }),
        );
      }
    })().catch(() => onError('Map markers could not be drawn.'));

    return () => {
      cancelled = true;
    };
  }, [onError, onSelect, origin, places, ready, routeEnabled, selected.id]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;
    routePolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    routePolylinesRef.current = [];
    onRouteStats(null);
    if (!routeEnabled) {
      mapRef.current.panTo(selected.coordinates);
      return;
    }

    void (async () => {
      const google = (window as any).google;
      const { Route } = await google.maps.importLibrary('routes');
      const request: Record<string, unknown> = {
        origin,
        destination: selected.coordinates,
        travelMode: travelMode.toUpperCase(),
        fields: [
          'path',
          'legs',
          'viewport',
          'distanceMeters',
          'durationMillis',
          'localizedValues',
        ],
      };
      if (travelMode === 'driving') {
        request.routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
        request.trafficModel = 'BEST_GUESS';
      }
      const result = await Route.computeRoutes(request);
      if (cancelled || !result.routes?.length) return;
      const route = result.routes[0];
      const polylines = route.createPolylines();
      polylines.forEach((polyline: any) => {
        polyline.setOptions({
          strokeColor: '#1e5549',
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
        polyline.setMap(mapRef.current);
      });
      routePolylinesRef.current = polylines;
      if (route.viewport) mapRef.current.fitBounds(route.viewport, 72);
      const distance =
        route.localizedValues?.distance ??
        (route.distanceMeters
          ? `${(route.distanceMeters / 1000).toFixed(1)} km`
          : 'Route ready');
      const duration =
        route.localizedValues?.duration ??
        (route.durationMillis
          ? `${Math.round(route.durationMillis / 60000)} min`
          : 'See route');
      onRouteStats({
        placeId: selected.id,
        distance,
        duration,
        isLive: true,
      });
    })().catch(() => {
      onRouteStats(null);
      mapRef.current?.panTo(selected.coordinates);
    });

    return () => {
      cancelled = true;
    };
  }, [onRouteStats, origin, ready, routeEnabled, selected, travelMode]);

  return (
    <div
      ref={elementRef}
      className="absolute inset-0"
      aria-label="Interactive Google Map"
    />
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState<Coordinates>(DEFAULT_ORIGIN);
  const [locationLabel, setLocationLabel] = useState('Set start point');
  const [originConfirmed, setOriginConfirmed] = useState(false);
  const [originDialogOpen, setOriginDialogOpen] = useState(false);
  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState<OriginResult[]>([]);
  const [originSearching, setOriginSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(curatedPlaces[0].id);
  const [mapsKey, setMapsKey] = useState('');
  const [livePlaces, setLivePlaces] = useState<Place[] | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [mapsError, setMapsError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [routeStats, setRouteStats] = useState<RouteStats>(null);
  const [routeMatrixStats, setRouteMatrixStats] = useState<
    Record<string, TripDetails>
  >({});
  const [routeMatrixLoading, setRouteMatrixLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherConfigured, setWeatherConfigured] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerBudget, setPlannerBudget] = useState<PlannerBudget>('value');
  const [plannerDuration, setPlannerDuration] =
    useState<PlannerDuration>('half-day');
  const [plannerGroupSize, setPlannerGroupSize] = useState(2);
  const [outingPlan, setOutingPlan] = useState<OutingPlan | null>(null);
  const [toast, setToast] = useState('');
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const lastViewedId = useRef('');

  const applyOrigin = useCallback((coordinates: Coordinates, label: string) => {
    setOrigin(coordinates);
    setLocationLabel(label);
    setOriginConfirmed(true);
    setOriginDialogOpen(false);
    setLocationError('');
    setRouteStats(null);
    setRouteMatrixStats({});
    try {
      window.localStorage.setItem(
        'roam.startingPoint',
        JSON.stringify({ coordinates, label }),
      );
    } catch {
      // Travel still works if device storage is unavailable.
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (IS_STATIC_PAGES) {
      setProfile(readStaticProfile() as ProfileData | null);
      return;
    }
    try {
      const response = await fetch('/api/profile', { cache: 'no-store' });
      const data = (await response.json()) as ProfileData;
      if (data.user) setProfile(data);
    } catch {
      // The public discovery experience still works if profile storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('roam.startingPoint');
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        coordinates?: Coordinates;
        label?: string;
      };
      if (
        Number.isFinite(parsed.coordinates?.lat) &&
        Number.isFinite(parsed.coordinates?.lng) &&
        parsed.label
      ) {
        setOrigin(parsed.coordinates as Coordinates);
        setLocationLabel(parsed.label);
        setOriginConfirmed(true);
      }
    } catch {
      // Ignore malformed or blocked browser storage.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let key = BUILT_IN_MAPS_KEY;
      if (IS_STATIC_PAGES) {
        if (!cancelled) setWeatherConfigured(Boolean(key));
      } else {
        try {
          const response = await fetch('/api/config');
          const config = (await response.json()) as {
            mapsApiKey?: string;
            weatherConfigured?: boolean;
          };
          key = config.mapsApiKey || key;
          if (!cancelled)
            setWeatherConfigured(Boolean(config.weatherConfigured));
        } catch {
          // Local preview can still use a developer-provided browser key.
        }
      }
      if (!cancelled) {
        setMapsKey(key);
      }
    })();
    void refreshProfile();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const reportMapError = useCallback(
    (message: string) => setMapsError(message),
    [],
  );
  const updateRouteStats = useCallback(
    (stats: RouteStats) => setRouteStats(stats),
    [],
  );
  const selectPlace = useCallback((id: string) => setSelectedId(id), []);
  const postInteraction = useCallback((payload: Record<string, unknown>) => {
    if (IS_STATIC_PAGES) {
      recordStaticInteraction(payload);
      return;
    }
    void fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!mapsKey) {
      setLivePlaces(null);
      return;
    }
    let cancelled = false;
    const searchQuery = query.trim();
    const timer = window.setTimeout(
      () => {
        setLiveLoading(true);
        setMapsError('');

        void (async () => {
          await loadGoogleMaps(mapsKey);
          const google = (window as any).google;
          const { Place, SearchNearbyRankPreference } =
            await google.maps.importLibrary('places');
          const category = categories.find(
            (item) => item.id === activeCategory,
          )!;
          const fields = [
            'id',
            'displayName',
            'location',
            'formattedAddress',
            'rating',
            'userRatingCount',
            'priceLevel',
            'googleMapsURI',
            'primaryType',
            'primaryTypeDisplayName',
            'photos',
            'editorialSummary',
            'regularOpeningHours',
          ];
          const result =
            searchQuery.length >= 2
              ? await Place.searchByText({
                  textQuery: searchQuery,
                  fields,
                  locationBias: origin,
                  includedType:
                    activeCategory === 'all'
                      ? undefined
                      : category.googleTypes[0],
                  maxResultCount: 16,
                  language: 'en-IN',
                  region: 'in',
                })
              : await Place.searchNearby({
                  fields,
                  locationRestriction: { center: origin, radius: 25000 },
                  includedPrimaryTypes: category.googleTypes,
                  maxResultCount: 16,
                  rankPreference: SearchNearbyRankPreference.POPULARITY,
                });
          if (cancelled) return;
          const fallbackCategory: Exclude<CategoryId, 'all'> =
            activeCategory === 'all' ? 'monument' : activeCategory;
          const converted: Place[] = (result.places ?? [])
            .filter((place: any) => place.location)
            .map((place: any, index: number) => {
              const placeCategory = inferCategory(
                place.primaryType,
                fallbackCategory,
              );
              const location = place.location;
              const lat =
                typeof location.lat === 'function'
                  ? location.lat()
                  : location.lat;
              const lng =
                typeof location.lng === 'function'
                  ? location.lng()
                  : location.lng;
              return {
                id: place.id ?? `google-${index}`,
                name: place.displayName ?? 'Nearby place',
                category: placeCategory,
                categoryLabel:
                  place.primaryTypeDisplayName ??
                  categoryMeta[placeCategory].label,
                address:
                  place.formattedAddress ?? 'Address available in Google Maps',
                description:
                  place.editorialSummary ??
                  `A popular ${categoryMeta[placeCategory].label.toLowerCase()} near your chosen starting point.`,
                rating: place.rating,
                reviewCount: place.userRatingCount,
                price: place.priceLevel
                  ? String(place.priceLevel)
                      .replaceAll('_', ' ')
                      .replace('PRICE LEVEL ', '')
                  : undefined,
                openLabel: place.regularOpeningHours?.weekdayDescriptions?.[0]
                  ? 'Hours available in Google Maps'
                  : 'Check live hours',
                coordinates: { lat, lng },
                image:
                  place.photos?.[0]?.getURI?.({
                    maxWidth: 900,
                    maxHeight: 600,
                  }) ?? categoryFallbackImages[placeCategory],
                bestFor: categoryMeta[placeCategory].label,
                googleMapsUri: place.googleMapsURI,
                source: 'google' as const,
              };
            });
          setLivePlaces(converted);
          if (converted.length) setSelectedId(converted[0].id);
        })()
          .catch((error) => {
            if (!cancelled) {
              setLivePlaces(null);
              setMapsError(
                error instanceof Error
                  ? error.message
                  : 'Live Google place search is temporarily unavailable.',
              );
            }
          })
          .finally(() => {
            if (!cancelled) setLiveLoading(false);
          });
      },
      searchQuery.length >= 2 ? 380 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeCategory, mapsKey, origin, query]);

  const basePlaces = mapsKey && livePlaces ? livePlaces : curatedPlaces;
  const filteredPlaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return basePlaces
      .filter(
        (place) =>
          activeCategory === 'all' ||
          place.category === activeCategory ||
          place.source === 'google',
      )
      .filter(
        (place) =>
          !normalized ||
          (mapsKey && livePlaces !== null) ||
          `${place.name} ${place.address} ${place.categoryLabel} ${place.bestFor}`
            .toLowerCase()
            .includes(normalized),
      )
      .sort(
        (a, b) =>
          haversineDistance(origin, a.coordinates) -
          haversineDistance(origin, b.coordinates),
      );
  }, [activeCategory, basePlaces, livePlaces, mapsKey, origin, query]);

  useEffect(() => {
    if (
      filteredPlaces.length &&
      !filteredPlaces.some((place) => place.id === selectedId)
    ) {
      setSelectedId(filteredPlaces[0].id);
    }
  }, [filteredPlaces, selectedId]);

  const selected =
    filteredPlaces.find((place) => place.id === selectedId) ??
    filteredPlaces[0] ??
    curatedPlaces[0];

  useEffect(() => {
    if (!mapsKey || !originConfirmed || !filteredPlaces.length) {
      setRouteMatrixStats({});
      setRouteMatrixLoading(false);
      return;
    }

    let cancelled = false;
    setRouteMatrixLoading(true);
    setRouteMatrixStats({});
    void (async () => {
      await loadGoogleMaps(mapsKey);
      const google = (window as any).google;
      const { RouteMatrix } = await google.maps.importLibrary('routes');
      const destinations = filteredPlaces.slice(0, 16);
      const request: Record<string, unknown> = {
        origins: [origin],
        destinations: destinations.map((place) => place.coordinates),
        travelMode: travelMode.toUpperCase(),
        units: 'METRIC',
        language: 'en-IN',
        region: 'in',
        fields: ['distanceMeters', 'durationMillis', 'condition'],
      };
      if (travelMode === 'driving') {
        request.routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
        request.trafficModel = 'BEST_GUESS';
      }
      const { matrix } = await RouteMatrix.computeRouteMatrix(request);
      if (cancelled) return;
      const items = matrix.rows?.[0]?.items ?? [];
      const nextStats: Record<string, TripDetails> = {};
      destinations.forEach((place, index) => {
        const item = items[index];
        const trip = formatLiveTrip(item?.distanceMeters, item?.durationMillis);
        if (trip) nextStats[place.id] = trip;
      });
      setRouteMatrixStats(nextStats);
    })()
      .catch(() => {
        if (!cancelled) setRouteMatrixStats({});
      })
      .finally(() => {
        if (!cancelled) setRouteMatrixLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filteredPlaces, mapsKey, origin, originConfirmed, travelMode]);

  const tripFor = (place: Place) =>
    routeStats?.placeId === place.id
      ? {
          distance: routeStats.distance,
          duration: routeStats.duration,
          isLive: true,
        }
      : routeMatrixStats[place.id]
        ? routeMatrixStats[place.id]
        : estimateTrip(origin, place.coordinates, travelMode);
  const selectedTrip = tripFor(selected);
  const selectedDurationLabel = selectedTrip.isLive
    ? selectedTrip.duration
    : !originConfirmed
      ? 'Set a start point'
      : routeMatrixLoading
        ? 'Calculating route…'
        : `About ${selectedTrip.duration}`;
  const selectedDistanceLabel = selectedTrip.isLive
    ? selectedTrip.distance
    : `About ${selectedTrip.distance}`;
  const recommendations = useMemo(() => {
    const scores = new Map(
      (profile?.affinities ?? []).map((item) => [
        item.category,
        Number(item.score),
      ]),
    );
    return curatedPlaces
      .filter((place) => scores.has(place.category))
      .sort(
        (a, b) => (scores.get(b.category) ?? 0) - (scores.get(a.category) ?? 0),
      )
      .slice(0, 3);
  }, [profile]);

  useEffect(() => {
    if (!weatherConfigured) {
      setWeather(null);
      setWeatherError('');
      return;
    }
    let cancelled = false;
    setWeatherLoading(true);
    setWeather(null);
    setWeatherError('');
    const weatherRequest = IS_STATIC_PAGES
      ? fetchStaticWeather(
          mapsKey,
          selected.coordinates.lat,
          selected.coordinates.lng,
        )
      : fetch(
          `/api/weather?lat=${selected.coordinates.lat}&lng=${selected.coordinates.lng}`,
        ).then(async (response) => {
          if (!response.ok) throw new Error('Weather unavailable');
          return (await response.json()) as WeatherData;
        });
    void weatherRequest
      .then((data) => {
        if (!cancelled) setWeather(data as WeatherData);
      })
      .catch(() => {
        if (!cancelled) {
          setWeather(null);
          setWeatherError('Weather is temporarily unavailable for this place.');
        }
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    mapsKey,
    selected.coordinates.lat,
    selected.coordinates.lng,
    weatherConfigured,
  ]);

  const generateOutingPlan = useCallback(() => {
    const desiredStops =
      plannerDuration === 'quick' ? 2 : plannerDuration === 'half-day' ? 3 : 4;
    const affinity = new Map(
      (profile?.affinities ?? []).map((item) => [
        item.category,
        Number(item.score),
      ]),
    );
    const outdoorCategories = new Set<CategoryId>([
      'monument',
      'picnic',
      'market',
      'spiritual',
    ]);
    const rainChance = weather?.current.precipitation ?? 0;
    const temperature = weather?.current.temperature;
    const weatherDescription = weather?.current.description.toLowerCase() ?? '';
    const poorOutdoorWeather =
      rainChance >= 45 ||
      weatherDescription.includes('rain') ||
      (temperature !== undefined && (temperature >= 36 || temperature <= 10));

    const unique = Array.from(
      new Map(
        [
          ...(filteredPlaces.length ? filteredPlaces : basePlaces),
          ...curatedPlaces,
        ].map((place) => [place.id, place]),
      ).values(),
    );
    const scored = unique
      .map((place) => {
        const distance = haversineDistance(origin, place.coordinates);
        const cost = priceEstimate(place, plannerBudget);
        let score = (place.rating ?? 4) * 3 - distance * 0.2;
        score += (affinity.get(place.category) ?? 0) * 1.4;
        if (place.id === selected.id) score += 9;
        if (activeCategory !== 'all' && place.category === activeCategory)
          score += 5;
        if (plannerBudget === 'free' && cost > 250) score -= 12;
        if (plannerBudget === 'value' && cost > 900) score -= 6;
        if (poorOutdoorWeather && outdoorCategories.has(place.category))
          score -= 10;
        if (poorOutdoorWeather && !outdoorCategories.has(place.category))
          score += 5;
        return { place, score, cost };
      })
      .sort((a, b) => b.score - a.score);

    const chosen: typeof scored = [];
    for (const candidate of scored) {
      if (chosen.length >= desiredStops) break;
      const repeats = chosen.filter(
        (item) => item.place.category === candidate.place.category,
      ).length;
      if (repeats >= 1 && scored.length > desiredStops + 2) continue;
      chosen.push(candidate);
    }

    const start = new Date();
    start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
    let cursor = new Date(start);
    let previous = origin;
    let totalCostPerPerson = 0;
    let totalCommuteMinutes = 0;
    const stayMinutes =
      plannerDuration === 'quick'
        ? 55
        : plannerDuration === 'half-day'
          ? 75
          : 90;
    const stops = chosen.map(({ place, cost }, index) => {
      const commute =
        index === 0 && routeMatrixStats[place.id]
          ? routeMatrixStats[place.id]
          : estimateTrip(previous, place.coordinates, travelMode);
      const commuteMinutes = parseMinutes(commute.duration);
      totalCommuteMinutes += commuteMinutes;
      cursor = new Date(cursor.getTime() + commuteMinutes * 60_000);
      const arrival = formatPlanTime(cursor);
      const reason =
        poorOutdoorWeather && !outdoorCategories.has(place.category)
          ? 'An indoor-friendly stop that keeps the plan comfortable in this weather.'
          : index === 0
            ? 'A strong first stop based on your current choice, rating, and commute.'
            : `Adds ${place.bestFor.toLowerCase()} without stretching the route too far.`;
      cursor = new Date(cursor.getTime() + stayMinutes * 60_000);
      previous = place.coordinates;
      totalCostPerPerson += cost;
      return {
        place,
        arrival,
        stay: `${stayMinutes} min`,
        commute: commute.duration,
        reason,
      };
    });

    const commuteCost =
      travelMode === 'driving'
        ? 180 * Math.max(1, chosen.length)
        : travelMode === 'transit'
          ? 45 * Math.max(1, chosen.length)
          : 0;
    const totalPerPerson = totalCostPerPerson + commuteCost;
    const totalHours = Math.max(
      1,
      Math.round(((cursor.getTime() - start.getTime()) / 3_600_000) * 10) / 10,
    );
    const weatherNote = weather
      ? poorOutdoorWeather
        ? `${weather.current.description}, ${Math.round(temperature ?? 0)}°. The plan favours indoor stops and shorter outdoor stretches.`
        : `${weather.current.description}, ${Math.round(temperature ?? 0)}°. Conditions look suitable for this mix of stops.`
      : weatherLoading
        ? 'Weather is still loading. Refresh the plan in a moment for weather-aware ordering.'
        : 'Live weather is unavailable, so the plan uses commute, interests, and budget.';
    const budgetLabel =
      plannerBudget === 'free'
        ? 'low-cost'
        : plannerBudget === 'value'
          ? 'good-value'
          : 'flexible';

    setOutingPlan({
      headline: `${chosen.length}-stop ${budgetLabel} outing`,
      rationale: `Balanced for ${plannerGroupSize} ${plannerGroupSize === 1 ? 'person' : 'people'}, ${travelMode} commute, ratings, your interests, and route efficiency.`,
      weatherNote,
      estimatedCost: `About ₹${Math.max(0, Math.round(totalPerPerson / 50) * 50).toLocaleString('en-IN')} per person`,
      totalTime: `${totalHours} hr total · ${totalCommuteMinutes} min commuting`,
      stops,
    });
    postInteraction({
      eventType: 'plan_created',
      category: activeCategory === 'all' ? null : activeCategory,
      metadata: {
        budget: plannerBudget,
        duration: plannerDuration,
        groupSize: plannerGroupSize,
        stopIds: chosen.map((item) => item.place.id),
      },
    });
  }, [
    activeCategory,
    basePlaces,
    filteredPlaces,
    origin,
    plannerBudget,
    plannerDuration,
    plannerGroupSize,
    postInteraction,
    profile?.affinities,
    routeMatrixStats,
    selected.id,
    travelMode,
    weather,
    weatherLoading,
  ]);

  useEffect(() => {
    if (lastViewedId.current === selected.id) return;
    lastViewedId.current = selected.id;
    postInteraction({
      eventType: 'view',
      placeId: selected.id,
      placeName: selected.name,
      category: selected.category,
    });
  }, [postInteraction, selected.category, selected.id, selected.name]);

  useEffect(() => {
    const searchQuery = query.trim();
    if (searchQuery.length < 2) return;
    const timer = window.setTimeout(() => {
      postInteraction({
        eventType: 'search',
        searchQuery,
        category: activeCategory === 'all' ? null : activeCategory,
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [activeCategory, postInteraction, query]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const searchOrigins = async () => {
    const textQuery = originQuery.trim();
    if (textQuery.length < 3) {
      setLocationError('Enter a more specific starting address or place.');
      return;
    }
    if (!mapsKey) {
      setLocationError('Google Maps is still loading. Please try again.');
      return;
    }

    setOriginSearching(true);
    setOriginResults([]);
    setLocationError('');
    try {
      await loadGoogleMaps(mapsKey);
      const google = (window as any).google;
      const { Place } = await google.maps.importLibrary('places');
      const { places } = await Place.searchByText({
        textQuery,
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
        locationBias: DEFAULT_ORIGIN,
        maxResultCount: 6,
        language: 'en-IN',
        region: 'in',
      });
      const results: OriginResult[] = (places ?? [])
        .filter((place: any) => place.location)
        .map((place: any, index: number) => {
          const location = place.location;
          return {
            id: place.id ?? `origin-${index}`,
            label: place.displayName ?? place.formattedAddress ?? textQuery,
            address: place.formattedAddress ?? textQuery,
            coordinates: {
              lat:
                typeof location.lat === 'function'
                  ? location.lat()
                  : location.lat,
              lng:
                typeof location.lng === 'function'
                  ? location.lng()
                  : location.lng,
            },
          };
        });
      setOriginResults(results);
      if (!results.length) {
        setLocationError('No matching starting point was found.');
      }
    } catch {
      setLocationError('The starting point could not be searched right now.');
    } finally {
      setOriginSearching(false);
    }
  };

  const requestLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location is not supported in this browser.');
      return;
    }
    setOriginSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOriginSearching(false);
        applyOrigin(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          'Your current location',
        );
      },
      () => {
        setOriginSearching(false);
        setLocationError(
          'Location access was not granted. Search for your starting address instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const markVisited = () => {
    if (!profile?.googleConnected) {
      window.location.assign(appHref('login'));
      return;
    }
    postInteraction({
      eventType: 'visit',
      placeId: selected.id,
      placeName: selected.name,
      category: selected.category,
    });
    setVisitedIds((current) => new Set(current).add(selected.id));
    setToast(`${selected.name} added to your visits.`);
    window.setTimeout(() => void refreshProfile(), 450);
  };

  const openRapido = () => {
    window.open(
      'https://www.rapido.bike/Home?is_retargeting=true&pid=Roam_Website',
      '_blank',
      'noopener,noreferrer',
    );
    void navigator.clipboard?.writeText(
      `${selected.name}, ${selected.address}`,
    );
    postInteraction({
      eventType: 'ride_open',
      placeId: selected.id,
      placeName: selected.name,
      category: selected.category,
      metadata: { provider: 'Rapido' },
    });
    setToast('Destination copied. Paste it into Rapido to book your ride.');
  };

  const disconnectGoogle = async () => {
    if (IS_STATIC_PAGES) {
      disconnectStaticGoogle();
    } else {
      await fetch('/api/auth/google', { method: 'DELETE' });
    }
    setProfile(null);
    setProfileOpen(false);
    setToast('Signed out of Google. Your Roam history is still saved.');
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-3"
          aria-label="Roam home"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(25,72,62,.25)]">
            <MapPin size={20} strokeWidth={2.4} />
          </span>
          <span className="font-heading text-xl font-semibold tracking-[-0.03em]">
            Roam
          </span>
        </a>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            className={`h-10 rounded-full bg-card px-3.5 text-sm font-semibold shadow-sm ${originConfirmed ? '' : 'border-amber-300 text-amber-900'}`}
            onClick={() => setOriginDialogOpen(true)}
            aria-label={`Starting point: ${locationLabel}`}
          >
            <LocateFixed size={15} />
            <span className="hidden max-w-40 truncate sm:inline">
              {originConfirmed ? `Start: ${locationLabel}` : locationLabel}
            </span>
            <span className="sm:hidden">
              {originConfirmed ? 'Start' : 'Set start'}
            </span>
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-10 rounded-full px-3.5 text-sm font-semibold"
            onClick={() =>
              originConfirmed ? setPlannerOpen(true) : setOriginDialogOpen(true)
            }
          >
            <WandSparkles size={15} />
            <span className="hidden sm:inline">Plan my outing</span>
            <span className="sm:hidden">Plan</span>
          </Button>
          {profile?.googleConnected ? (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-2 pr-3 text-sm font-bold shadow-sm transition hover:bg-muted"
            >
              {profile.user.avatarUrl ? (
                <img
                  src={profile.user.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-xs text-primary">
                  {profile.user.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-28 truncate md:block">
                {profile.user.displayName.split(' ')[0]}
              </span>
            </button>
          ) : (
            <a
              href={appHref('login')}
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-bold shadow-sm transition hover:bg-muted"
            >
              <Sparkles size={15} />
              <span className="hidden md:inline">Personalize</span>
            </a>
          )}
        </div>
      </header>

      <section
        id="top"
        className="mx-auto max-w-[1540px] px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8"
      >
        <div className="mb-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary/70">
              <Sparkles size={13} /> Find your next favourite place
            </p>
            <h1 className="max-w-2xl font-heading text-[clamp(2.15rem,4vw,4rem)] font-semibold leading-[.98] tracking-[-0.055em]">
              What feels good today?
            </h1>
          </div>
          <label className="flex h-14 w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-[0_12px_34px_rgba(36,52,44,.08)] transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/8">
            <Search className="text-muted-foreground" size={20} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              placeholder="Search places or neighbourhoods"
              aria-label="Search places"
            />
            {query ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-muted"
                onClick={() => setQuery('')}
              >
                Clear
              </button>
            ) : (
              <kbd className="hidden rounded-lg bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground sm:block">
                ⌘ K
              </kbd>
            )}
          </label>
        </div>

        {profile?.googleConnected && recommendations.length > 0 && (
          <section
            className="mb-5 rounded-[22px] border border-primary/15 bg-secondary/65 p-3.5 sm:p-4"
            aria-label="Personalized recommendations"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary">
                  <Heart size={15} className="fill-primary/15" /> Recommended
                  for you
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Based on the kinds of places you explore and mark visited.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="shrink-0 text-xs font-bold text-primary hover:underline"
              >
                View history
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {recommendations.map((place) => (
                <button
                  type="button"
                  key={place.id}
                  onClick={() => {
                    setActiveCategory(place.category);
                    setSelectedId(place.id);
                  }}
                  className="group flex items-center gap-3 rounded-2xl bg-card p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <PlaceVisual
                    place={place}
                    className="h-14 w-16 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {place.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      More {categoryMeta[place.category].label.toLowerCase()}{' '}
                      picks
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <nav
            className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
            aria-label="Place categories"
          >
            {categories.map(({ id, label, icon: Icon }) => {
              const active = activeCategory === id;
              return (
                <Button
                  key={id}
                  variant={active ? 'default' : 'outline'}
                  size="lg"
                  className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${active ? 'shadow-[0_8px_20px_rgba(25,72,62,.16)]' : 'bg-card'}`}
                  onClick={() => setActiveCategory(id)}
                  aria-pressed={active}
                >
                  <Icon size={16} /> {label}
                </Button>
              );
            })}
          </nav>

          <div
            className="flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1"
            aria-label="Travel mode"
          >
            {travelModes.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                onClick={() => setTravelMode(id)}
                className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition sm:px-3 ${travelMode === id ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-pressed={travelMode === id}
                title={label}
              >
                <Icon size={14} />{' '}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {(locationError || mapsError) && (
          <div
            className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            <span>
              {mapsError
                ? `${mapsError} Showing the curated preview.`
                : locationError}
            </span>
          </div>
        )}

        <div className="grid overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_24px_70px_rgba(34,48,42,.10)] lg:h-[min(720px,calc(100vh-255px))] lg:min-h-[610px] lg:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
          <section
            className="flex min-h-0 flex-col border-border lg:border-r"
            aria-label="Places list"
          >
            <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
              <div>
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  {activeCategory === 'all'
                    ? 'Worth going to'
                    : categories.find((item) => item.id === activeCategory)
                        ?.label}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mapsKey && livePlaces
                    ? 'Live results from Google Maps'
                    : 'Curated around Central Delhi'}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                {liveLoading ? 'Finding…' : `${filteredPlaces.length} places`}
              </span>
            </div>

            <div className="place-list min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-4 sm:px-4">
              {filteredPlaces.length ? (
                filteredPlaces.map((place) => {
                  const trip = tripFor(place);
                  const active = place.id === selected.id;
                  const durationLabel = trip.isLive
                    ? trip.duration
                    : !originConfirmed
                      ? 'Set start'
                      : routeMatrixLoading
                        ? 'Calculating…'
                        : `~${trip.duration}`;
                  const distanceLabel = trip.isLive
                    ? trip.distance
                    : `~${trip.distance}`;
                  return (
                    <button
                      type="button"
                      key={place.id}
                      className={`group block w-full rounded-2xl border p-2.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${active ? 'border-primary/35 bg-accent shadow-[0_8px_28px_rgba(31,77,66,.08)]' : 'border-transparent bg-background/55 hover:border-border hover:bg-background'}`}
                      onClick={() => setSelectedId(place.id)}
                      aria-pressed={active}
                    >
                      <div className="flex gap-3">
                        <PlaceVisual
                          place={place}
                          className="h-[92px] w-[102px] shrink-0 rounded-xl sm:w-[112px]"
                        />
                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/65">
                                {place.categoryLabel}
                              </p>
                              <h3 className="mt-0.5 truncate text-[15px] font-bold tracking-[-0.015em]">
                                {place.name}
                              </h3>
                            </div>
                            <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[11px] font-extrabold text-primary shadow-sm">
                              {durationLabel}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            {place.rating && (
                              <>
                                <Star
                                  size={12}
                                  className="fill-[#e29b38] text-[#e29b38]"
                                />
                                <span className="font-bold text-foreground">
                                  {place.rating}
                                </span>
                                <span>
                                  ({formatReviews(place.reviewCount)})
                                </span>
                                <span>·</span>
                              </>
                            )}
                            <span>{place.price ?? 'Details'}</span>
                          </div>
                          <p className="mt-2 truncate text-xs font-semibold text-muted-foreground">
                            {distanceLabel} · {place.openLabel}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="grid min-h-64 place-items-center px-7 text-center">
                  <div>
                    <SearchX
                      className="mx-auto mb-3 text-muted-foreground"
                      size={30}
                    />
                    <h3 className="font-heading text-lg font-semibold">
                      No places found
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try a broader search or choose another category.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 rounded-full"
                      onClick={() => {
                        setQuery('');
                        setActiveCategory('all');
                      }}
                    >
                      Reset search
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section
            className="relative min-h-[540px] overflow-hidden bg-[#dce7dc] lg:min-h-0"
            aria-label="Map and selected place"
          >
            {mapsKey && !mapsError ? (
              <LiveGoogleMap
                apiKey={mapsKey}
                places={filteredPlaces.length ? filteredPlaces : [selected]}
                selected={selected}
                origin={origin}
                routeEnabled={originConfirmed}
                travelMode={travelMode}
                onSelect={selectPlace}
                onRouteStats={updateRouteStats}
                onError={reportMapError}
              />
            ) : (
              <iframe
                key={selected.id}
                title={`Google Maps location for ${selected.name}`}
                src={`https://www.google.com/maps?q=${selected.coordinates.lat},${selected.coordinates.lng}&z=13&output=embed`}
                className="absolute inset-0 h-full w-full border-0 saturate-[.78] contrast-[.94]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            )}

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/70 bg-white/94 px-3 py-2 text-xs font-bold text-[#274b42] shadow-lg backdrop-blur md:left-5 md:top-5">
              <span
                className={`h-2 w-2 rounded-full ${mapsKey && !mapsError ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              {mapsKey && !mapsError
                ? 'Live Google Maps'
                : 'Google Maps preview'}
            </div>

            {weatherConfigured &&
              (weatherLoading || weather || weatherError) && (
                <aside
                  className={`absolute right-4 z-10 hidden w-[210px] rounded-2xl border border-white/75 bg-[#fffdf8]/95 p-3 text-[#24483f] shadow-lg backdrop-blur sm:block md:right-5 ${mapsKey ? 'top-4 md:top-5' : 'top-16 md:top-[68px]'}`}
                  aria-label={`Weather at ${selected.name}`}
                >
                  {weatherLoading ? (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <CloudSun size={18} className="animate-pulse" /> Checking
                      weather…
                    </div>
                  ) : weather ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary/65">
                            Weather there
                          </p>
                          <p className="mt-0.5 text-2xl font-extrabold tracking-tight">
                            {Math.round(weather.current.temperature ?? 0)}°
                          </p>
                        </div>
                        <CloudSun size={24} />
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold">
                        {weather.current.description}
                      </p>
                      <div className="mt-2 flex gap-3 text-[10px] font-bold text-muted-foreground">
                        {weather.current.humidity !== undefined && (
                          <span className="flex items-center gap-1">
                            <Droplets size={11} /> {weather.current.humidity}%
                          </span>
                        )}
                        {weather.current.wind !== undefined && (
                          <span className="flex items-center gap-1">
                            <Wind size={11} />{' '}
                            {Math.round(weather.current.wind)} km/h
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1 border-t border-border/70 pt-2">
                        {weather.forecast.slice(0, 3).map((day, index) => (
                          <div
                            key={`${day.date?.day ?? index}`}
                            className="text-center text-[10px]"
                          >
                            <span className="block font-bold">
                              {formatWeatherDay(day.date)}
                            </span>
                            <span className="text-muted-foreground">
                              {Math.round(day.high ?? 0)}° /{' '}
                              {Math.round(day.low ?? 0)}°
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2 text-xs font-semibold text-muted-foreground">
                      <CloudSun size={18} className="mt-0.5 shrink-0" />
                      <span>{weatherError}</span>
                    </div>
                  )}
                </aside>
              )}

            <article className="absolute bottom-4 left-4 right-4 overflow-hidden rounded-[22px] border border-white/80 bg-[#fffdf8]/96 p-3 shadow-[0_18px_55px_rgba(26,56,48,.2)] backdrop-blur-xl md:bottom-5 md:left-5 md:right-auto md:w-[min(760px,calc(100%-40px))] md:p-4">
              <div className="flex gap-3.5">
                <PlaceVisual
                  place={selected}
                  className="hidden h-[112px] w-[130px] shrink-0 rounded-2xl sm:block"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary/65">
                        {selected.categoryLabel}
                      </p>
                      <h2 className="mt-0.5 truncate font-heading text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                        {selected.name}
                      </h2>
                    </div>
                    {selected.rating && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1.5 text-xs font-extrabold">
                        <Star
                          size={12}
                          className="fill-[#d9922f] text-[#d9922f]"
                        />{' '}
                        {selected.rating}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                    {selected.address}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1.5 text-xs font-bold text-primary">
                      <Clock size={13} /> {selectedDurationLabel}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 text-xs font-bold">
                      <RouteIcon size={13} /> {selectedDistanceLabel}
                    </span>
                    {selectedTrip.isLive && (
                      <span className="rounded-full bg-[#eaf3ed] px-2.5 py-1.5 text-xs font-bold text-[#28554a]">
                        Live traffic
                      </span>
                    )}
                    <span className="hidden rounded-full bg-muted px-2.5 py-1.5 text-xs font-bold sm:inline">
                      {selected.bestFor}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-[#eaf3ed] px-2.5 py-1.5 text-xs font-bold text-[#28554a] sm:hidden">
                      {weatherLoading ? (
                        <>
                          <LoaderCircle size={13} className="animate-spin" />
                          Weather
                        </>
                      ) : weather ? (
                        <>
                          <CloudSun size={13} />
                          {Math.round(weather.current.temperature ?? 0)}° ·{' '}
                          {weather.current.description}
                        </>
                      ) : (
                        <>
                          <CloudSun size={13} /> Weather unavailable
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <a
                  href={
                    selected.googleMapsUri ??
                    googleDirectionsUrl(
                      selected,
                      originConfirmed ? origin : null,
                      travelMode,
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="hidden h-11 shrink-0 items-center gap-1.5 self-end rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(24,73,62,.2)] transition hover:bg-primary/90 md:flex"
                >
                  Directions <ChevronRight size={15} />
                </a>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3 sm:mt-3">
                <p className="line-clamp-1 pr-3 text-xs text-muted-foreground">
                  {selected.description}
                </p>
                <a
                  href={
                    selected.googleMapsUri ??
                    googleDirectionsUrl(
                      selected,
                      originConfirmed ? origin : null,
                      travelMode,
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-primary hover:underline md:hidden"
                >
                  Directions <ExternalLink size={12} />
                </a>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={markVisited}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-extrabold text-primary transition hover:bg-muted"
                >
                  <Check size={13} />{' '}
                  {visitedIds.has(selected.id) ? 'Visited' : 'Mark visited'}
                </button>
                <a
                  href={uberRideUrl(selected, origin)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    postInteraction({
                      eventType: 'ride_open',
                      placeId: selected.id,
                      placeName: selected.name,
                      category: selected.category,
                      metadata: { provider: 'Uber' },
                    })
                  }
                  className="flex h-9 items-center gap-1.5 rounded-full bg-black px-3 text-xs font-extrabold text-white transition hover:bg-black/80"
                >
                  <Car size={13} /> Uber
                </a>
                <button
                  type="button"
                  onClick={openRapido}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-[#ffcc00] px-3 text-xs font-extrabold text-black transition hover:bg-[#f2c300]"
                >
                  <Bike size={13} /> Rapido
                </button>
                <span className="ml-auto hidden text-[10px] text-muted-foreground lg:inline">
                  Ride apps open with this destination
                </span>
              </div>
            </article>
          </section>
        </div>

        <div className="mt-4 flex flex-col justify-between gap-2 px-1 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            {mapsKey && livePlaces
              ? 'Place data and live routes provided by Google Maps.'
              : mapsKey
                ? 'Google Maps is active. Search any place or choose a category to refresh results.'
                : 'Loading Google Maps and live place data…'}
          </p>
          <div className="flex shrink-0 items-center gap-3 font-bold text-primary">
            <a href={appHref('privacy')} className="hover:underline">
              Privacy
            </a>
            <a href={appHref('terms')} className="hover:underline">
              Terms
            </a>
          </div>
        </div>
      </section>

      {toast && (
        <div
          className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#173f36] px-4 py-2.5 text-center text-xs font-bold text-white shadow-xl"
          role="status"
        >
          {toast}
        </div>
      )}

      <Dialog
        open={originDialogOpen}
        onOpenChange={(open) => {
          setOriginDialogOpen(open);
          if (open) setLocationError('');
        }}
      >
        <DialogContent className="max-w-[560px] gap-0 overflow-hidden rounded-[24px] p-0">
          <DialogHeader className="border-b border-border bg-secondary/55 p-6">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <LocateFixed size={21} />
            </div>
            <DialogTitle className="font-heading text-3xl font-semibold tracking-[-0.04em]">
              Set your starting point
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              Roam calculates distance and travel time from this exact place
              using live Google traffic. Your choice stays on this device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6">
            <Button
              variant="outline"
              size="lg"
              className="h-11 w-full rounded-xl font-bold"
              onClick={requestLocation}
              disabled={originSearching}
            >
              {originSearching ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Navigation size={16} />
              )}
              Use my current location
            </Button>

            <div className="flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or search an address
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void searchOrigins();
              }}
            >
              <label className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={originQuery}
                  onChange={(event) => setOriginQuery(event.target.value)}
                  placeholder="Home address or starting place"
                  aria-label="Starting address"
                  autoComplete="street-address"
                  className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                />
              </label>
              <Button
                type="submit"
                className="h-11 rounded-xl px-4 font-bold"
                disabled={originSearching}
              >
                {originSearching ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  'Find'
                )}
              </Button>
            </form>

            {locationError && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-950">
                {locationError}
              </p>
            )}

            {originResults.length > 0 && (
              <div className="space-y-2" aria-label="Starting point results">
                {originResults.map((result) => (
                  <button
                    type="button"
                    key={result.id}
                    className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/35 hover:bg-accent"
                    onClick={() =>
                      applyOrigin(result.coordinates, result.label)
                    }
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-primary">
                      <MapPin size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {result.label}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                        {result.address}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!originConfirmed && !originResults.length && !locationError && (
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Travel times stay hidden until you choose a start, so an
                estimate is never mistaken for a live ETA.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-[560px] gap-0 overflow-hidden rounded-[24px] p-0">
          <DialogHeader className="border-b border-border bg-secondary/55 p-6">
            <div className="mb-3 flex items-center gap-3">
              {profile?.user.avatarUrl ? (
                <img
                  src={profile.user.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {profile?.user.displayName.slice(0, 1).toUpperCase() ?? 'R'}
                </span>
              )}
              <div className="min-w-0">
                <DialogTitle className="truncate font-heading text-2xl font-semibold tracking-[-0.03em]">
                  {profile?.user.displayName ?? 'Your Roam profile'}
                </DialogTitle>
                <DialogDescription className="truncate">
                  {profile?.user.email}
                </DialogDescription>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Roam learns from searches, places you open, and visits you save to
              make discovery more personal.
            </p>
          </DialogHeader>
          <div className="max-h-[380px] overflow-y-auto px-6 py-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-extrabold">
              <History size={16} className="text-primary" /> Recent activity
            </div>
            {profile?.recent?.length ? (
              <div className="space-y-2">
                {profile.recent.slice(0, 12).map((item, index) => (
                  <div
                    key={`${item.occurred_at}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-muted/70 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {item.place_name ??
                          (item.search_query
                            ? `Searched “${item.search_query}”`
                            : 'Explored places')}
                      </p>
                      <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                        {item.event_type.replace('_', ' ')}
                        {item.category ? ` · ${item.category}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Intl.DateTimeFormat('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(Number(item.occurred_at)))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Explore a few places or mark one visited. Your recommendations
                will appear here and on the home page.
              </div>
            )}
          </div>
          <DialogFooter className="m-0 rounded-none border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              className="mr-auto text-muted-foreground"
              onClick={() => void disconnectGoogle()}
            >
              Sign out
            </Button>
            <Button onClick={() => setProfileOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={plannerOpen} onOpenChange={setPlannerOpen}>
        <DialogContent className="max-h-[88vh] max-w-[760px] gap-0 overflow-hidden rounded-[24px] p-0">
          <DialogHeader className="border-b border-border bg-secondary/55 p-6">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <BrainCircuit size={21} />
            </div>
            <DialogTitle className="font-heading text-3xl font-semibold tracking-[-0.04em]">
              Plan with Roam AI
            </DialogTitle>
            <DialogDescription className="max-w-2xl leading-relaxed">
              Roam weighs live weather, commute, your current place choices,
              ratings, past interests, time, and estimated spend to build a
              practical outing.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <Clock size={13} /> Time available
                </span>
                <select
                  value={plannerDuration}
                  onChange={(event) =>
                    setPlannerDuration(event.target.value as PlannerDuration)
                  }
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10"
                >
                  <option value="quick">2–3 hours</option>
                  <option value="half-day">Half day</option>
                  <option value="full-day">Full day</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <IndianRupee size={13} /> Budget
                </span>
                <select
                  value={plannerBudget}
                  onChange={(event) =>
                    setPlannerBudget(event.target.value as PlannerBudget)
                  }
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10"
                >
                  <option value="free">Keep it low-cost</option>
                  <option value="value">Good value</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <Users size={13} /> Group
                </span>
                <select
                  value={plannerGroupSize}
                  onChange={(event) =>
                    setPlannerGroupSize(Number(event.target.value))
                  }
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10"
                >
                  <option value={1}>Just me</option>
                  <option value={2}>2 people</option>
                  <option value={4}>3–4 people</option>
                  <option value={6}>5+ people</option>
                </select>
              </label>
            </div>

            <Button
              size="lg"
              className="mt-4 h-12 w-full rounded-xl text-sm font-extrabold"
              onClick={generateOutingPlan}
            >
              <WandSparkles size={17} /> Build my outing
            </Button>

            {outingPlan ? (
              <section className="mt-5" aria-live="polite">
                <div className="rounded-2xl border border-primary/15 bg-accent/65 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary/65">
                        Your recommended plan
                      </p>
                      <h3 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.03em]">
                        {outingPlan.headline}
                      </h3>
                      <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                        {outingPlan.rationale}
                      </p>
                    </div>
                    <div className="shrink-0 text-left text-xs sm:text-right">
                      <p className="font-extrabold text-primary">
                        {outingPlan.estimatedCost}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {outingPlan.totalTime}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-card/85 px-3 py-2.5 text-xs font-semibold leading-relaxed text-foreground">
                    <CloudSun
                      size={16}
                      className="mt-0.5 shrink-0 text-primary"
                    />
                    {outingPlan.weatherNote}
                  </p>
                </div>

                <div className="mt-3 space-y-2.5">
                  {outingPlan.stops.map((stop, index) => (
                    <article
                      key={stop.place.id}
                      className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                        {index + 1}
                      </span>
                      <PlaceVisual
                        place={stop.place}
                        className="hidden h-[82px] w-[96px] shrink-0 rounded-xl sm:block"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary/65">
                              {stop.arrival} · {stop.commute} commute
                            </p>
                            <h4 className="mt-0.5 font-bold">
                              {stop.place.name}
                            </h4>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                            Stay {stop.stay}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {stop.reason}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center">
                <BrainCircuit className="mx-auto text-primary/50" size={28} />
                <p className="mt-2 text-sm font-bold">Ready when you are</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your current category, selected place, travel mode, and live
                  weather will be included automatically.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="m-0 rounded-none border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setPlannerOpen(false)}>
              Close
            </Button>
            {outingPlan?.stops[0] && (
              <a
                href={
                  outingPlan.stops[0].place.googleMapsUri ??
                  googleDirectionsUrl(
                    outingPlan.stops[0].place,
                    originConfirmed ? origin : null,
                    travelMode,
                  )
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
              >
                Start this plan <Navigation size={14} />
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
