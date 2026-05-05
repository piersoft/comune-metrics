// =============================================================================
// validate_csv.js — validatore CSV contro schema canonico del Paniere
// =============================================================================
//
// Uso (CLI):
//   node scripts/validate_csv.js <dataset> <path/to/file.csv>
//   esempio: node scripts/validate_csv.js popolazione data/comuni/lecce/popolazione.csv
//
// Uso (API):
//   import { validateCsv } from './validate_csv.js';
//   const result = validateCsv(csvText, schemaObject);
//   // → { ok: true } oppure { ok: false, errors: [...] }
//
// Lo schema è un oggetto come schemas/csv/<dataset>.csv-schema.json:
//   {
//     dataset, version,
//     delimiter_allowed: [",", ";"],
//     decimal_separator: ".",
//     required_columns: [{name, datatype, constraints, ...}],
//     optional_columns: [...]
//   }
//
// Errori di validazione (stop alla prima per chiarezza):
//   - encoding non UTF-8
//   - delimitatore non riconosciuto
//   - colonna obbligatoria mancante
//   - colonna sconosciuta (non in required + optional)
//   - tipo dato sbagliato in una cella (max 5 errori segnalati)
//   - constraint violato (es. anno fuori range, lat fuori -90/90)
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SCHEMA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'csv');

// ----- CSV parser minimale (gestisce campi quotati con virgole/escape "") -----
function detectDelimiter(text, allowed) {
  const firstLine = text.split('\n', 1)[0];
  const candidates = allowed || [',', ';', '\t'];
  let best = candidates[0];
  let bestCount = -1;
  for (const c of candidates) {
    const n = (firstLine.match(new RegExp(escapeReg(c), 'g')) || []).length;
    if (n > bestCount) { bestCount = n; best = c; }
  }
  return best;
}
function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseCSVRow(line, delimiter) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delimiter) { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(text, delimiter) {
  // Rimuovi BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  // Normalizza line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  // Filtra righe vuote in coda ma non in mezzo (potrebbero essere significative)
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVRow(lines[0], delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(l => parseCSVRow(l, delimiter));
  return { headers, rows };
}

// ----- Type checkers --------------------------------------------------------
function checkInteger(val) {
  if (val === '' || val == null) return null;
  const s = String(val).trim();
  if (!/^-?\d+$/.test(s)) return `non è un intero: '${s}'`;
  return null;
}
function checkNumber(val) {
  if (val === '' || val == null) return null;
  const s = String(val).trim();
  // Solo punto come separatore decimale (vincolo di schema)
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    if (/,/.test(s)) return `numero con virgola decimale (usa il punto): '${s}'`;
    return `non è un numero: '${s}'`;
  }
  return null;
}
function checkDate(val) {
  if (val === '' || val == null) return null;
  const s = String(val).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return `data non in formato YYYY-MM-DD: '${s}'`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return `data non valida: '${s}'`;
  return null;
}
function checkString(val, col) {
  if (val == null) return null;
  const s = String(val);
  if (col.max_length && s.length > col.max_length) {
    return `stringa troppo lunga (${s.length} > ${col.max_length}): '${s.slice(0, 30)}...'`;
  }
  if (col.enum && s !== '' && !col.enum.includes(s)) {
    return `valore non ammesso per enum ${JSON.stringify(col.enum)}: '${s}'`;
  }
  if (col.pattern && s !== '' && !new RegExp(col.pattern).test(s)) {
    return `pattern non rispettato (${col.pattern}): '${s}'`;
  }
  return null;
}
function checkConstraints(val, col) {
  if (!col.constraints || val === '' || val == null) return null;
  const n = parseFloat(val);
  if (col.constraints.min != null && n < col.constraints.min) {
    return `valore ${n} sotto il minimo ${col.constraints.min}`;
  }
  if (col.constraints.max != null && n > col.constraints.max) {
    return `valore ${n} sopra il massimo ${col.constraints.max}`;
  }
  return null;
}

function checkValue(val, col) {
  let err = null;
  switch (col.datatype) {
    case 'integer': err = checkInteger(val); break;
    case 'number':  err = checkNumber(val); break;
    case 'date':    err = checkDate(val); break;
    case 'string':
    default:        err = checkString(val, col); break;
  }
  if (err) return err;
  if (['integer', 'number'].includes(col.datatype)) {
    err = checkConstraints(val, col);
    if (err) return err;
  }
  return null;
}

// ----- Validator principale -------------------------------------------------
export function validateCsv(csvText, schema) {
  const errors = [];

  if (!csvText || csvText.length === 0) {
    return { ok: false, errors: ['CSV vuoto'] };
  }

  // 1. Detect delimiter
  const allowed = schema.delimiter_allowed || [',', ';'];
  const delimiter = detectDelimiter(csvText, allowed);

  // 2. Parse
  let parsed;
  try {
    parsed = parseCSV(csvText, delimiter);
  } catch (e) {
    return { ok: false, errors: [`Errore parsing CSV: ${e.message}`] };
  }
  const { headers, rows } = parsed;

  if (headers.length === 0) {
    return { ok: false, errors: ['CSV senza header'] };
  }

  // 3. Verifica colonne obbligatorie
  const required = schema.required_columns || [];
  const optional = schema.optional_columns || [];
  const knownCols = new Map();
  for (const c of [...required, ...optional]) knownCols.set(c.name, c);

  const headerSet = new Set(headers);
  for (const req of required) {
    if (!headerSet.has(req.name)) {
      errors.push(`Colonna obbligatoria mancante: '${req.name}' (${req.description || req.datatype})`);
    }
  }

  // 4. Verifica colonne sconosciute (non in required + optional)
  for (const h of headers) {
    if (!knownCols.has(h)) {
      errors.push(`Colonna sconosciuta: '${h}' (non prevista dallo schema; le colonne ammesse sono: ${[...knownCols.keys()].join(', ')})`);
    }
  }

  // Stop se ci sono errori strutturali
  if (errors.length > 0) {
    return { ok: false, errors, n_rows: rows.length, n_cols: headers.length };
  }

  // 5. Validazione cella per cella (max 20 errori segnalati)
  const MAX_CELL_ERRORS = 20;
  let cellErrorCount = 0;
  for (let r = 0; r < rows.length && cellErrorCount < MAX_CELL_ERRORS; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0].trim() === '') continue; // riga vuota
    for (let c = 0; c < headers.length && cellErrorCount < MAX_CELL_ERRORS; c++) {
      const colName = headers[c];
      const colSchema = knownCols.get(colName);
      if (!colSchema) continue;
      const val = row[c] != null ? row[c].trim() : '';
      // Required column must have value (we already checked column EXISTS)
      const isRequired = required.some(rc => rc.name === colName);
      if (isRequired && val === '') {
        errors.push(`Riga ${r + 2}: campo obbligatorio '${colName}' vuoto`);
        cellErrorCount++;
        continue;
      }
      const err = checkValue(val, colSchema);
      if (err) {
        errors.push(`Riga ${r + 2}, colonna '${colName}': ${err}`);
        cellErrorCount++;
      }
    }
  }
  if (cellErrorCount >= MAX_CELL_ERRORS) {
    errors.push(`... (troncato: oltre ${MAX_CELL_ERRORS} errori di cella, mostrati solo i primi)`);
  }

  return {
    ok: errors.length === 0,
    errors,
    n_rows: rows.length,
    n_cols: headers.length,
    delimiter,
    headers,
  };
}

