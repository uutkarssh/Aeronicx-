import { createClient } from '@libsql/client'

/**
 * One-off schema setup script for Turso.
 * Uses @libsql/client directly (bypassing Prisma) for reliable CLI execution.
 * The runtime app uses Prisma via the @prisma/adapter-libsql adapter.
 *
 * Run with: bun run /home/z/my-project/scripts/setup-turso.ts
 */

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  console.error('TURSO_DATABASE_URL is not set. Check .env file.')
  process.exit(1)
}
if (!authToken) {
  console.error('TURSO_AUTH_TOKEN is not set. Check .env file.')
  process.exit(1)
}

console.log('Connecting to Turso at:', url.replace(/\?auth=.*/, ''))

const client = createClient({ url, authToken })

async function main() {
  // Drop if exists (idempotent dev script — DO NOT run in production)
  try {
    await client.execute(`DROP TABLE IF EXISTS videos;`)
    console.log('Dropped existing videos table.')
  } catch (e) {
    console.log('No existing table to drop (continuing).', e)
  }

  // Create the videos table matching the Prisma schema (with @map column names).
  await client.execute(`
    CREATE TABLE videos (
      id            TEXT PRIMARY KEY NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT,
      thumbnail_url TEXT,
      download_url  TEXT NOT NULL,
      file_size_mb  INTEGER,
      category      TEXT,
      downloads     INTEGER NOT NULL DEFAULT 0,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('Created videos table.')

  // Seed one demo video so the homepage is not empty on first deploy.
  await client.execute({
    sql: `INSERT INTO videos (id, title, description, thumbnail_url, download_url, file_size_mb, category, downloads)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'demo-001',
      'Welcome to Aeronicx — Sample Video',
      'This is a demo entry. Replace it from the /admin panel. The download link points to a public sample asset so you can verify the click-to-download UX works as expected.',
      'https://image.z.ai/zai-ai-generated-poster.jpeg',
      'https://github.com/git/git/archive/refs/tags/v2.43.0.zip',
      8,
      'Tutorial',
      0,
    ],
  })
  console.log('Seeded 1 demo video.')

  // Verify
  const result = await client.execute(`SELECT COUNT(*) as count FROM videos;`)
  console.log('Row count:', result.rows[0])
}

main()
  .then(() => {
    client.close()
    process.exit(0)
  })
  .catch((err) => {
    console.error('Setup failed:', err)
    process.exit(1)
  })
