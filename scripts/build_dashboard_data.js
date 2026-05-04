#!/usr/bin/env node
// ComuneMetrics — Build orchestrator (Node.js).
//
// Stesso pattern del validatore opendata-pa-quality-audit:
//   - fetch nativo Node.js 18+ (passa il WAF di dati.gov.it dove Python requests viene bloccato)
//   - User-Agent semplice "ComuneMetrics-Builder/0.1" (no Mozilla, no parentesi)
//   - AbortController per timeout
//   - Pool di concorrenza limitato
//
// Input:  config/comuni.yml + config/metrics.yml
// Output: data/dashboard.json + data/comuni/<key>.json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CALCULATORS } from "./calculators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_DIR = join(ROOT, "config");
const DATA_DIR = join(ROOT, "data");
const COMUNI_DIR = join(DATA_DIR, "comuni");

const USER_AGENT = "ComuneMetrics-Builder/0.1";
const FETCH_TIMEOUT = process.env.GITHUB_ACTIONS ? 30_000 : 15_000;
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const POOL_SIZE = 1; // sequenziale: dati.gov.it ha rate limit aggressivo per IP cloud
const REQUEST_DELAY_MS = 1500; // pausa tra richieste consecutive (anti rate-limit)

// ── Logger ────────────────────────────────────────────────────────────────────
function ts() {
  return new Date().toTimeString().slice(0, 8);
}
function log(msg) { process.stdout.write(`${ts()} ${msg}\n`); }
function warn(msg) { process.stderr.write(`${ts()} ⚠ ${msg}\n`); }

// ── YAML loader minimale (no dipendenze) ──────────────────────────────────────
// Per evitare di aggiungere `yaml` come dipendenza, parsifico il subset di YAML
// che usiamo nei due file di config (key-value, liste con `-`, dict nested,
// flow style `[a, b, c]` per liste inline). Non gestisce ancore, tag, ecc.
function parseYaml(text) {
  // Strategia pragmatica: convertiamo YAML → JSON usando un parser minimale
  // a basata su indentazione. Per evitare un parser completo, qui usiamo
  // un trick: strippiamo i commenti e parsifichiamo manualmente.
  const lines = text.split("\n");
  const cleaned = [];
  for (const line of lines) {
    // rimuovi commenti (# ma non dentro stringhe)
    let i = 0, inStr = false, q = null;
    let out = "";
    while (i < line.length) {
      const c = line[i];
      if (!inStr && (c === '"' || c === "'")) { inStr = true; q = c; out += c; }
      else if (inStr && c === q) { inStr = false; q = null; out += c; }
      else if (!inStr && c === "#") break;
      else out += c;
      i++;
    }
    if (out.trim() !== "") cleaned.push(out.replace(/\s+$/, ""));
  }
  return parseLines(cleaned, 0, 0).value;
}

function indentOf(line) {
  let i = 0;
  while (i < line.length && line[i] === " ") i++;
  return i;
}

function parseScalar(s) {
  s = s.trim();
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  // Stringhe quotate
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Flow list [a, b, c] o ["a", "b"]
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1).trim();
    if (inner === "") return [];
    return splitFlowList(inner).map(item => parseScalar(item));
  }
  return s;
}

