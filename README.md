# timelessblur.com

Static site for [timelessblur.com](https://timelessblur.com), hosted on Cloudflare.
Push to `main` → Cloudflare deploys automatically (usually under a minute).

## Layout

```
public/                      ← everything in here is the website
  index.html                 → /
  privacy.html               → /privacy
  404.html                   → shown for any missing page
  _headers                   → cache/CORS rules (sight word JSON caches 5 min)
  sightwords/
    list.json                → /sightwords/list.json        (index of all lists)
    list/<id>.json           → /sightwords/list/<id>.json   (one word list)
scripts/check-sightwords.mjs ← validates the JSON; runs before every deploy
wrangler.jsonc               ← Cloudflare config (static assets only, no server code)
```

A new page is just a new `.html` file in `public/`: `public/about.html` is served at `/about`.

## Adding a sight word list

1. Create `public/sightwords/list/<id>.json`:
   ```json
   { "id": "<id>", "name": "Display Name", "version": 1, "words": ["a", "and"] }
   ```
2. Add an entry to `public/sightwords/list.json` with the same `id`, the `wordCount`,
   and `"url": "https://timelessblur.com/sightwords/list/<id>.json"`.
3. Run `node scripts/check-sightwords.mjs` and push.

To change a list, edit its words and bump its `version` (and the `updated` date in `list.json`)
so the app can tell when a cached copy is stale.

## Preview locally

```
npx wrangler dev
```
Then open http://localhost:8787.
