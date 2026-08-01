import { NextRequest, NextResponse } from 'next/server'
import { incrementDownloads } from '@/lib/db'

/**
 * POST /api/track-download/[id]
 * Public, no auth. Increments the download counter for a video.
 *
 * Called fire-and-forget from the homepage download anchor's onClick handler.
 * Must respond fast — the client does NOT await this before the anchor's native
 * navigation fires (it's a plain `<a href>` so the browser handles the download).
 *
 * Returns 200 even if the id doesn't exist (so the client never blocks the download
 * UX on a server-side bookkeeping error).
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  try {
    await incrementDownloads(id)
  } catch (err) {
    // Log but don't fail the client — this is fire-and-forget
    console.error('[POST /api/track-download] failed for id=', id, err)
  }
  return NextResponse.json({ ok: true })
}
