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

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CALCULATORS } from "./calculators.js";
import { CALCULATORS_V2 } from "./calculators_v2.js";
import { validateCsv, loadSchema } from "./validate_csv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_DIR = join(ROOT, "config");
const DATA_DIR = join(ROOT, "data");
const COMUNI_DIR = join(DATA_DIR, "comuni");

const USER_AGENT = "ComuneMetrics-Builder/0.1";
const FETCH_TIMEOUT = process.env.GITHUB_ACTIONS ? 45_000 : 15_000;
const MAX_BYTES = 30 * 1024 * 1024; // 30 MB (più conservativo, evita lock su file enormi)
const MAX_ROWS_PROCESSED = 150_000; // cap di sicurezza per il parser
const POOL_SIZE = 1; // sequenziale: fetch CSV da portali comunali può essere lento
const REQUEST_DELAY_MS = 500; // throttle per CSV diretti (Worker MCP non rate-limited)
const SUPPORTED_FORMATS = new Set(["JSON", "JSONL", "CSV"]);

// CKAN MCP Worker su Cloudflare: bypassa il WAF di dati.gov.it che blocca i runner
// GitHub Actions. Il Worker gira su rete Cloudflare ed è accettato dal WAF.
// Endpoint MCP via JSON-RPC HTTP semplice — niente SDK necessario.
const MCP_WORKER_URL = "https://ckan-mcp-server.datigovit.workers.dev/mcp";

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
  // Usato per scaricare CSV/JSON dei dataset dai portali comunali.
  // Retry: 3 tentativi su errori di rete o 5xx (server publisher instabile,
  // tipico Lecce con dati.comune.lecce.it che dà 503 spesso).
  // No retry su 4xx (404, 410 = link rotto, non recuperabile).
  const MAX_RETRIES = 3;
  let result = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const r = await fetchWithTimeout(url);
      if (r.status >= 500 && attempt < MAX_RETRIES) {
        const backoff = 2000 * attempt;
        warn(`  ⚠ HTTP ${r.status} (try ${attempt}/${MAX_RETRIES}), retry in ${backoff/1000}s`);
        await new Promise(rs => setTimeout(rs, backoff));
        continue;
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
      if (attempt < MAX_RETRIES) {
        const backoff = 2000 * attempt;
        warn(`  ⚠ ${e.name} (try ${attempt}/${MAX_RETRIES}), retry in ${backoff/1000}s`);
        await new Promise(rs => setTimeout(rs, backoff));
        continue;
      }
      warn(`  ✗ ${e.name}: ${e.message}`);
      break;
    }
  }

  if (REQUEST_DELAY_MS > 0) await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  return result;
}

async function fetchPackage(ckanServer, slug) {
  // Uso il CKAN MCP Worker (Cloudflare) come proxy: dati.gov.it blocca i runner
  // GitHub Actions con WAF, ma accetta richieste da Cloudflare.
  // Il Worker espone tools MCP via JSON-RPC HTTP semplice.
  try {
    const r = await fetchWithTimeout(MCP_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "ckan_package_show",
          arguments: {
            server_url: ckanServer,
            id: slug,
            response_format: "json",
          },
        },
      }),
    });
    if (!r.ok) {
      warn(`  ✗ Worker HTTP ${r.status} per ${slug}`);
      return null;
    }
    const body = await r.json();
    // La risposta MCP ha la forma:
    // { result: { content: [ { type:"text", text: "<json string>" } ] } }
    if (body.error) {
      warn(`  ✗ Worker error: ${body.error.message || JSON.stringify(body.error)}`);
      return null;
    }
    const content = body.result?.content?.[0]?.text;
    if (!content) {
      warn(`  ✗ Worker response senza content`);
      return null;
    }
    const pkg = JSON.parse(content);
    return pkg;
  } catch (e) {
    warn(`  ✗ Worker fetch ${e.name}: ${e.message}`);
    return null;
  }
}

// ── Resource picking ──────────────────────────────────────────────────────────
function pickBestResource(resources) {
  if (!resources || !resources.length) return null;
  const formatPriority = { JSON: 1, CSV: 2, JSONL: 2, XLS: 3, XLSX: 3 };
  // Hosting priority: Google Drive/Sheets sono i più affidabili per i runner
  // GitHub Actions. dati.comune.lecce.it è instabile (503 frequenti).
  // I link goo.gl/... sono morti dal 2025-03 (HTTP 410).
  function hostingPriority(url) {
    if (!url) return 99;
    if (url.includes("docs.google.com") || url.includes("drive.google.com")) return 1;
    if (url.includes("goo.gl/")) return 99; // shortener Google dismesso, dà 410
    if (url.startsWith("http://")) return 5; // HTTP non garantisce nulla, ma prova
    return 3; // HTTPS standard
  }
  const sorted = [...resources].sort((a, b) => {
    const fa = formatPriority[(a.format || "").toUpperCase()] || 99;
    const fb = formatPriority[(b.format || "").toUpperCase()] || 99;
    if (fa !== fb) return fa - fb;
    return hostingPriority(a.url) - hostingPriority(b.url);
  });
  return sorted[0];
}

