// =============================================================================
// validate_csv.js — validatore CSV contro JSON Schema (Draft 2020-12)
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SCHEMA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'csv');

function detectDelimiter(text) {
  const firstLine = text.split('\n', 1)[0];
  const candidates = [',', ';', '\t'];
  let best = ',', bestCount = -1;
  for (const c of candidates) {
    const n = (firstLine.match(new RegExp(escapeReg(c), 'g')) || []).length;
    if (n > bestCount) { bestCount = n; best = c; }
  }
  return best;
}
function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseCsvText(text, delim) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function coerceValue(rawStr, propSchema) {
  if (rawStr === '' || rawStr === undefined || rawStr === null) return null;
  const types = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
  if (types.includes('integer')) {
    const n = parseInt(rawStr, 10);
    if (Number.isFinite(n) && String(n) === rawStr.trim()) return n;
  }
  if (types.includes('number')) {
    const cleaned = rawStr.replace(',', '.');
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) return n;
  }
  if (types.includes('boolean')) {
    const s = rawStr.toLowerCase();
    if (s === 'true' || s === '1' || s === 'sì' || s === 'si') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  if (types.includes('string')) return rawStr;
  return rawStr;
}

function validateValue(value, schema, fieldName, rowIdx) {
  const errors = [];
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (value === null) {
    if (!types.includes('null')) {
      errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' è vuoto ma non ammesso null`);
    }
    return errors;
  }
  const actualType = typeof value === 'number' ?
    (Number.isInteger(value) ? 'integer' : 'number') :
    typeof value;
  const typeOk = types.includes(actualType) ||
    (actualType === 'integer' && types.includes('number'));
  if (!typeOk) {
    errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' = '${value}' (atteso ${types.filter(t => t !== 'null').join('/')}, trovato ${actualType})`);
    return errors;
  }
  if ((actualType === 'integer' || actualType === 'number') && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' = ${value} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum)
      errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' = ${value} > maximum ${schema.maximum}`);
  }
  if (actualType === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' troppo corto (< ${schema.minLength})`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' troppo lungo (> ${schema.maxLength})`);
    if (schema.enum && !schema.enum.includes(value))
      errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' = '${value}' non in enum`);
    if (schema.pattern) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value))
        errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' non matcha pattern`);
    }
    if (schema.format === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        errors.push(`riga ${rowIdx + 2}: campo '${fieldName}' = '${value}' non è una data YYYY-MM-DD`);
    }
  }
  return errors;
}

export function validateCsv(csvText, schema) {
  const errors = [];
  if (!csvText || csvText.trim() === '') {
    return { ok: false, errors: ['CSV vuoto'], n_rows: 0, headers: [] };
  }
  const items = schema.items || {};
  const props = items.properties || {};
  const required = items.required || [];
  const additionalProps = items.additionalProperties !== false;
  const knownCols = Object.keys(props);

  const delim = detectDelimiter(csvText);
  const rows = parseCsvText(csvText, delim);
  if (rows.length < 1) return { ok: false, errors: ['CSV senza header'], n_rows: 0, headers: [] };
  const headers = rows[0].map(h => h.trim());

  for (const req of required) {
    if (!headers.includes(req)) errors.push(`Colonna obbligatoria mancante: '${req}'`);
  }
  if (!additionalProps) {
    for (const h of headers) {
      if (!knownCols.includes(h)) {
        errors.push(`Colonna sconosciuta: '${h}' (ammesse: ${knownCols.join(', ')})`);
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors, n_rows: rows.length - 1, headers };

  const MAX_CELL_ERRORS = 20;
  const dataRows = rows.slice(1);
  outer: for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (row.length === 1 && row[0].trim() === '') continue;
    for (let c = 0; c < headers.length; c++) {
      const fieldName = headers[c];
      const propSchema = props[fieldName];
      if (!propSchema) continue;
      const rawStr = (row[c] !== undefined ? row[c] : '').trim();
      if (rawStr === '' && !required.includes(fieldName)) continue;
      if (rawStr === '' && required.includes(fieldName)) {
        errors.push(`riga ${r + 2}: campo obbligatorio '${fieldName}' è vuoto`);
        if (errors.length >= MAX_CELL_ERRORS) break outer;
        continue;
      }
      const value = coerceValue(rawStr, propSchema);
      const cellErrors = validateValue(value, propSchema, fieldName, r);
      for (const e of cellErrors) {
        errors.push(e);
        if (errors.length >= MAX_CELL_ERRORS) break outer;
      }
    }
  }

  return { ok: errors.length === 0, errors, n_rows: dataRows.length, headers };
}

export function loadSchema(datasetName) {
  const path = resolve(SCHEMA_DIR, `${datasetName}.csv-schema.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] && process.argv[1].endsWith('validate_csv.js')) {
  const [datasetName, csvPath] = process.argv.slice(2);
  if (!datasetName || !csvPath) {
    console.error('Uso: node scripts/validate_csv.js <dataset> <csv-path>');
    process.exit(1);
  }
  let schema;
  try { schema = loadSchema(datasetName); }
  catch (e) { console.error(`Schema non trovato per '${datasetName}'`); process.exit(1); }
  const csvText = readFileSync(csvPath, 'utf8');
  const result = validateCsv(csvText, schema);
  if (result.ok) {
    console.log(`✓ OK ${csvPath} — ${result.n_rows} righe, ${result.headers.length} colonne`);
    process.exit(0);
  } else {
    console.log(`✗ INVALID ${csvPath} — ${result.errors.length} errori:`);
    for (const e of result.errors.slice(0, 30)) console.log(`  - ${e}`);
    process.exit(2);
  }
}