function splitFlowList(s) {
  // split per virgola rispettando le virgolette
  const out = [];
  let cur = "", inStr = false, q = null, depth = 0;
  for (const c of s) {
    if (!inStr && (c === '"' || c === "'")) { inStr = true; q = c; cur += c; }
    else if (inStr && c === q) { inStr = false; q = null; cur += c; }
    else if (!inStr && c === "[") { depth++; cur += c; }
    else if (!inStr && c === "]") { depth--; cur += c; }
    else if (!inStr && c === "," && depth === 0) { out.push(cur); cur = ""; }
    else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseLines(lines, startIdx, baseIndent) {
  // Determina se è una sequence (- ...) o un mapping (key: ...)
  let i = startIdx;
  // Skip righe vuote
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return { value: null, next: i };

  const firstLine = lines[i];
  const firstIndent = indentOf(firstLine);
  if (firstIndent < baseIndent) return { value: null, next: i };

  const trimmed = firstLine.slice(firstIndent);
  if (trimmed.startsWith("- ")) {
    // Sequence
    const arr = [];
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === "") { i++; continue; }
      const ind = indentOf(line);
      if (ind < firstIndent) break;
      if (ind > firstIndent) { i++; continue; }
      const content = line.slice(ind);
      if (!content.startsWith("- ")) break;
      const itemContent = content.slice(2);
      if (itemContent.includes(":") && !itemContent.startsWith("[")) {
        // item è un mapping inline su questa riga + sotto
        const fakeLines = [...lines];
        fakeLines[i] = " ".repeat(firstIndent + 2) + itemContent;
        const sub = parseLines(fakeLines, i, firstIndent + 2);
        arr.push(sub.value);
        i = sub.next;
      } else {
        arr.push(parseScalar(itemContent));
        i++;
      }
    }
    return { value: arr, next: i };
  } else {
    // Mapping
    const obj = {};
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === "") { i++; continue; }
      const ind = indentOf(line);
      if (ind < firstIndent) break;
      if (ind > firstIndent) { i++; continue; }
      const content = line.slice(ind);
      const colonIdx = findColon(content);
      if (colonIdx < 0) break;
      const key = content.slice(0, colonIdx).trim();
      const rest = content.slice(colonIdx + 1).trim();
      if (rest === "") {
        // valore su righe successive (nested)
        const sub = parseLines(lines, i + 1, firstIndent + 2);
        obj[key] = sub.value;
        i = sub.next;
      } else {
        obj[key] = parseScalar(rest);
        i++;
      }
    }
    return { value: obj, next: i };
  }
}

function findColon(s) {
  // trova primo `:` non dentro stringa né in flow list
  let inStr = false, q = null, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!inStr && (c === '"' || c === "'")) { inStr = true; q = c; }
    else if (inStr && c === q) { inStr = false; q = null; }
    else if (!inStr && c === "[") depth++;
    else if (!inStr && c === "]") depth--;
    else if (!inStr && c === ":" && depth === 0) {
      // verifica che dopo i due punti ci sia spazio o fine riga (key: val)
      if (i + 1 >= s.length || s[i + 1] === " " || s[i + 1] === "\t") return i;
    }
  }
  return -1;
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}, timeout = FETCH_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function httpGetText(url) {
  const MAX_RETRIES = 4;
  const BASE_BACKOFF_MS = 3000;
  let result = null;
  let lastStatus = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const r = await fetchWithTimeout(url);
      lastStatus = r.status;
      // 403/429/5xx → retry con backoff esponenziale
      if (r.status === 403 || r.status === 429 || r.status >= 500) {
        if (attempt < MAX_RETRIES) {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.random() * 1000;
          warn(`  ⚠ HTTP ${r.status} (try ${attempt}/${MAX_RETRIES}), retry in ${(backoff/1000).toFixed(1)}s`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        warn(`  ✗ HTTP ${r.status} ${url.slice(0, 100)} (esauriti retry)`);
        break;
      }
      if (!r.ok) {
        warn(`  ✗ HTTP ${r.status} ${url.slice(0, 100)}`);
        break;
      }
      const cl = parseInt(r.headers.get("content-length") || "0", 10);
      if (cl > MAX_BYTES) {
        warn(`  ✗ File troppo grande (${(cl / 1024 / 1024).toFixed(1)} MB)`);
        break;
      }
      const text = await r.text();
      if (text.length > MAX_BYTES) {
        warn(`  ✗ Contenuto troppo grande`);
        break;
      }
      result = text;
      break;
    } catch (e) {
      warn(`  ✗ ${e.name}: ${e.message}`);
      if (attempt < MAX_RETRIES) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      break;
    }
  }

  // Throttle SEMPRE dopo ogni richiesta (success o fail), per rispettare rate limit
  if (REQUEST_DELAY_MS > 0) await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  return result;
}

async function fetchPackage(ckanServer, slug) {
  const url = `${ckanServer}/api/3/action/package_show?id=${encodeURIComponent(slug)}`;
  const text = await httpGetText(url);
  if (!text) return null;
  try {
    const body = JSON.parse(text);
    if (!body.success) { warn(`  ✗ CKAN success=false`); return null; }
    return body.result;
  } catch (e) {
    warn(`  ✗ JSON parse: ${e.message}`);
    return null;
  }
}

// ── Resource picking ──────────────────────────────────────────────────────────
function pickBestResource(resources) {
  if (!resources || !resources.length) return null;
  const priority = { JSON: 1, CSV: 2, JSONL: 2, XLS: 3, XLSX: 3 };
  const sorted = [...resources].sort((a, b) => {
    const pa = priority[(a.format || "").toUpperCase()] || 99;
    const pb = priority[(b.format || "").toUpperCase()] || 99;
    return pa - pb;
  });
  return sorted[0];
}

