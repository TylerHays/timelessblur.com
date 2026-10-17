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
    config.json              → /sightwords/config.json      (app tunables, per version)
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

## The app config

`public/sightwords/config.json` tunes the app without a release: timings like the
answer double-tap guard and how long practice keeps the screen awake. The app fetches
it at launch, at most once a day, and keeps the last good copy for offline launches.

```json
{
  "version": 1,
  "default":     { "practiceScreenAwakeSeconds": 150 },
  "appVersions": { "1.1":   { "practiceScreenAwakeSeconds": 120 },
                   "1.1.2": { "answerCooldownSeconds": 0.4 } }
}
```

- **Resolved key by key, most specific first**: the app's exact version (`1.1.2`), then
  its major.minor (`1.1`), then `default`, then the value built into the app. A block
  only names what is different; a version with no block gets `default`.
- **`default` mirrors the app's built-in values**, so every setting is visible here.
  Anything served overrides the app's own default, including a better default shipped
  in a later release. So when a release changes a built-in default, put the new value
  in an `appVersions` block for that release (or in `default` once every running
  version should have it), or this file's old value wins and the change never lands.
- **`version` is the format version.** Leave it at `1`. Raising it makes every
  installed app ignore the file.
- **Keep it small.** When a value is right for everyone, move it into `default` and
  delete the blocks that only existed to set it. Delete blocks for versions nobody
  runs any more.
- Allowed keys and ranges are listed in `scripts/check-sightwords.mjs`, which must
  match `AppConfig.Tunables` in the app. Unknown keys and non-numbers fail the
  deploy. Out-of-range values only warn, because the app clamps them.
- Devices pick up a change within a day, plus the 5-minute cache. A development build
  can fetch immediately from Settings → Developer → Fetch Now.
- **Never move this file.** Its address is compiled into every build that ships.

## Preview locally

```
npx wrangler dev
```
Then open http://localhost:8787.
