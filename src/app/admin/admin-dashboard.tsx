'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  X,
  Download,
  Film,
  ExternalLink,
} from 'lucide-react'
import type { Video } from '@/lib/db'
import { useToast } from '@/hooks/use-toast'

type FormState = {
  title: string
  description: string
  thumbnail_url: string
  download_url: string
  file_size_mb: string
  category: string
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  thumbnail_url: '',
  download_url: '',
  file_size_mb: '',
  category: '',
}

export function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()

  const [videos, setVideos] = useState<Video[] | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/videos', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as { videos: Video[] }
      setVideos(data.videos ?? [])
    } catch (e) {
      setVideos([])
      toast({
        title: 'Failed to load videos',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }, [toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function startEdit(v: Video) {
    setEditingId(v.id)
    setForm({
      title: v.title,
      description: v.description ?? '',
      thumbnail_url: v.thumbnail_url ?? '',
      download_url: v.download_url,
      file_size_mb: v.file_size_mb != null ? String(v.file_size_mb) : '',
      category: v.category ?? '',
    })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    if (!form.download_url.trim()) {
      toast({ title: 'Download URL is required', variant: 'destructive' })
      return
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      download_url: form.download_url.trim(),
      file_size_mb: form.file_size_mb.trim() === '' ? null : Number(form.file_size_mb),
      category: form.category.trim() || null,
    }

    setSubmitting(true)
    try {
      const url = editingId
        ? `/api/admin/videos/${encodeURIComponent(editingId)}`
        : '/api/admin/videos'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }
      toast({
        title: editingId ? 'Video updated' : 'Video added',
        description: `"${payload.title}" is now live on the homepage.`,
      })
      resetForm()
      await refresh()
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/videos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }
      toast({ title: 'Video deleted', description: `"${title}" removed.` })
      if (editingId === id) resetForm()
      await refresh()
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {
      /* ignore */
    }
    router.refresh()
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-brand text-brand-foreground shadow-[0_0_20px_-4px_var(--brand-glow)]">
              <Film className="h-4 w-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base sm:text-lg font-semibold brand-wordmark">
                Aeronicx Admin
              </span>
              <span className="text-[10px] text-muted-foreground">Signed in</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition px-3 py-2 rounded-lg hover:bg-card"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View site</span>
            </a>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-foreground bg-card border border-border hover:border-brand px-3 py-2 rounded-lg transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 sm:gap-8">
        {/* Add/Edit form */}
        <section className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg sm:text-xl font-semibold">
                {editingId ? 'Edit video' : 'Add new video'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Title" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. How to deploy Next.js on Vercel"
                  className={inputCls}
                  required
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short summary shown under the title on the card."
                  rows={3}
                  className={`${inputCls} resize-y min-h-[80px]`}
                />
              </Field>

              <Field label="Thumbnail URL" hint="Direct image URL (https)">
                <input
                  type="url"
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                  className={inputCls}
                />
              </Field>

              <Field label="GitHub Download URL" required hint="Direct asset URL from a GitHub Release">
                <input
                  type="url"
                  value={form.download_url}
                  onChange={(e) => setForm({ ...form, download_url: e.target.value })}
                  placeholder="https://github.com/user/repo/releases/download/v1/file.mp4"
                  className={inputCls}
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="File size (MB)" hint="Optional">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.file_size_mb}
                    onChange={(e) => setForm({ ...form, file_size_mb: e.target.value })}
                    placeholder="e.g. 450"
                    className={inputCls}
                  />
                </Field>
                <Field label="Category" hint="Optional">
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Tutorial"
                    className={inputCls}
                  />
                </Field>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-download inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingId ? 'Saving...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingId ? 'Save changes' : 'Add video'}
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Existing videos table */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-lg sm:text-xl font-semibold">
              Existing videos
            </h2>
            {videos && (
              <span className="text-xs text-muted-foreground">
                {videos.length} total
              </span>
            )}
          </div>

          {videos === null ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3" />
              Loading...
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No videos yet. Use the form to add your first one.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Title</th>
                      <th className="text-left font-medium px-4 py-3">Category</th>
                      <th className="text-right font-medium px-4 py-3">Size</th>
                      <th className="text-right font-medium px-4 py-3">Downloads</th>
                      <th className="text-right font-medium px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((v) => (
                      <tr
                        key={v.id}
                        className={`border-t border-border hover:bg-muted/30 transition ${
                          editingId === v.id ? 'bg-brand/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-14 rounded bg-muted overflow-hidden flex-shrink-0 grid place-items-center text-muted-foreground">
                              {v.thumbnail_url ? (
                                 
                                <img
                                  src={v.thumbnail_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    const el = e.currentTarget as HTMLImageElement
                                    el.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <Film className="h-4 w-4 opacity-50" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate max-w-[260px]">
                                {v.title}
                              </div>
                              <a
                                href={v.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-muted-foreground hover:text-brand inline-flex items-center gap-0.5 mt-0.5"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                Open asset
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {v.category || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {v.file_size_mb != null ? `${v.file_size_mb} MB` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          <span className="inline-flex items-center gap-1 justify-end">
                            <Download className="h-3 w-3" />
                            {v.downloads.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => startEdit(v)}
                              disabled={editingId === v.id}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-card border border-transparent hover:border-border transition disabled:opacity-50"
                              aria-label={`Edit ${v.title}`}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id, v.title)}
                              disabled={deletingId === v.id}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/30 transition disabled:opacity-50"
                              aria-label={`Delete ${v.title}`}
                              title="Delete"
                            >
                              {deletingId === v.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="md:hidden divide-y divide-border">
                {videos.map((v) => (
                  <li key={v.id} className={`p-4 ${editingId === v.id ? 'bg-brand/5' : ''}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0 grid place-items-center text-muted-foreground">
                        {v.thumbnail_url ? (
                           
                          <img
                            src={v.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement
                              el.style.display = 'none'
                            }}
                          />
                        ) : (
                          <Film className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-foreground line-clamp-2">
                          {v.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {v.category || 'Uncategorized'} ·{' '}
                          {v.file_size_mb != null ? `${v.file_size_mb} MB` : 'Unknown size'} ·{' '}
                          {v.downloads.toLocaleString()} downloads
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(v)}
                        disabled={editingId === v.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-card border border-border hover:border-brand text-xs font-medium transition disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v.id, v.title)}
                        disabled={deletingId === v.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border hover:border-destructive/40 hover:text-destructive text-xs font-medium transition disabled:opacity-50"
                      >
                        {deletingId === v.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Form helpers                                                         */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition'

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="text-brand ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
