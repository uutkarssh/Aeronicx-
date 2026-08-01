import { cookies } from 'next/headers'
import crypto from 'node:crypto'

/**
 * Minimal password-gate auth for /admin.
 *
 * - Login: POST /api/admin/login with { password } -> compare against ADMIN_PASSWORD env,
 *   then set a signed HttpOnly cookie `aeronicx_admin_session`.
 * - Verification: read cookie, split `payload.signature`, recompute HMAC with SESSION_SECRET,
 *   ensure payload.exp is in the future.
 * - No third-party auth library, no DB-backed session table — just a signed cookie.
 */

const COOKIE_NAME = 'aeronicx_admin_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return s
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/** Create a signed session token: `base64(payload).signature` */
export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS
  const payload = JSON.stringify({ exp, sub: 'admin' })
  const b64 = Buffer.from(payload, 'utf8').toString('base64url')
  const sig = sign(b64, getSecret())
  return `${b64}.${sig}`
}

/** Verify a signed session token. Returns true if valid and not expired. */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [b64, sig] = parts
  const expected = sign(b64, getSecret())

  // Constant-time compare
  if (sig.length !== expected.length) return false
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return false
    }
  } catch {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as {
      exp?: number
      sub?: string
    }
    if (payload.sub !== 'admin') return false
    if (typeof payload.exp !== 'number') return false
    if (Date.now() > payload.exp) return false
    return true
  } catch {
    return false
  }
}

export const SESSION_COOKIE = COOKIE_NAME
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000)

/** Server-side helper: is the current request authenticated as admin? */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return verifySessionToken(token)
}

/** Set the session cookie on the response. */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

/** Clear the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Check ADMIN_PASSWORD env against a candidate. */
export function verifyPassword(candidate: string): boolean {
  const real = process.env.ADMIN_PASSWORD
  if (!real) return false
  if (candidate.length !== real.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(real))
  } catch {
    return false
  }
}
