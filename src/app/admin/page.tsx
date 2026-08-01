import { isAuthenticated } from '@/lib/auth'
import { AdminLogin } from './admin-login'
import { AdminDashboard } from './admin-dashboard'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/**
 * /admin — password-protected admin page.
 * Server-side auth check: if the session cookie is valid, render the dashboard.
 * Otherwise render the password form.
 *
 * The actual CRUD operations happen via /api/admin/* routes, which re-check
 * the session cookie server-side. So even if someone tampers with the client,
 * the API still enforces auth.
 */
export default async function AdminPage() {
  const authed = await isAuthenticated()
  return authed ? <AdminDashboard /> : <AdminLogin />
}