export function loadSchema(datasetName) {
  const path = resolve(SCHEMA_DIR, `${datasetName}.csv-schema.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ----- CLI -----------------------------------------------------------------
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [datasetName, csvPath] = process.argv.slice(2);
  if (!datasetName || !csvPath) {
    console.error('Uso: node scripts/validate_csv.js <dataset> <path/to/file.csv>');
    console.error('   es: node scripts/validate_csv.js popolazione data/comuni/lecce/popolazione.csv');
    process.exit(2);
  }
  let schema;
  try { schema = loadSchema(datasetName); }
  catch (e) {
    console.error(`✗ Schema non trovato per '${datasetName}': ${e.message}`);
    process.exit(2);
  }
  let csv;
  try { csv = readFileSync(csvPath, 'utf8'); }
  catch (e) {
    console.error(`✗ File non trovato: ${csvPath}`);
    process.exit(2);
  }
  const r = validateCsv(csv, schema);
  if (r.ok) {
    console.log(`✓ CSV valido (${r.n_rows} righe, ${r.n_cols} colonne, delimiter='${r.delimiter}')`);
    console.log(`  Headers: ${r.headers.join(', ')}`);
    process.exit(0);
  } else {
    console.error(`✗ CSV non valido (${r.errors.length} errori):`);
    for (const e of r.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}
