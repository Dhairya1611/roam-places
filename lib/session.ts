import { env } from 'cloudflare:workers';
import { jwtVerify, SignJWT } from 'jose';

const COOKIE_NAME = 'roam_session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type SessionUser = {
  userId: string;
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

function secretKey() {
  if (!env.SESSION_SECRET) throw new Error('Session secret is not configured.');
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    googleSub: user.googleSub,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.userId)
    .setIssuer('roam')
    .setAudience('roam-site')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey());
}

export async function getSessionUser(
  request: Request,
): Promise<SessionUser | null> {
  const cookie = request.headers.get('cookie') ?? '';
  const token = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'roam',
      audience: 'roam-site',
      algorithms: ['HS256'],
    });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.googleSub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.displayName !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      googleSub: payload.googleSub,
      email: payload.email,
      displayName: payload.displayName,
      avatarUrl:
        typeof payload.avatarUrl === 'string' ? payload.avatarUrl : null,
    };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${THIRTY_DAYS}`;
}

export function clearedSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
