# AERONICX — Full Build Prompt (for Z.ai GLM / AI Code Generator)

Paste everything below as one prompt to generate the complete codebase.

---

## PROJECT BRIEF

Build a full-stack web app called **Aeronicx** — a video download website.

- Public users need **NO login**. They land on the homepage, see a list/grid of videos, click "Download," and the file starts downloading **immediately in the same click** — no redirect to another page, no ad interstitial, no countdown, no "click here again" page.
- Only I (the admin) can add new videos, via a password-protected `/admin` page.
- Videos themselves are NOT uploaded through this website's server. They are hosted on **GitHub Releases** (I upload them manually there, up to 2GB per file, completely free, no credit card). This site only stores and displays **metadata** (title, thumbnail, size, description) and the **direct GitHub download URL**.

---

## TECH STACK

- Next.js 14+ (App Router), TypeScript
- Tailwind CSS
- Turso (libSQL) as database
- Prisma as ORM (with Turso adapter) — or `@libsql/client` directly if simpler for a single table
- Deployment target: Vercel (free tier)
- No third-party auth library — simple password-gate using an environment variable + signed cookie/session for `/admin`

---

## DATABASE SCHEMA

Single table `videos`:

```
id            TEXT PRIMARY KEY (cuid or uuid)
title         TEXT NOT NULL
description   TEXT
thumbnail_url TEXT           -- external image URL or GitHub-hosted image
download_url  TEXT NOT NULL  -- direct GitHub Release asset URL
file_size_mb  INTEGER
category      TEXT           -- optional, e.g. "Tutorial", "Movie", etc.
downloads     INTEGER DEFAULT 0   -- increment counter on each download click
created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## PAGES & ROUTES

### 1. `/` — Public Homepage
- Fetch all videos from Turso, newest first.
- Responsive grid (1 col mobile, 2-3 col desktop) of video cards.
- Each card: thumbnail image, title, short description (truncated), file size badge, and a **Download button**.
- Optional: simple search input filtering by title (client-side is fine for small lists).
- No pagination needed unless list grows large — but build it so it's easy to add later (fetch is already server-side).

### 2. Download Button Behavior — CRITICAL REQUIREMENT
This is the most important UX detail. Implement it exactly like this:

```tsx
<a
  href={video.download_url}
  rel="noopener"
  onClick={() => trackDownload(video.id)} // fire-and-forget API call to increment counter, do NOT await or block navigation
  className="..."
>
  Download
</a>
```

**Why this works without any redirect or extra page:** GitHub Release asset URLs are served by GitHub with a `Content-Disposition: attachment` header. This means the browser treats the click as a **file download**, not a page navigation — even though it's a plain `<a href>` tag. The user stays on the Aeronicx page the entire time; the file just starts downloading via the browser's native download manager. Do NOT wrap this in a JavaScript `fetch()` + blob download — for large 1GB+ files that will fail or freeze the tab due to memory limits and CORS. The plain anchor tag is the correct and only approach here.

The `trackDownload` call should be a `fire-and-forget` POST to `/api/track-download/[id]` that increments the `downloads` counter — it must NOT use `await` before the anchor's default navigation happens, and must NOT call `preventDefault()`.

### 3. `/admin` — Protected Admin Page
- On load, check for a valid session cookie. If not present, show a simple password form.
- Password comes from `process.env.ADMIN_PASSWORD` — compare server-side in an API route, then set an HttpOnly cookie (e.g. signed JWT or simple random session token stored server-side/in Turso) valid for the session.
- Once authenticated, show:
  - A form to add a new video: Title, Description, Thumbnail URL, GitHub Download URL, File Size (MB), Category.
  - A table listing all existing videos with Edit and Delete actions.
- All admin API routes (`/api/admin/videos` POST/PUT/DELETE) must check the session cookie server-side before allowing changes.

### 4. API Routes
- `GET /api/videos` — public, returns video list for homepage
- `POST /api/admin/login` — checks password, sets session cookie
- `POST /api/admin/videos` — add video (auth required)
- `PUT /api/admin/videos/[id]` — edit video (auth required)
- `DELETE /api/admin/videos/[id]` — delete video (auth required)
- `POST /api/track-download/[id]` — increments download counter, public, no auth, should respond fast (fire-and-forget from client)

---

## DESIGN DIRECTION

Brand name: **Aeronicx**

- Dark theme, premium/tech feel — deep charcoal/near-black background (`#0a0a0f` or similar), a single vibrant accent color (suggest electric blue or cyan, e.g. `#00d9ff`) for buttons and highlights.
- Clean sans-serif typography (e.g. Inter or Space Grotesk from Google Fonts).
- Cards should have subtle borders/glow on hover, rounded corners (`rounded-xl`), soft shadows.
- Download button should be visually prominent — solid accent color, clear icon (down-arrow), large tap target for mobile since most users will be on phones.
- Homepage header: logo/wordmark "Aeronicx" top-left, tagline like "Fast. Free. No Ads." top area.
- Fully responsive — this will primarily be used on mobile browsers.

---

## ENVIRONMENT VARIABLES NEEDED

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
ADMIN_PASSWORD=
SESSION_SECRET=
```

---

## MY WORKFLOW FOR ADDING VIDEOS (explain this isn't part of the code, just context)

1. I create a GitHub repo, go to "Releases," create a new release, and drag-drop the video file as a release asset.
2. GitHub gives me a direct URL like `https://github.com/username/repo/releases/download/v1/filename.mp4`.
3. I paste that URL, along with title/description/thumbnail, into the `/admin` form on Aeronicx.
4. It appears instantly on the public homepage.

---

## DELIVERABLE

Generate the complete, runnable Next.js project: all files, `package.json` with correct dependencies, Prisma schema (or libSQL client setup), Tailwind config, and every page/component/API route described above. Make sure the code is production-ready and has no placeholder TODOs — fully working end to end.
