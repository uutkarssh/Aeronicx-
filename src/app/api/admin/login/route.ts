import { NextRequest, NextResponse } from 'next/server'
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth'

/**
 * POST /api/admin/login
 * Body: { password: string }
 * - On success: sets the `aeronicx_admin_session` HttpOnly cookie and returns 200.
 * - On failure: returns 401 with a generic error message.
 */
export async function POST(req: NextRequest) {
  let password: string | undefined
  try {
    const body = await req.json()
    password = typeof body?.password === 'string' ? body.password : undefined
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    )
  }

  if (!password) {
    return NextResponse.json(
      { error: 'Password is required' },
      { status: 400 },
    )
  }

  if (!verifyPassword(password)) {
    // Sleep briefly to slow down brute force attempts (best-effort)
    await new Promise((r) => setTimeout(r, 250))
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 },
    )
  }

  const token = createSessionToken()
  await setSessionCookie(token)
  return NextResponse.json({ ok: true })
}
