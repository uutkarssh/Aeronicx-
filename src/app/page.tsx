'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Search, Download, Film, Zap, ShieldOff, Sparkles, Github, Loader2, Play, X, ExternalLink } from 'lucide-react'
import type { Video } from '@/lib/db'

export default function HomePage() {
  const [videos, setVideos] = useState<Video[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [watching, setWatching] = useState<Video | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/videos', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load')
        const data = (await res.json()) as { videos: Video[] }
        if (!cancelled) setVideos(data.videos ?? [])
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setVideos([])
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const trackDownload = useCallback((id: string) => {
    try {
      const payload = JSON.stringify({})
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        const queued = navigator.sendBeacon(`/api/track-download/${encodeURIComponent(id)}`, blob)
        if (queued) return
      }
      void fetch(`/api/track-download/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [])

  const openWatch = useCallback((video: Video) => {
    window.history.pushState({ aeronicxWatch: video.id }, '', window.location.href)
    setWatching(video)
  }, [])

  const closeWatch = useCallback(() => {
    if (window.history.state?.aeronicxWatch) window.history.back()
    else setWatching(null)
  }, [])

  useEffect(() => {
    const onPopState = () => setWatching(null)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!watching) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [watching])

  useEffect(() => {
    if (!watching) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeWatch()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [watching, closeWatch])

  const filtered = useMemo(() => {
    if (!videos) return null
    const q = query.trim().toLowerCase()
    if (!q) return videos
    return videos.filter((v) =>
      v.title.toLowerCase().includes(q) ||
      (v.description ?? '').toLowerCase().includes(q) ||
      (v.category ?? '').toLowerCase().includes(q),
    )
  }, [videos, query])

  return (
    <main className="min-h-screen flex flex-col relative">
      <div className="ambient-glow" aria-hidden="true" />
      <SiteHeader />

      <section className="relative z-10 px-4 sm:px-6 pt-6 sm:pt-10 pb-8 sm:pb-12 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-start gap-4 sm:gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs sm:text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span>One-click downloads. Watch online. No ads.</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            <span className="brand-wordmark">Aeronicx</span>
            <span className="block text-foreground mt-2">Fast. Free. No Ads.</span>
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Browse the catalog and either <span className="text-brand font-medium">Watch Online</span> instantly in your browser or tap <span className="text-brand font-medium">Download</span> to save the file locally.
          </p>

          <div className="w-full max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input type="search" inputMode="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, category, or description..." aria-label="Search videos" className="w-full rounded-xl bg-card border border-border pl-10 pr-4 py-3 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
            <FeatureBadge icon={<Zap className="h-3.5 w-3.5" />} label="Instant downloads" />
            <FeatureBadge icon={<Play className="h-3.5 w-3.5" />} label="Watch online" />
            <FeatureBadge icon={<ShieldOff className="h-3.5 w-3.5" />} label="No ad walls" />
            <FeatureBadge icon={<Github className="h-3.5 w-3.5" />} label="GitHub-backed storage" />
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 sm:px-6 pb-12 sm:pb-16 max-w-7xl mx-auto w-full flex-1">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Catalog</h2>
          {filtered && <span className="text-xs sm:text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'video' : 'videos'}</span>}
        </div>

        {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm">Failed to load videos: {error}</div>}
        {videos === null ? <SkeletonGrid /> : filtered && filtered.length === 0 ? <EmptyState query={query} hasVideos={videos.length > 0} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered?.map((v) => <VideoCard key={v.id} video={v} onDownload={trackDownload} onWatch={openWatch} />)}
          </div>
        )}
      </section>

      <SiteFooter />
      {watching && <WatchModal video={watching} onClose={closeWatch} />}
    </main>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group" aria-label="Aeronicx home">
          <Image src="/aeronicx-logo.png" alt="Aeronicx logo" width={32} height={32} priority className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-display text-lg sm:text-xl font-semibold brand-wordmark">Aeronicx</span>
        </a>
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground"><span className="inline-block h-1.5 w-1.5 rounded-full bg-brand animate-pulse" /><span>Operational</span></div>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-border bg-background">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2"><span className="font-display font-semibold text-foreground">Aeronicx</span><span>·</span><span>Fast. Free. No Ads.</span></div>
        <div className="flex items-center gap-4"><span>Powered by GitHub Release assets</span></div>
      </div>
    </footer>
  )
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground"><span className="text-brand">{icon}</span>{label}</span>
}

function VideoCard({ video, onDownload, onWatch }: { video: Video; onDownload: (id: string) => void; onWatch: (video: Video) => void }) {
  const thumb = video.thumbnail_url
  const sizeLabel = formatSize(video.file_size_mb)
  const dateLabel = formatDate(video.created_at)

  return (
    <article className="card-glow group rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumb ? <Image src={thumb} alt={video.title} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" onError={(e) => { const el = e.currentTarget as HTMLImageElement; el.style.display = 'none'; const fallback = el.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.display = 'grid' }} /> : null}
        <div className="absolute inset-0 grid place-items-center text-muted-foreground" style={thumb ? { display: 'none' } : { display: 'grid' }} aria-hidden="true"><Film className="h-8 w-8 opacity-50" /></div>
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {video.category && <span className="rounded-md bg-background/90 text-foreground border border-border px-2 py-0.5 text-[10px] sm:text-xs font-medium">{video.category}</span>}
          {video.is_pinned && <span className="rounded-md bg-background/90 text-brand border border-brand/40 px-2 py-0.5 text-[10px] sm:text-xs font-semibold">Pinned</span>}
        </div>
        {sizeLabel && <div className="absolute top-2 right-2"><span className="rounded-md bg-background/90 text-foreground border border-border px-2 py-0.5 text-[10px] sm:text-xs font-medium">{sizeLabel}</span></div>}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
        <h3 className="font-display text-base sm:text-lg font-semibold leading-snug line-clamp-2">{video.title}</h3>
        {video.description && <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{video.description}</p>}
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex flex-col gap-0.5 min-w-0"><span className="inline-flex items-center gap-1.5"><Download className="h-3 w-3" />{video.downloads.toLocaleString()} downloads</span><span className="text-[10px] opacity-70">{dateLabel}</span></div>
            {video.streams > 0 && <span className="inline-flex items-center gap-1.5 shrink-0"><Play className="h-3 w-3" />{video.streams.toLocaleString()} streams</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onWatch(video)} className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold min-h-[44px] whitespace-nowrap border border-brand text-brand bg-brand/5 hover:bg-brand/10 transition" aria-label={`Watch ${video.title} online`}>
              <Play className="h-4 w-4 fill-current" /><span>Watch Online</span>
            </button>
            <a href={video.download_url} rel="noopener" onClick={() => onDownload(video.id)} className="btn-download inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold min-h-[44px] whitespace-nowrap" aria-label={`Download ${video.title}`}>
              <Download className="h-4 w-4" /><span>Download</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}

function WatchModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const counted = useRef(false)

  const trackStream = useCallback(() => {
    if (counted.current) return
    counted.current = true
    try {
      const payload = JSON.stringify({})
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        const queued = navigator.sendBeacon(`/api/track-stream/${encodeURIComponent(video.id)}`, blob)
        if (queued) return
      }
      void fetch(`/api/track-stream/${encodeURIComponent(video.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
    } catch {}
  }, [video.id])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80" role="dialog" aria-modal="true" aria-labelledby="watch-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-4xl max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-48px)] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-5 py-3">
          <div className="min-w-0"><h2 id="watch-title" className="font-display font-semibold text-sm sm:text-base truncate">{video.title}</h2><p className="text-[10px] sm:text-xs text-muted-foreground">Watch online</p></div>
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border hover:border-brand hover:text-brand shrink-0" aria-label="Close video player"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-3 sm:p-5">
          <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
            {loading && !failed && <div className="absolute inset-0 z-10 grid place-items-center bg-black/40"><Loader2 className="h-7 w-7 text-brand animate-spin" aria-label="Loading video" /></div>}
            {failed ? (
              <div className="absolute inset-0 grid place-items-center p-6 text-center"><div><Film className="h-8 w-8 mx-auto mb-3 text-muted-foreground" /><p className="text-sm font-medium">This video could not be played in the browser.</p><p className="text-xs text-muted-foreground mt-1">You can use the download button below instead.</p></div></div>
            ) : (
              <video controls playsInline preload="metadata" autoPlay className="h-full w-full object-contain bg-black" src={video.download_url} onLoadedMetadata={() => setLoading(false)} onCanPlay={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true) }} onPlay={trackStream}>Your browser does not support the video tag.</video>
            )}
          </div>

          <div className="mt-4 sm:mt-5 flex flex-col gap-3">
            {video.description && <p className="text-sm text-muted-foreground leading-relaxed">{video.description}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <a href={video.download_url} rel="noopener" className="btn-download inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px]"><Download className="h-4 w-4" />Download instead</a>
              <a href={video.download_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium min-h-[44px] hover:border-brand hover:text-brand"><ExternalLink className="h-4 w-4" />Open source</a>
              <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium min-h-[44px] hover:border-brand sm:ml-auto"><X className="h-4 w-4" />Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden"><div className="aspect-video skeleton-shimmer" /><div className="p-5 flex flex-col gap-3"><div className="h-5 w-3/4 rounded skeleton-shimmer" /><div className="h-4 w-full rounded skeleton-shimmer" /><div className="h-4 w-2/3 rounded skeleton-shimmer" /><div className="mt-2 flex items-center justify-between"><div className="h-3 w-20 rounded skeleton-shimmer" /><div className="h-9 w-24 rounded-xl skeleton-shimmer" /></div></div></div>)}</div>
}

function EmptyState({ query, hasVideos }: { query: string; hasVideos: boolean }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 sm:p-16 text-center"><div className="mx-auto mb-4 grid place-items-center h-12 w-12 rounded-xl bg-muted text-muted-foreground">{hasVideos ? <Search className="h-5 w-5" /> : <Loader2 className="h-5 w-5" />}</div><h3 className="font-display text-xl font-semibold mb-2">{hasVideos ? 'No matches found' : 'No videos yet'}</h3><p className="text-sm text-muted-foreground max-w-md mx-auto">{hasVideos ? `Nothing matches "${query}". Try a different keyword.` : 'The admin hasn\'t added any videos yet. Check back soon.'}</p></div>
}

function formatSize(mb: number | null | undefined): string | null {
  if (mb == null || !Number.isFinite(mb)) return null
  if (mb < 1) return `${Math.round(mb * 1024)} KB`
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function formatDate(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
