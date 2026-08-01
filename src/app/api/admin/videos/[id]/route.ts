import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { deleteVideo, updateVideo } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

/**
 * PUT /api/admin/videos/[id]
 * Auth required. Updates an existing video.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const authed = await isAuthenticated()
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input: {
    title?: string
    description?: string | null
    thumbnail_url?: string | null
    download_url?: string
    file_size_mb?: number | null
    category?: string | null
  } = {}

  if (typeof body.title === 'string') {
    const t = body.title.trim()
    if (!t) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    }
    input.title = t
  }

  if (typeof body.download_url === 'string') {
    const u = body.download_url.trim()
    if (!u) {
      return NextResponse.json(
        { error: 'Download URL cannot be empty' },
        { status: 400 },
      )
    }
    try {
      const parsed = new URL(u)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad proto')
    } catch {
      return NextResponse.json(
        { error: 'Download URL must be a valid http(s) URL' },
        { status: 400 },
      )
    }
    input.download_url = u
  }

  if (body.description !== undefined) {
    input.description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null
  }

  if (body.thumbnail_url !== undefined) {
    const t =
      typeof body.thumbnail_url === 'string' ? body.thumbnail_url.trim() : ''
    if (t) {
      try {
        const parsed = new URL(t)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('bad proto')
        }
      } catch {
        return NextResponse.json(
          { error: 'Thumbnail URL must be a valid http(s) URL' },
          { status: 400 },
        )
      }
      input.thumbnail_url = t
    } else {
      input.thumbnail_url = null
    }
  }

  if (body.file_size_mb !== undefined) {
    const raw = body.file_size_mb
    if (raw === null || raw === '') {
      input.file_size_mb = null
    } else {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: 'File size must be a positive number' },
          { status: 400 },
        )
      }
      input.file_size_mb = n
    }
  }

  if (body.category !== undefined) {
    input.category =
      typeof body.category === 'string' && body.category.trim()
        ? body.category.trim()
        : null
  }

  try {
    const updated = await updateVideo(id, input)
    if (!updated) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    return NextResponse.json({ video: updated })
  } catch (err) {
    console.error('[PUT /api/admin/videos/:id] failed:', err)
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/admin/videos/[id]
 * Auth required. Deletes a video.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const authed = await isAuthenticated()
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  try {
    const ok = await deleteVideo(id)
    if (!ok) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/videos/:id] failed:', err)
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 },
    )
  }
}
