# its_a_secret

A couple space: one home page to pick a moment, and one full-screen experience per festival (heart animation, music, letters).

## Run locally

```bash
npm install
npm start
```

- **Login:** http://localhost:3000/login.html (required before other pages)  
- **Home:** http://localhost:3000  
- **Example festival:** http://localhost:3000/festival.html?id=valentine  

## Login (whole site)

All pages except `login.html` require an **8-digit passcode** (entered on the on-screen number pad; digits show as *).

After a correct login, the session stays open in that browser until you sign out.

### Change the passcode

```bash
node scripts/hash-password.js 12345678
```

Use your 8-digit code as the argument. Copy the hash into `config/auth.json` → `passwordHash`.

This is a simple privacy lock for a personal site (the hash is in the repo). It is not strong security against someone technical.

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

### 3. Home card

Add an entry in `festivals/manifest.json`:

```json
{
  "id": "your-festival-id",
  "title": "Display name",
  "tagline": "Short line on the card",
  "emoji": "🎉",
  "date": "26/04/2026",
  "status": "ready"
}
```

Add `"date"` (optional, `DD/MM/YYYY`) to show a date on the bottom-right of the card. Omit for moments without a date yet.

Use `"status": "coming-soon"` until the festival page is ready (card stays disabled on the home page).

## Project layout

| Path | Role |
|------|------|
| `index.html` | Home — festival picker |
| `festival.html?id=…` | One festival experience |
| `festivals/manifest.json` | List of cards on home |
| `festivals/*.json` | Per-festival content & theme |
| `js/` | Viewport, heart animation, page logic |
| `assets/{id}/` | Images & music per festival |
| `server.js` | Local static server |

## Build for deploy

```bash
npm run build
```

Outputs everything under `public/` for GitLab Pages.
