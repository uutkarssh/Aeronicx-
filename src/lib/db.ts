import { createClient, type Client } from '@libsql/client'

const globalForDb = globalThis as unknown as {
  libsqlClient: Client | undefined
  schemaReady: Promise<void> | undefined
}

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) throw new Error('TURSO_DATABASE_URL (or DATABASE_URL) is not set')
  return createClient({ url, authToken })
}

export const db = globalForDb.libsqlClient ?? createDbClient()
if (process.env.NODE_ENV !== 'production') globalForDb.libsqlClient = db

export interface Video {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  download_url: string
  file_size_mb: number | null
  category: string | null
  downloads: number
  is_pinned: boolean
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
  is_pinned?: boolean
}

async function ensureSchema(): Promise<void> {
  if (!globalForDb.schemaReady) {
    globalForDb.schemaReady = db.execute(
      `ALTER TABLE videos ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;`,
    ).then(() => undefined).catch(async (error) => {
      const message = String(error?.message ?? error)
      if (!message.toLowerCase().includes('duplicate column')) throw error
    })
  }
  return globalForDb.schemaReady
}

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
    is_pinned: Boolean(Number(row.is_pinned ?? 0)),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function listVideos(): Promise<Video[]> {
  await ensureSchema()
  const res = await db.execute(
    `SELECT * FROM videos ORDER BY is_pinned DESC, datetime(created_at) DESC, id DESC;`,
  )
  return res.rows.map((r) => rowToVideo(r as unknown as Record<string, unknown>))
}

export async function getVideo(id: string): Promise<Video | null> {
  await ensureSchema()
  const res = await db.execute({ sql: `SELECT * FROM videos WHERE id = ?;`, args: [id] })
  if (res.rows.length === 0) return null
  return rowToVideo(res.rows[0] as unknown as Record<string, unknown>)
}

export async function createVideo(input: VideoInput): Promise<Video> {
  await ensureSchema()
  const id = makeId()
  await db.execute({
    sql: `INSERT INTO videos (id, title, description, thumbnail_url, download_url, file_size_mb, category, downloads, is_pinned)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?);`,
    args: [id, input.title, input.description ?? null, input.thumbnail_url ?? null, input.download_url, input.file_size_mb ?? null, input.category ?? null, input.is_pinned ? 1 : 0],
  })
  const created = await getVideo(id)
  if (!created) throw new Error('Failed to read back created video')
  return created
}

export async function updateVideo(id: string, input: Partial<VideoInput>): Promise<Video | null> {
  await ensureSchema()
  const existing = await getVideo(id)
  if (!existing) return null

  const merged = {
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    thumbnail_url: input.thumbnail_url !== undefined ? input.thumbnail_url : existing.thumbnail_url,
    download_url: input.download_url ?? existing.download_url,
    file_size_mb: input.file_size_mb !== undefined ? input.file_size_mb : existing.file_size_mb,
    category: input.category !== undefined ? input.category : existing.category,
    is_pinned: input.is_pinned ?? existing.is_pinned,
  }

  await db.execute({
    sql: `UPDATE videos
          SET title = ?, description = ?, thumbnail_url = ?, download_url = ?, file_size_mb = ?, category = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?;`,
    args: [merged.title, merged.description ?? null, merged.thumbnail_url ?? null, merged.download_url, merged.file_size_mb ?? null, merged.category ?? null, merged.is_pinned ? 1 : 0, id],
  })
  return getVideo(id)
}

export async function deleteVideo(id: string): Promise<boolean> {
  await ensureSchema()
  const res = await db.execute({ sql: `DELETE FROM videos WHERE id = ?;`, args: [id] })
  return (res.rowsAffected ?? 0) > 0
}

export async function incrementDownloads(id: string): Promise<void> {
  await ensureSchema()
  await db.execute({ sql: `UPDATE videos SET downloads = downloads + 1 WHERE id = ?;`, args: [id] })
}

function makeId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `vid_${ts}_${rand}`
}