// ── CSV parser minimale ───────────────────────────────────────────────────────
// Auto-detect del separatore (`;`, `,`, `\t`).
function parseCSV(text) {
  // detect separator dalla prima riga
  const firstLine = text.split("\n", 1)[0];
  let sep = ",";
  let maxCount = (firstLine.match(/,/g) || []).length;
  for (const candidate of [";", "\t", "|"]) {
    const c = (firstLine.match(new RegExp(candidate === "\t" ? "\t" : `\\${candidate}`, "g")) || []).length;
    if (c > maxCount) { maxCount = c; sep = candidate; }
  }
  // Parser RFC-4180-lite con supporto quoted fields
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === sep) { row.push(field); field = ""; }
      else if (c === "\n") {
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else if (c === "\r") {
        // skip
      } else field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = rows[i][j] !== undefined ? rows[i][j] : null;
    }
    out.push(obj);
  }
  return out;
}

// ── JSON parser tollerante ────────────────────────────────────────────────────
function parseJSON(text) {
  try {
    const obj = JSON.parse(text);
    if (Array.isArray(obj)) return obj;
    if (obj && typeof obj === "object") {
      for (const key of ["records", "results", "data"]) {
        if (Array.isArray(obj[key])) return obj[key];
      }
      return [obj];
    }
    return [];
  } catch {
    // JSONL: una riga = un JSON
    const lines = text.split("\n").filter(l => l.trim());
    const out = [];
    for (const l of lines) {
      try { out.push(JSON.parse(l)); } catch { /* skip */ }
    }
    return out;
  }
}

// ── Field mapping ─────────────────────────────────────────────────────────────
function mapFields(columns, expectedFields) {
  const norm = {};
  for (const c of columns) norm[c.trim().toLowerCase()] = c;
  const out = {};
  for (const [canonical, synonyms] of Object.entries(expectedFields || {})) {
    let found = null;
    for (const syn of synonyms) {
      if (norm[String(syn).trim().toLowerCase()]) {
        found = norm[String(syn).trim().toLowerCase()];
        break;
      }
    }
    out[canonical] = found;
  }
  return out;
}

// ── Freshness ─────────────────────────────────────────────────────────────────
function freshness(modIso) {
  if (!modIso) return { level: "unknown", months: null, iso: null };
  const d = new Date(modIso);
  if (isNaN(d.getTime())) return { level: "unknown", months: null, iso: modIso };
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  let level = "stale";
  if (months <= 12) level = "fresh";
  else if (months <= 36) level = "aged";
  return { level, months, iso: modIso };
}

