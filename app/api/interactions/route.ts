import { getDatabase } from '@/db';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const allowedEvents = new Set(['search', 'view', 'visit', 'ride_open']);

export async function POST(request: Request) {
  const identity = await getSessionUser(request);
  if (!identity)
    return Response.json(
      { error: 'Google sign-in is required.' },
      { status: 401 },
    );

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const eventType = typeof body?.eventType === 'string' ? body.eventType : '';
  if (!allowedEvents.has(eventType)) {
    return Response.json(
      { error: 'Invalid interaction type.' },
      { status: 400 },
    );
  }

  const text = (value: unknown, max = 180) =>
    typeof value === 'string' && value.trim()
      ? value.trim().slice(0, max)
      : null;
  const now = Date.now();

  try {
    const db = getDatabase();
    await db.batch([
      db
        .prepare(
          `INSERT INTO users
           (user_id, platform_email, google_sub, google_email, display_name, avatar_url, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?2, ?4, ?5, ?6, ?6)
           ON CONFLICT(user_id) DO UPDATE SET
             platform_email = excluded.platform_email,
             google_sub = excluded.google_sub,
             google_email = excluded.google_email,
             display_name = excluded.display_name,
             avatar_url = excluded.avatar_url,
             updated_at = excluded.updated_at`,
        )
        .bind(
          identity.userId,
          identity.email,
          identity.googleSub,
          identity.displayName,
          identity.avatarUrl,
          now,
        ),
      db
        .prepare(
          `INSERT INTO interactions
           (user_id, event_type, place_id, place_name, category, search_query, metadata, occurred_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        )
        .bind(
          identity.userId,
          eventType,
          text(body?.placeId),
          text(body?.placeName),
          text(body?.category, 48),
          text(body?.searchQuery),
          body?.metadata ? JSON.stringify(body.metadata).slice(0, 1000) : null,
          now,
        ),
    ]);
    return Response.json({ saved: true });
  } catch {
    return Response.json(
      { error: 'History could not be saved yet.' },
      { status: 503 },
    );
  }
}
