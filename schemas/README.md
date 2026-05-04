# JSON Schema — Paniere ComuneMetrics v2.1

Questa cartella contiene gli **11 JSON Schema** (Draft 2020-12) per la validazione automatica dei dataset CSV del paniere ComuneMetrics.

## File

| Schema | Dataset paniere | Frequenza | Tema DCAT-AP_IT |
|---|---|---|---|
| `popolazione.schema.json` | popolazione.csv | Annuale | SOCI |
| `bilancio.schema.json` | bilancio.csv | Annuale | ECON |
| `opere_pubbliche.schema.json` | opere_pubbliche.csv | Trimestrale | ECON |
| `pratiche_edilizie.schema.json` | pratiche_edilizie.csv | Trimestrale | GOVE |
| `servizi_sociali.schema.json` | servizi_sociali.csv | Annuale | SOCI |
| `istruzione.schema.json` | istruzione.csv | Annuale | EDUC |
| `incidenti_stradali.schema.json` | incidenti_stradali.csv | Mensile | TRAN |
| `rifiuti.schema.json` | rifiuti.csv | Mensile | ENVI |
| `eventi_culturali.schema.json` | eventi_culturali.csv | Trimestrale | EDUC |
| `delibere.schema.json` | delibere.csv | Mensile | GOVE |
| `patrimonio.schema.json` | patrimonio.csv | Annuale | GOVE |

## Convenzioni comuni

Ogni schema applica le seguenti regole:

- **`type: array`** — il CSV è un array di record (oggetti)
- **`additionalProperties: false`** — colonne sconosciute fanno fallire la validazione (rigidità voluta del paniere)
- **Campi enum** — i campi categoriali (es. `frazione`, `tipo_pratica`, `stato`) hanno liste chiuse
- **Coordinate** — `lat` ∈ [35.0, 47.5] e `lon` ∈ [6.5, 18.6] (bounding box Italia)
- **Date** — formato ISO 8601 (`YYYY-MM-DD`) tramite `format: date`
- **Importi** — `type: number, minimum: 0` (€, decimali con punto, no separatori migliaia)
- **CUP** — pattern `^[A-Z][0-9]{2}[A-Z][0-9]{11}$` (15 caratteri secondo standard CIPE)
- **CIG** — pattern `^[0-9A-Z]{10}$` (10 caratteri alfanumerici secondo ANAC)

## Uso CLI con Python

```bash
pip install jsonschema

python3 - <<'EOF'
import json, csv
from jsonschema import Draft202012Validator

# Carica schema
with open('schemas/rifiuti.schema.json') as f:
    schema = json.load(f)

# Carica CSV come array di dict
with open('data/rifiuti.csv') as f:
    rows = list(csv.DictReader(f))

# Convertire i tipi (CSV legge sempre stringhe)
for r in rows:
    r['anno'] = int(r['anno'])
    r['mese'] = int(r['mese'])
    r['quantita_kg'] = float(r['quantita_kg'])
    r['popolazione_servita'] = int(r['popolazione_servita'])
    if r.get('costo_totale'):
        r['costo_totale'] = float(r['costo_totale'])

v = Draft202012Validator(schema)
errors = list(v.iter_errors(rows))
if errors:
    for e in errors:
        print(f"Riga {e.json_path}: {e.message}")
else:
    print(f"✓ {len(rows)} record validi")
EOF
```

## Uso CLI con Node.js (Ajv)

```bash
npm install ajv ajv-formats csv-parse
```

```javascript
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync('schemas/rifiuti.schema.json'));
const csv = fs.readFileSync('data/rifiuti.csv');
const rows = parse(csv, { columns: true, cast: true });

const validate = ajv.compile(schema);
if (!validate(rows)) {
  console.error(validate.errors);
} else {
  console.log(`✓ ${rows.length} record validi`);
}
```

## Validazione online

I JSON Schema sono pubblicabili a un URL stabile (es. GitHub Pages della repo `comune-metrics`) e usabili da:

- [JSON Schema Validator (Newtonsoft)](https://www.jsonschemavalidator.net)
- [Hyperjump JSON Schema Validator](https://json-schema.hyperjump.io)
- [check-jsonschema](https://check-jsonschema.readthedocs.io) (pre-commit hook)

## Rapporto con il PANIERE.md

Questi schemi formalizzano in JSON Schema le specifiche descritte in `/docs/PANIERE.md` v2.1. Ogni schema ha un `$id` nello schema URI canonico:

```
https://w3id.org/italia/data/comune-metrics/schemas/{dataset}/v2.1
```

## Test di conformità

Test eseguiti il giorno della release v2.1:

- ✓ Tutti gli 11 schemi conformi a JSON Schema Draft 2020-12
- ✓ Tutti gli 11 schemi accettano i record di esempio del PANIERE.md
- ✓ Tutti gli 11 schemi rifiutano record con `additionalProperties` o `required` mancanti

Lo script di test è in `/scripts/test_schemas.py`.