// ── Process single dataset ────────────────────────────────────────────────────
async function processDataset(comuneKey, dsKey, slug, metricCfg, ckanServer) {
  log(`[${comuneKey}] ${dsKey} → ${slug}`);
  const out = {
    dataset_key: dsKey,
    slug,
    fetched_at: new Date().toISOString(),
    status: "ok",
    modified: null,
    freshness: { level: "unknown", months: null, iso: null },
    n_rows: null,
    fields_expected: Object.keys(metricCfg.expected_fields || {}),
    fields_present: null,
    fields_missing: null,
    metrics: null,
    resource_url: null,
    resource_format: null,
    error: null,
  };

  const pkg = await fetchPackage(ckanServer, slug);
  if (!pkg) {
    out.status = "fetch_error";
    out.error = "package_show failed";
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  out.modified = pkg.modified || pkg.metadata_modified;
  out.freshness = freshness(out.modified);

  const res = pickBestResource(pkg.resources || []);
  if (!res) {
    out.status = "no_resources";
    out.error = "Pacchetto senza risorse scaricabili";
    return out;
  }

  out.resource_url = res.url;
  out.resource_format = res.format;

  const text = await httpGetText(res.url);
  if (!text) {
    out.status = "fetch_error";
    out.error = `Download fallito (${res.format})`;
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  // Verifica HTML (link rotto)
  if (text.trimStart().startsWith("<")) {
    out.status = "fetch_error";
    out.error = "Server ha restituito HTML invece di dati";
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  // Parse
  const fmt = (res.format || "").toUpperCase();
  let rows = [];
  try {
    if (fmt === "JSON" || fmt === "JSONL") rows = parseJSON(text);
    else if (fmt === "CSV") rows = parseCSV(text);
    else {
      out.status = "unsupported_format";
      out.error = `Formato ${fmt} non supportato`;
      out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
      return out;
    }
  } catch (e) {
    out.status = "parse_error";
    out.error = e.message;
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  if (!rows.length) {
    out.status = "parse_error";
    out.error = "Dataset vuoto";
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  out.n_rows = rows.length;
  const cols = Object.keys(rows[0]);
  const fieldMap = mapFields(cols, metricCfg.expected_fields || {});
  out.fields_present = Object.keys(fieldMap).filter(k => fieldMap[k]);
  out.fields_missing = Object.keys(fieldMap).filter(k => !fieldMap[k]);

  const calcFn = CALCULATORS[metricCfg.calculator];
  if (!calcFn) {
    out.status = "no_calculator";
    out.error = `Calculator '${metricCfg.calculator}' non trovato`;
    return out;
  }

  try {
    out.metrics = calcFn(rows, fieldMap);
  } catch (e) {
    warn(`  ✗ Calc error: ${e.message}`);
    out.status = "calc_error";
    out.error = e.message;
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
  }

  log(`  ✓ rows=${out.n_rows} fresh=${out.freshness.level} present=${out.fields_present.length} missing=${out.fields_missing.length}`);
  return out;
}

// ── Pool concorrenza ──────────────────────────────────────────────────────────
async function runPool(tasks, size) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(size, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log("=== ComuneMetrics builder start ===");

  const comuniCfg = parseYaml(readFileSync(join(CONFIG_DIR, "comuni.yml"), "utf-8"));
  const metricsCfg = parseYaml(readFileSync(join(CONFIG_DIR, "metrics.yml"), "utf-8"));

  const ckanServer = comuniCfg.ckan_server || "https://www.dati.gov.it/opendata";
  log(`CKAN server: ${ckanServer}`);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(COMUNI_DIR, { recursive: true });

  const dashboard = {
    version: "0.2.0-alpha",
    built_at: new Date().toISOString(),
    ckan_server: ckanServer,
    comuni: {},
  };

  for (const [comuneKey, comune] of Object.entries(comuniCfg.comuni || {})) {
    log(`\n=== Comune: ${comuneKey} (${comune.nome}) ===`);
    const comuneOut = {
      key: comuneKey,
      nome: comune.nome,
      ipa: comune.ipa,
      istat: comune.istat,
      popolazione_attesa: comune.popolazione_attesa,
      mandato: comune.mandato,
      sindaco: comune.sindaco,
      mappa_center: comune.mappa_center,
      mappa_zoom: comune.mappa_zoom,
      datasets: {},
    };

    // Costruisci tasks paralleli
    const tasks = [];
    const dsKeys = [];
    for (const [dsKey, slug] of Object.entries(comune.datasets || {})) {
      const metricCfg = metricsCfg.datasets?.[dsKey] || {};
      if (!slug) {
        comuneOut.datasets[dsKey] = {
          dataset_key: dsKey,
          slug: null,
          status: "not_published",
          fields_expected: Object.keys(metricCfg.expected_fields || {}),
          metrics: Object.fromEntries((metricCfg.kpi || []).map(k => [k, null])),
        };
        continue;
      }
      dsKeys.push(dsKey);
      tasks.push(() => processDataset(comuneKey, dsKey, slug, metricCfg, ckanServer));
    }

    const results = await runPool(tasks, POOL_SIZE);
    for (let i = 0; i < dsKeys.length; i++) {
      comuneOut.datasets[dsKeys[i]] = results[i];
    }

    const outPath = join(COMUNI_DIR, `${comuneKey}.json`);
    writeFileSync(outPath, JSON.stringify(comuneOut, null, 2), "utf-8");
    log(`→ data/comuni/${comuneKey}.json`);

    dashboard.comuni[comuneKey] = {
      key: comuneKey,
      nome: comuneOut.nome,
      ipa: comuneOut.ipa,
      n_datasets_pubblicati: Object.values(comuneOut.datasets)
        .filter(d => d.status !== "not_published").length,
      n_datasets_totali: Object.keys(comuneOut.datasets).length,
      n_datasets_ok: Object.values(comuneOut.datasets)
        .filter(d => d.status === "ok").length,
    };
  }

  writeFileSync(join(DATA_DIR, "dashboard.json"), JSON.stringify(dashboard, null, 2), "utf-8");
  log("\n=== ✓ Build completata → data/dashboard.json ===");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
