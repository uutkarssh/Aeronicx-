import { createClient, type Client } from '@libsql/client'

/**
 * Turso (libSQL) database client.
 *
 * We use @libsql/client directly (instead of Prisma) for the Aeronicx runtime:
 * - single-table schema, no relations
 * - simpler/more reliable than the Prisma libSQL adapter in serverless
 * - matches the user's build prompt: "@libsql/client directly if simpler for a single table"
 *
 * The Prisma schema in prisma/schema.prisma is kept for reference / future use.
 */

const globalForDb = globalThis as unknown as {
  libsqlClient: Client | undefined
}

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error('TURSO_DATABASE_URL (or DATABASE_URL) is not set')
  }

  return createClient({ url, authToken })
}

export const db = globalForDb.libsqlClient ?? createDbClient()

if (process.env.NODE_ENV !== 'production') globalForDb.libsqlClient = db

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Video {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  download_url: string
  file_size_mb: number | null
  category: string | null
  downloads: number
  created_at: string
  updated_at: string
}

export interface VideoInput {
  title: string
  description?: string | null
  thumbnail_url?: string | null
  download_url: string
  file_size_mb?: number | null
  category?: string | null
}

// ---------------------------------------------------------------------------
// Helpers — map a libsql row (which can be array-like or object-like) to a Video
// ---------------------------------------------------------------------------

function rowToVideo(row: Record<string, unknown>): Video {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    thumbnail_url: row.thumbnail_url == null ? null : String(row.thumbnail_url),
    download_url: String(row.download_url),
    file_size_mb: row.file_size_mb == null ? null : Number(row.file_size_mb),
    category: row.category == null ? null : String(row.category),
    downloads: row.downloads == null ? 0 : Number(row.downloads),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

// ---------------------------------------------------------------------------
// Video repository
// ---------------------------------------------------------------------------

export async function listVideos(): Promise<Video[]> {
  const res = await db.execute(
    `SELECT * FROM videos ORDER BY datetime(created_at) DESC, id DESC;`,
  )
  return res.rows.map((r) => rowToVideo(r as unknown as Record<string, unknown>))
}

export async function getVideo(id: string): Promise<Video | null> {
  const res = await db.execute({ sql: `SELECT * FROM videos WHERE id = ?;`, args: [id] })
  if (res.rows.length === 0) return null
  return rowToVideo(res.rows[0] as unknown as Record<string, unknown>)
}

export async function createVideo(input: VideoInput): Promise<Video> {
  const id = makeId()
  await db.execute({
    sql: `INSERT INTO videos (id, title, description, thumbnail_url, download_url, file_size_mb, category, downloads)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
    args: [
      id,
      input.title,
      input.description ?? null,
      input.thumbnail_url ?? null,
      input.download_url,
      input.file_size_mb ?? null,
      input.category ?? null,
    ],
  })
  const created = await getVideo(id)
  if (!created) throw new Error('Failed to read back created video')
  return created
}

export async function updateVideo(
  id: string,
  input: Partial<VideoInput>,
): Promise<Video | null> {
  const existing = await getVideo(id)
  if (!existing) return null

  const merged: VideoInput = {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    thumbnail_url: input.thumbnail_url ?? existing.thumbnail_url,
    download_url: input.download_url ?? existing.download_url,
    file_size_mb: input.file_size_mb ?? existing.file_size_mb,
    category: input.category ?? existing.category,
  }

  await db.execute({
    sql: `UPDATE videos
          SET title = ?, description = ?, thumbnail_url = ?, download_url = ?, file_size_mb = ?, category = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?;`,
    args: [
      merged.title,
      merged.description ?? null,
      merged.thumbnail_url ?? null,
      merged.download_url,
      merged.file_size_mb ?? null,
      merged.category ?? null,
      id,
    ],
  })
  return getVideo(id)
}

export async function deleteVideo(id: string): Promise<boolean> {
  const res = await db.execute({ sql: `DELETE FROM videos WHERE id = ?;`, args: [id] })
  return (res.rowsAffected ?? 0) > 0
}

export async function incrementDownloads(id: string): Promise<void> {
  await db.execute({
    sql: `UPDATE videos SET downloads = downloads + 1 WHERE id = ?;`,
    args: [id],
  })
}

// ---------------------------------------------------------------------------
// CUID-like id generator (sufficient for our purposes; no extra dep needed)
// ---------------------------------------------------------------------------

function makeId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `vid_${ts}_${rand}`
}
