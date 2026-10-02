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

if (errors.length) { console.error("Sight word check failed:\n  " + errors.join("\n  ")); process.exit(1); }
console.log(`Sight words OK: ${listed.size} lists`);
