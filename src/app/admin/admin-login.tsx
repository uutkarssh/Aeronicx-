'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Lock, ArrowLeft } from 'lucide-react'

export function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!password) {
      setError('Password is required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 401) {
        setError('Invalid password')
        setLoading(false)
        return
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? 'Login failed')
        setLoading(false)
        return
      }
      // Refresh server component to render dashboard
      router.refresh()
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Aeronicx
        </a>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[0_0_60px_-20px_var(--brand-glow)]">
          <div className="flex items-center gap-3 mb-6">
            <Image
              src="/aeronicx-logo.png"
              alt="Aeronicx logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover"
            />
            <div>
              <h1 className="font-display text-lg font-semibold brand-wordmark">
                Aeronicx Admin
              </h1>
              <p className="text-xs text-muted-foreground">Restricted area</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Enter admin password"
                  className="w-full rounded-xl bg-background border border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive px-3 py-2 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-download inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground leading-relaxed">
          Access is restricted. Each login attempt is rate-limited server-side.
          <br />
          Sessions expire after 7 days of inactivity.
        </p>
      </div>
    </main>
  )
}
