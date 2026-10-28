// Sanity-checks the sight word JSON before Cloudflare deploys it.
// Runs as the build command in Workers Builds; a failure stops the deploy,
// so a typo never reaches the app. Run locally with: node scripts/check-sightwords.mjs
import { readFileSync, readdirSync } from "node:fs";

const BASE = "https://timelessblur.com/sightwords/list/";
const dir = "public/sightwords/list";
const errors = [];
const read = (p) => {
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { errors.push(`${p}: invalid JSON (${e.message})`); return null; }
};

const index = read("public/sightwords/list.json");
const files = new Set(readdirSync(dir).filter((f) => f.endsWith(".json")));
const listed = new Set();

for (const entry of index?.lists ?? []) {
  const file = `${entry.id}.json`;
  listed.add(file);
  if (entry.url !== BASE + file) errors.push(`${entry.id}: url should be ${BASE + file}`);
  if (!files.has(file)) { errors.push(`${entry.id}: missing ${dir}/${file}`); continue; }
  const list = read(`${dir}/${file}`);
  if (!list) continue;
  if (list.id !== entry.id) errors.push(`${file}: id "${list.id}" doesn't match "${entry.id}"`);
  if (!Array.isArray(list.words) || list.words.length === 0) errors.push(`${file}: "words" must be a non-empty array`);
  else if (entry.wordCount !== list.words.length) errors.push(`${entry.id}: wordCount is ${entry.wordCount} but file has ${list.words.length} words`);
}
// The index must stay in alphabetical order by name ("List 2" before "List 10").
const names = (index?.lists ?? []).map((l) => l.name);
const sorted = [...names].sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
if (names.join("|") !== sorted.join("|")) errors.push(`list.json isn't in alphabetical order by name; expected: ${sorted.join(", ")}`);
for (const f of files) if (!listed.has(f)) errors.push(`${f} exists but isn't in list.json`);

// The app's config (public/sightwords/config.json). Every key must be a tunable
// the app knows, so a typo fails here instead of being silently ignored on
// every device. The ranges mirror AppConfig.Tunables in the app; the app clamps
// regardless, so out of range is a warning, not a failure.
const TUNABLES = {
  answerCooldownSeconds: [0, 2],
  practiceScreenAwakeSeconds: [0, 600],
  configRefreshHours: [1, 48],
  listenAndPickWordPauseSeconds: [0, 3],
  // A switch: 1 on, 0 off.
  speechEnabled: [0, 1],
  speechRate: [0.4, 1],
};
const warnings = [];
const checkBlock = (where, block) => {
  if (block === undefined) return;
  if (typeof block !== "object" || block === null || Array.isArray(block)) {
    errors.push(`config.json: ${where} must be an object`);
    return;
  }
  for (const [key, value] of Object.entries(block)) {
    const range = TUNABLES[key];
    if (!range) { errors.push(`config.json: ${where}.${key} is not a tunable the app knows (${Object.keys(TUNABLES).join(", ")})`); continue; }
    if (typeof value !== "number" || !Number.isFinite(value)) { errors.push(`config.json: ${where}.${key} must be a number`); continue; }
    if (value < range[0] || value > range[1]) warnings.push(`config.json: ${where}.${key} is ${value}; the app will clamp it to ${range[0]}–${range[1]}`);
  }
};
const config = read("public/sightwords/config.json");
let versionBlocks = 0;
if (config) {
  // The format version. Bumping it makes every shipped app refuse the file.
  if (config.version !== 1) errors.push(`config.json: "version" must be 1 (it is the format version, not a content version)`);
  checkBlock("default", config.default);
  if (config.appVersions !== undefined) {
    if (typeof config.appVersions !== "object" || config.appVersions === null || Array.isArray(config.appVersions)) {
      errors.push(`config.json: "appVersions" must be an object`);
    } else {
      for (const [version, block] of Object.entries(config.appVersions)) {
        // Exact (1.1.2) or major.minor (1.1) — the two the app looks up.
        if (!/^\d+\.\d+(\.\d+)?$/.test(version)) errors.push(`config.json: appVersions key "${version}" should look like 1.1 or 1.1.2`);
        checkBlock(`appVersions["${version}"]`, block);
        versionBlocks++;
      }
    }
  }
  for (const key of Object.keys(config)) {
    if (!["version", "default", "appVersions"].includes(key)) errors.push(`config.json: unknown top-level key "${key}"`);
  }
}

for (const w of warnings) console.warn("Warning: " + w);
if (errors.length) { console.error("Sight word check failed:\n  " + errors.join("\n  ")); process.exit(1); }
console.log(`Sight words OK: ${listed.size} lists, config with ${versionBlocks} version blocks`);
