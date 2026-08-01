import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { createVideo, listVideos } from '@/lib/db'

/**
 * POST /api/admin/videos
 * Auth required. Creates a new video.
 *
 * Body: {
 *   title: string,
 *   description?: string,
 *   thumbnail_url?: string,
 *   download_url: string,
 *   file_size_mb?: number,
 *   category?: string,
 * }
 */
export async function POST(req: NextRequest) {
  const authed = await isAuthenticated()
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const download_url =
    typeof body.download_url === 'string' ? body.download_url.trim() : ''

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (!download_url) {
    return NextResponse.json(
      { error: 'Download URL is required' },
      { status: 400 },
    )
  }
  // Light validation — must look like an http(s) URL
  try {
    const u = new URL(download_url)
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('bad proto')
  } catch {
    return NextResponse.json(
      { error: 'Download URL must be a valid http(s) URL' },
      { status: 400 },
    )
  }

  const thumbnail_url =
    typeof body.thumbnail_url === 'string' && body.thumbnail_url.trim()
      ? body.thumbnail_url.trim()
      : null
  if (thumbnail_url) {
    try {
      const u = new URL(thumbnail_url)
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('bad proto')
    } catch {
      return NextResponse.json(
        { error: 'Thumbnail URL must be a valid http(s) URL' },
        { status: 400 },
      )
    }
  }

  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null

  const file_size_mb_raw = body.file_size_mb
  const file_size_mb =
    file_size_mb_raw === undefined || file_size_mb_raw === null || file_size_mb_raw === ''
      ? null
      : Number(file_size_mb_raw)
  if (file_size_mb !== null && (!Number.isFinite(file_size_mb) || file_size_mb < 0)) {
    return NextResponse.json(
      { error: 'File size must be a positive number' },
      { status: 400 },
    )
  }

  const category =
    typeof body.category === 'string' && body.category.trim()
      ? body.category.trim()
      : null

  try {
    const created = await createVideo({
      title,
      description,
      thumbnail_url,
      download_url,
      file_size_mb,
      category,
    })
    return NextResponse.json({ video: created }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/videos] failed:', err)
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/admin/videos
 * Auth required. Returns all videos for the admin dashboard.
 */
export async function GET() {
  const authed = await isAuthenticated()
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const videos = await listVideos()
  return NextResponse.json({ videos })
}
