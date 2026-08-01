import { NextResponse } from 'next/server'
import { listVideos } from '@/lib/db'

/**
 * GET /api/videos — public, returns the full video list, newest first.
 * Called by the homepage. Cheap query; safe to call on every page load.
 */
export async function GET() {
  try {
    const videos = await listVideos()
    return NextResponse.json({ videos })
  } catch (err) {
    console.error('[GET /api/videos] failed:', err)
    return NextResponse.json(
      { error: 'Failed to load videos' },
      { status: 500 },
    )
  }
}
