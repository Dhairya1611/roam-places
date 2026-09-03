import { getDatabase } from '@/db';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const identity = await getSessionUser(request);
  if (!identity) {
    return Response.json(
      { signedIn: false, googleConnected: false, recent: [], affinities: [] },
      { status: 401 },
    );
  }

  try {
    const db = getDatabase();
    const now = Date.now();
    await db
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
      )
      .run();

    const [profile, recentResult, affinityResult] = await Promise.all([
      db
        .prepare(
          `SELECT google_email, display_name, avatar_url, created_at
           FROM users WHERE user_id = ?1`,
        )
        .bind(identity.userId)
        .first<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT event_type, place_id, place_name, category, search_query, occurred_at
           FROM interactions WHERE user_id = ?1
           ORDER BY occurred_at DESC LIMIT 24`,
        )
        .bind(identity.userId)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT category, COUNT(*) AS score
           FROM interactions
           WHERE user_id = ?1 AND category IS NOT NULL
           GROUP BY category ORDER BY score DESC LIMIT 6`,
        )
        .bind(identity.userId)
        .all<Record<string, unknown>>(),
    ]);

    return Response.json({
      signedIn: true,
      googleConnected: true,
      user: {
        email: profile?.google_email ?? identity.email,
        displayName: profile?.display_name ?? identity.displayName,
        avatarUrl: profile?.avatar_url ?? identity.avatarUrl,
      },
      recent: recentResult.results,
      affinities: affinityResult.results,
    });
  } catch {
    return Response.json(
      {
        signedIn: true,
        googleConnected: true,
        user: {
          email: identity.email,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
        },
        recent: [],
        affinities: [],
        databasePending: true,
      },
      { status: 503 },
    );
  }
}