// Limita la dimensione dei download da portali Opendatasoft (Bologna) aggiungendo
// `?limit=N` alla URL /exports/{json,csv}. Questo è cruciale per dataset enormi
// come popolazione Bologna (40+ anni, milioni di righe). 50.000 righe sono più
// che sufficienti per le metriche aggregate calcolate dai calculator.
function smartUrl(rawUrl, dsKey) {
  if (!rawUrl) return rawUrl;
  // Pattern Opendatasoft: /api/v2/catalog/datasets/<slug>/exports/<format>
  const odsMatch = rawUrl.match(/\/api\/v2\/catalog\/datasets\/([^/]+)\/exports\/(json|csv|jsonl)/);
  if (!odsMatch) return rawUrl;
  const slug = odsMatch[1];
  const base = rawUrl.split('/exports/')[0];

  // CASO SPECIALE: popolazione su Opendatasoft. Il dataset Bologna ha 1M+ righe
  // disaggregate per età×cittadinanza×quartiere×sesso. Per evitare di processare
  // un milione di righe e sommarle lato calculator, chiediamo già aggregato per
  // anno via API records con SELECT/GROUP BY.
  if (dsKey === 'popolazione') {
    return `${base}/records?select=anno,sum(residenti)+AS+residenti&group_by=anno&order_by=anno&limit=200`;
  }

  // CASO SPECIALE: welfare-interventi Bologna (servizi_sociali). Dataset di 75k+
  // record disaggregato per (categoria × intervento × cittadinanza × utente).
  // Aggreghiamo lato server per (yyyymm × categoria) → ~120 righe.
  // yyyymm è in formato "2024 marzo" (ITA), il calcolatore estrae l'anno.
  if (dsKey === 'servizi_sociali' && /welfare|c_a9447d4f8a46/.test(slug)) {
    return `${base}/records?select=yyyymm,categoria,count(id_cartella)+AS+utenti,sum(euro_contributi_economici)+AS+spesa_euro&group_by=yyyymm,categoria&limit=500`;
  }

  // Default: aumenta il limite all'export massivo
  const sep = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${sep}limit=${MAX_ROWS_PROCESSED}`;
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
    if (Array.isArray(obj)) return flattenOdsRecords(obj);
    if (obj && typeof obj === "object") {
      for (const key of ["records", "results", "data"]) {
        if (Array.isArray(obj[key])) return flattenOdsRecords(obj[key]);
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
    return flattenOdsRecords(out);
  }
}

// Opendatasoft API records ritorna [{ record: { fields: {...} } }]. Appiattiamo
// per uniformare con CSV/JSONL standard.
function flattenOdsRecords(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  if (arr[0] && typeof arr[0] === "object" && arr[0].record && arr[0].record.fields) {
    return arr.map(r => r.record.fields);
  }
  return arr;
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

  // STATIC FIXTURE: il Comune ha mode=static_snapshot e questo dataset
  // è marcato __fixture__:<key>. Leggo il CSV da data/fixtures/<comune>/<key>.csv
  // invece di fare fetch HTTP. Caso d'uso: Lecce, server publisher giù dai
  // runner GitHub per geo-fencing IP.
  if (slug && typeof slug === 'string' && slug.startsWith('__fixture__:')) {
    const fixtureKey = slug.slice('__fixture__:'.length);
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const fixturePath = path.resolve('data', 'fixtures', comuneKey, fixtureKey + '.csv');
    out.resource_url = `data/fixtures/${comuneKey}/${fixtureKey}.csv`;
    out.resource_format = "CSV";
    out.is_static_snapshot = true;
    let text;
    try {
      text = await fs.readFile(fixturePath, 'utf8');
    } catch (e) {
      out.status = "fetch_error";
      out.error = `Fixture non trovata: ${fixturePath}`;
      out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
      return out;
    }
    let rows;
    try {
      rows = parseCSV(text);
    } catch (e) {
      out.status = "parse_error";
      out.error = `Errore parsing fixture: ${e.message}`;
      out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
      return out;
    }
    if (!rows.length) {
      out.status = "parse_error";
      out.error = "Fixture vuota";
      out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
      return out;
    }
    if (rows.length > MAX_ROWS_PROCESSED) {
      out.n_rows_total = rows.length;
      rows = rows.slice(0, MAX_ROWS_PROCESSED);
      out.truncated = true;
    }
    out.n_rows = rows.length;
    // Per snapshot statico, "modified" è la snapshot_date del Comune.
    // Verrà valorizzata dopo, quando il chiamante propaga il metadata.
    return finalizeRows(out, rows, metricCfg);
  }

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

  // Skip preventivo: link goo.gl/... sono dismessi (HTTP 410 dal 2025-03-25,
  // il servizio Google URL Shortener è stato chiuso definitivamente).
  if (res.url && res.url.includes("goo.gl/")) {
    out.status = "fetch_error";
    out.error = "Link goo.gl dismesso (Google URL Shortener chiuso 2025-03-25)";
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  // Skip preventivo: se nessuna risorsa ha un formato supportato, non
  // sprechiamo tempo a scaricare WMS/RDF/SHP/etc che poi non parseremmo.
  const fmt0 = (res.format || "").toUpperCase();
  if (!SUPPORTED_FORMATS.has(fmt0)) {
    out.status = "unsupported_format";
    out.error = `Formato ${fmt0} non parsabile (richiesti: JSON, JSONL, CSV)`;
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  // Applica smartUrl: per portali Opendatasoft aggiunge ?limit=N
  const fetchUrl = smartUrl(res.url, dsKey);
  if (fetchUrl !== res.url) {
    out.resource_url_fetched = fetchUrl;
  }
  const text = await httpGetText(fetchUrl);
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

  // Detect ZIP magic bytes (PK\x03\x04). Firenze dichiara CSV ma serve ZIP
  // contenente CSV+metadati. Senza unzip non possiamo parsificare.
  if (text.length >= 4 && text.charCodeAt(0) === 0x50 && text.charCodeAt(1) === 0x4B
      && (text.charCodeAt(2) === 0x03 || text.charCodeAt(2) === 0x05 || text.charCodeAt(2) === 0x07)) {
    out.status = "unsupported_format";
    out.error = `Risorsa dichiarata ${res.format} ma il file è un archivio ZIP (impossibile parsificare senza unzip)`;
    out.metrics = Object.fromEntries((metricCfg.kpi || []).map(k => [k, null]));
    return out;
  }

  // Parse
  let fmt = (res.format || "").toUpperCase();
  // Se smartUrl ha riscritto l'URL verso /records (API Opendatasoft con
  // aggregazione server-side), il body è JSON anche se la risorsa era
  // dichiarata CSV. Detection: testo inizia con "{" o "[".
  const trimmed = text.trimStart();
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && fmt === 'CSV') {
    fmt = 'JSON';
  }
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

  // Cap su MAX_ROWS_PROCESSED: per dataset enormi (es. welfare 75k) tagliamo
  // a 50k per non far esplodere i tempi di calcolo. Le metriche restano
  // statisticamente significative.
  let truncated = false;
  if (rows.length > MAX_ROWS_PROCESSED) {
    out.n_rows_total = rows.length;
    rows = rows.slice(0, MAX_ROWS_PROCESSED);
    truncated = true;
  }

  out.n_rows = rows.length;
  if (truncated) out.truncated = true;
  return finalizeRows(out, rows, metricCfg);
}

// Calcola fields_present/missing + invoca calculator. Usato sia per fetch
// HTTP normale sia per fixture statiche (Lecce mode=static_snapshot).
function finalizeRows(out, rows, metricCfg) {
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

// =============================================================================
// NUOVO MODELLO (Fase A): Comune con manifest.yml + CSV canonici
// =============================================================================
//
// Una cartella data/comuni/<comune>/ con manifest.yml e (opzionalmente) CSV
// canonici descritti in schemas/csv/. Per ogni dataset CORE il manifest
// dichiara source_type:
//
//   - "fixture":               CSV statico nel repo, path: <dataset>.csv
//   - "external_csv":          fetch HTTP di un CSV esterno
//   - "opendatasoft_aggregate": fetch /records?select=...&group_by=...
//
// Tutti i CSV vengono validati contro schemas/csv/<dataset>.csv-schema.json
// prima del calcolo. CSV invalidi → status: "schema_error".
//
// Coesistenza con vecchio modello: il main() prima processa i Comuni con
// manifest.yml, poi quelli in comuni.yml (Bologna, Lecce). Output identico.
// =============================================================================

const MANIFEST_FILENAME = "manifest.yml";

function comuniManifestDirs() {
  if (!existsSync(COMUNI_DIR)) return [];
  return readdirSync(COMUNI_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith("_"))
    .map(d => d.name)
    .filter(name => existsSync(join(COMUNI_DIR, name, MANIFEST_FILENAME)));
}

async function fetchExternalCsv(url) {
  const r = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  if (text.length === 0) throw new Error("Risposta vuota");
  if (text.trimStart().startsWith("<")) {
    throw new Error("Server ha restituito HTML invece di CSV");
  }
  if (text.length >= 4 && text.charCodeAt(0) === 0x50 && text.charCodeAt(1) === 0x4B) {
    throw new Error("Risorsa è un archivio ZIP, non un CSV");
  }
  return text;
}

async function processManifestDataset(comuneKey, dsKey, dsDecl, manifestDir) {
  const out = {
    dataset_key: dsKey,
    fetched_at: new Date().toISOString(),
    status: "ok",
    modified: dsDecl.aggiornato || null,
    freshness: { level: "unknown", months: null, iso: null },
    n_rows: null,
    metrics: null,
    resource_url: dsDecl.url || dsDecl.path || null,
    resource_format: "CSV",
    source_type: dsDecl.source_type,
    source_origin: dsDecl.source_origin || null,
    source_note: dsDecl.source_note || null,
    source_url: dsDecl.source_url || null,
    error: null,
  };
  if (out.modified) out.freshness = freshness(out.modified);

  if (dsDecl.presente === false || dsDecl.source_type === "not_published_no_national_source") {
    out.status = "not_published";
    if (dsDecl.note || dsDecl.motivo) out.error = dsDecl.note || dsDecl.motivo;
    return out;
  }

  let schema;
  try {
    schema = loadSchema(dsKey);
  } catch (e) {
    out.status = "schema_error";
    out.error = `Schema CSV canonico non trovato per dataset '${dsKey}'`;
    return out;
  }

  let csvText;
  try {
    if (dsDecl.source_type === "fixture") {
      // Supporta sia 'path' (relativo a manifest dir) sia 'fixture' (relativo
      // alla repo root, comodo per Comuni che attingono a fixture comuni).
      let csvPath;
      if (dsDecl.fixture) {
        csvPath = join(ROOT, dsDecl.fixture);
      } else {
        csvPath = join(manifestDir, dsDecl.path || `${dsKey}.csv`);
      }
      if (!existsSync(csvPath)) throw new Error(`File non trovato: ${csvPath}`);
      csvText = readFileSync(csvPath, "utf8");
    } else if (dsDecl.source_type === "external_csv" || dsDecl.source_type === "opendatasoft_aggregate") {
      if (!dsDecl.url) throw new Error(`source_type=${dsDecl.source_type} ma 'url' mancante`);
      csvText = await fetchExternalCsv(dsDecl.url);
    } else {
      throw new Error(`source_type sconosciuto: '${dsDecl.source_type}'`);
    }
  } catch (e) {
    out.status = "fetch_error";
    out.error = e.message;
    return out;
  }

  const valid = validateCsv(csvText, schema);
  if (!valid.ok) {
    out.status = "schema_error";
    out.error = `CSV non conforme allo schema canonico (${valid.errors.length} errori). Primi 3: ` +
      valid.errors.slice(0, 3).join(' | ');
    out.schema_errors = valid.errors.slice(0, 20);
    return out;
  }

  const rows = parseCSV(csvText);
  out.n_rows = rows.length;
  out.fields_present = valid.headers;

  const calc = CALCULATORS_V2[dsKey];
  if (!calc) {
    out.status = "no_calculator";
    out.error = `Calculator v2 non trovato per dataset '${dsKey}'`;
    return out;
  }
  try {
    out.metrics = calc(rows);
  } catch (e) {
    out.status = "calc_error";
    out.error = `Errore calcolo metriche: ${e.message}`;
    return out;
  }

  log(`  ✓ [v2] ${dsKey} rows=${rows.length} source=${dsDecl.source_type}`);
  return out;
}

async function processManifestComune(comuneKey) {
  const manifestDir = join(COMUNI_DIR, comuneKey);
  const manifestPath = join(manifestDir, MANIFEST_FILENAME);
  const manifest = parseYaml(readFileSync(manifestPath, "utf8"));

  log(`\n=== Comune (manifest): ${comuneKey} (${manifest.nome}) ===`);

  const comuneOut = {
    key: comuneKey,
    nome: manifest.nome,
    ipa: manifest.ipa,
    istat: manifest.istat,
    popolazione_attesa: manifest.popolazione_attesa,
    mandato: manifest.mandato,
    sindaco: manifest.sindaco,
    mappa_center: manifest.mappa_center,
    mappa_zoom: manifest.mappa_zoom,
    mode: manifest.mode || "manifest",
    snapshot_date: manifest.snapshot_date || null,
    snapshot_reason: manifest.snapshot_reason || null,
    paniere_version: manifest.paniere_version || "csv-v1",
    datasets: {},
  };

  const datasets = manifest.datasets || {};
  for (const [dsKey, dsDecl] of Object.entries(datasets)) {
    if (!dsDecl || typeof dsDecl !== 'object') continue;
    comuneOut.datasets[dsKey] = await processManifestDataset(comuneKey, dsKey, dsDecl, manifestDir);
  }

  const outPath = join(COMUNI_DIR, `${comuneKey}.json`);
  writeFileSync(outPath, JSON.stringify(comuneOut, null, 2), "utf-8");
  log(`→ data/comuni/${comuneKey}.json (manifest mode)`);

  return comuneOut;
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

  // -------------------------------------------------------------------
  // FASE 1: Comuni con manifest.yml (NUOVO MODELLO CSV CANONICO)
  // -------------------------------------------------------------------
  // Sono Comuni che hanno data/comuni/<key>/manifest.yml e CSV canonici.
  // Il modello target a regime: ogni nuovo Comune si aggiunge con una PR
  // che crea la cartella, niente codice da modificare.
  const manifestComuni = comuniManifestDirs();
  if (manifestComuni.length > 0) {
    log(`\n--- Trovati ${manifestComuni.length} Comuni con manifest.yml: ${manifestComuni.join(', ')} ---`);
    for (const comuneKey of manifestComuni) {
      try {
        const comuneOut = await processManifestComune(comuneKey);
        dashboard.comuni[comuneKey] = {
          key: comuneKey,
          nome: comuneOut.nome,
          ipa: comuneOut.ipa,
          mode: comuneOut.mode,
          snapshot_date: comuneOut.snapshot_date,
          paniere_version: comuneOut.paniere_version,
          n_datasets_pubblicati: Object.values(comuneOut.datasets)
            .filter(d => d.status !== "not_published").length,
          n_datasets_totali: Object.keys(comuneOut.datasets).length,
          n_datasets_ok: Object.values(comuneOut.datasets)
            .filter(d => d.status === "ok").length,
        };
      } catch (e) {
        warn(`Errore manifest ${comuneKey}: ${e.message}`);
      }
    }
  }

  // -------------------------------------------------------------------
  // FASE 2: Comuni in comuni.yml (VECCHIO MODELLO — Bologna, Lecce)
  // -------------------------------------------------------------------
  // Manteniamo il code-path attuale per Bologna (live API Opendatasoft)
  // e Lecce (mode static_snapshot con fixture in data/fixtures/lecce/).
  // Skip per Comuni già processati via manifest.
  for (const [comuneKey, comune] of Object.entries(comuniCfg.comuni || {})) {
    if (manifestComuni.includes(comuneKey)) {
      log(`(${comuneKey} già processato via manifest, skip comuni.yml)`);
      continue;
    }
    log(`\n=== Comune (legacy): ${comuneKey} (${comune.nome}) ===`);
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
      mode: comune.mode || "live",
      snapshot_date: comune.snapshot_date || null,
      snapshot_reason: comune.snapshot_reason || null,
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

    // Propago snapshot_date come "modified" ai dataset fixture (così la
    // dashboard può calcolare la freshness del fixture)
    if (comune.mode === "static_snapshot" && comune.snapshot_date) {
      for (const ds of Object.values(comuneOut.datasets)) {
        if (ds.is_static_snapshot && !ds.modified) {
          ds.modified = comune.snapshot_date;
          ds.freshness = freshness(comune.snapshot_date);
        }
      }
    }

    const outPath = join(COMUNI_DIR, `${comuneKey}.json`);
    writeFileSync(outPath, JSON.stringify(comuneOut, null, 2), "utf-8");
    log(`→ data/comuni/${comuneKey}.json`);

    dashboard.comuni[comuneKey] = {
      key: comuneKey,
      nome: comuneOut.nome,
      ipa: comuneOut.ipa,
      mode: comuneOut.mode,
      snapshot_date: comuneOut.snapshot_date,
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
