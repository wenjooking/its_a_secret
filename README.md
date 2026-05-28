# its_a_secret

A couple space: one home page to pick a moment, and one full-screen experience per festival (heart animation, music, letters).

## Run locally

```bash
npm install
npm start
```

- **Login:** http://localhost:3000/login.html (required before other pages)  
- **Home:** http://localhost:3000
- **Notes** are on the home page (below Moments); `notes.html` redirects there.  
- **Example festival:** http://localhost:3000/festival.html?id=valentine  

## Login (whole site)

All pages except `login.html` require an **8-digit passcode** (entered on the on-screen number pad; digits show as *).

After a correct login, the session stays open in that browser until you sign out.

### Change the passcode

**In the app (recommended):** Sign in → **Settings** → **Security** → enter current, new, and confirm passcode → **Update passcode**. Works when the site runs with `npm start` (or another Node host like Render).

**Manual (static deploy / fallback):**

```bash
node scripts/hash-password.js 12345678
```

Use your 8-digit code as the argument. Copy the hash into `config/auth.json` → `passwordHash`.

This is a simple privacy lock for a personal site (the hash is in the repo). It is not strong security against someone technical.

## View counts (sync across phones & laptops)

Without setup, each browser keeps its own count (`localStorage`). To share counts everywhere (including **GitLab Pages**), use **Supabase** (free):

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL Editor** → paste and run everything in `supabase/schema.sql`.
3. **Project Settings** → **API** → copy **Project URL** and the **publishable** key (`sb_publishable_...`). Do not put the **secret** key in the site.
4. Copy the example config and fill in your values:

   ```bash
   cp config/supabase.json.example config/supabase.json
   ```

   Edit `config/supabase.json` with your URL and `publishableKey`. Legacy `anonKey` (JWT) also works. This file is gitignored.

5. Restart `npm start` and open the home page — both devices should show the same counts after you open a festival card.

**GitLab Pages:** `npm run build` copies `config/` into `public/`. Put `config/supabase.json` on the machine that runs the build (your laptop or a CI secret file copied in before `npm run build`). The anon key is safe to expose in the built site when RLS is set up as in `schema.sql` (read counts + increment only via RPC).

**Alternative:** Deploy the Node app (e.g. [Render](https://render.com) — `render.yaml` is included). Then `POST /api/views/:id` syncs via `data/views.json` on the server without Supabase.

Priority: Supabase → Node `/api/views` → `data/views.json` → `localStorage`.

## Add a new festival

### 1. Assets folder

Create `assets/your-festival-id/` with your images and optional `song.mp3`:

```
assets/anniversary/
  letter_1.png
  letter_2.png
  song.mp3
```

### 2. Festival config

Copy `festivals/anniversary.json` → `festivals/your-festival-id.json` and edit:

- `theme` — overlay color, heart color, background  
- `hero` / `letter` — text copy (page opens directly on card click)  
- `assets.base` — e.g. `"assets/anniversary"`  
- `assets.images` — list of image filenames  
- `assets.music` — filename or `null`  
- Set `"status": "ready"` when content is done  

### 3. Home manifest (`festivals/manifest.json`)

**Timeline** (`timeline`) — scrollable dates on the home page. Add or edit these with the pencil on the home page; they do **not** create moment cards.

**Moments** (`festivals`) — clickable cards that open `festival.html?id=…`. Add these manually when a festival page is ready:

```json
{
  "id": "your-festival-id",
  "title": "Display name",
  "author": "Wen Joo",
  "tagline": "Short line on the card",
  "emoji": "🎉",
  "date": "26/04/2026",
  "status": "ready"
}
```

You can list the same id in both `timeline` and `festivals` if you want a date on the timeline and a card for the experience. Timeline-only entries need no `status` or festival JSON.

Add `"author"` (optional) to show **by Name** under the title. Add `"date"` (optional, `DD/MM/YYYY`) on cards and timeline rows. Omit either when not needed yet.

Add `"updatedAt"` (ISO date, e.g. `"2026-05-28"`) whenever you change letters or images. Visitors see a **New** dot until they open that moment; bump `updatedAt` again after the next edit.

Use `"status": "coming-soon"` until the festival page is ready (card stays disabled on the home page).

## Project layout

| Path | Role |
|------|------|
| `index.html` | Home — festival picker |
| `festival.html?id=…` | One festival experience |
| `festivals/manifest.json` | `timeline` (dates) + `festivals` (moment cards) |
| `data/notes.json` | Surprise note board messages |
| Home **Notes** section | Pin notes with colors, handwriting text, and photos |
| `festivals/*.json` | Per-festival content & theme |
| `js/views-store.js` | Shared view counts (Supabase / API / local) |
| `js/` | Viewport, heart animation, page logic |
| `supabase/schema.sql` | Database setup for synced views |
| `config/supabase.json` | Your Supabase URL + anon key (local only) |
| `assets/{id}/` | Images & music per festival |
| `server.js` | Local static server |

## Build for deploy

```bash
npm run build
```

Outputs everything under `public/` for GitLab Pages.
