import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

/**
 * GET /api/admin/me
 * Returns whether the current request is authenticated as admin.
 * Used by the /admin page to decide whether to show the password form or the dashboard.
 */
export async function GET() {
  const authed = await isAuthenticated()
  return NextResponse.json({ authenticated: authed })
}
