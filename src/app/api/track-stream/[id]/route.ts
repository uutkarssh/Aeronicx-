import { NextRequest, NextResponse } from 'next/server'
import { incrementStreams } from '@/lib/db'

/**
 * POST /api/track-stream/[id]
 * Public, fire-and-forget stream counter.
 * Called when the HTML5 video actually starts playing.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    await incrementStreams(id)
  } catch (err) {
    console.error('[POST /api/track-stream] failed for id=', id, err)
  }

  return NextResponse.json({ ok: true })
}
