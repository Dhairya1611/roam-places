import { env } from 'cloudflare:workers';

import { getDatabase } from '@/db';
import { verifyGoogleCredential } from '@/lib/google-identity';
import {
  clearedSessionCookie,
  createSessionToken,
  sessionCookie,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.SESSION_SECRET) {
    return Response.json(
      { error: 'Google sign-in is not configured yet.' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    credential?: unknown;
  } | null;
  if (typeof body?.credential !== 'string' || body.credential.length > 12000) {
    return Response.json(
      { error: 'A valid Google credential is required.' },
      { status: 400 },
    );
  }

  try {
    const googleUser = await verifyGoogleCredential(
      body.credential,
      env.GOOGLE_OAUTH_CLIENT_ID,
    );
    const userId = `google:${googleUser.sub}`;
    const now = Date.now();
    const db = getDatabase();
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
        userId,
        googleUser.email,
        googleUser.sub,
        googleUser.name,
        googleUser.picture,
        now,
      )
      .run();

    const token = await createSessionToken({
      userId,
      googleSub: googleUser.sub,
      email: googleUser.email,
      displayName: googleUser.name,
      avatarUrl: googleUser.picture,
    });

    return Response.json(
      {
        connected: true,
        user: {
          email: googleUser.email,
          displayName: googleUser.name,
          avatarUrl: googleUser.picture,
        },
      },
      { headers: { 'Set-Cookie': sessionCookie(token) } },
    );
  } catch {
    return Response.json(
      { error: 'Google could not verify this sign-in.' },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  return Response.json(
    { connected: false },
    { headers: { 'Set-Cookie': clearedSessionCookie() } },
  );
}
