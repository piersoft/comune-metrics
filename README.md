# ComuneMetrics — Cruscotto Civico Comunale

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Paniere v2.13](https://img.shields.io/badge/Paniere-v2.13-blue)](docs/PANIERE.md)
[![DCAT-AP_IT](https://img.shields.io/badge/DCAT--AP__IT-2.1-green)](https://docs.italia.it/AgID/documenti-in-consultazione/lg-cataloghi-opendata-docs/it/bozza/profilo-DCAT-AP_IT.html)
[![PA italiana](https://img.shields.io/badge/Vocabolari%20e%20ontologie%20PA-compliant-blue)](https://schema.gov.it)

Piattaforma open source per il **monitoraggio dell'attività amministrativa di un Comune**, alimentata da un paniere standardizzato di OpenData. Strumento di **controllo di gestione** e **rendicontazione politica di mandato**, replicabile in qualunque Comune italiano.

> **L'idea**: definire 11 dataset CORE che il Comune deve pubblicare per "accendere" la dashboard. Più dataset pubblica → migliore badge di trasparenza. Killer application per forzare l'apertura dei dati.

## In due righe

1. **Tu Comune**: pubblichi gli 11 CSV del paniere conformi allo schema → ottieni il badge VERDE/ORO
2. **Tu cittadino**: apri la dashboard del tuo Comune → vedi i KPI di mandato in tempo reale

## Componenti del progetto

| Componente | Cosa fa | File |
|---|---|---|
| **Paniere** | Specifica dei 11 dataset CORE con schema CSV, mapping ai vocabolari e ontologie della PA italiana, esempi Turtle | [`docs/PANIERE.md`](docs/PANIERE.md) |
| **JSON Schema** | Validatori automatici dei CSV (Draft 2020-12) | [`schemas/*.json`](schemas/) |
| **Dashboard** | Cruscotto single-file HTML con KPI, grafici Chart.js, mappe Leaflet | [`index.html`](index.html) |
| **Badge system** | ROSSO (0-3) → GIALLO (4-7) → ARANCIONE (8-10) → VERDE (11) → ORO (11+TTL) | dentro `index.html` |

## I 4 Comuni di riferimento (esempi reali)

La dashboard MVP carica dati estratti da dataset realmente pubblicati su `dati.gov.it`:

| Comune | IPA | Dataset CORE pubblicati | Badge attuale |
|---|---|---|---|
| **Bologna** | `c_a944` | 9/11 | 🟠 Avanzata |
| **Firenze** | `c_d612` | 8/11 | 🟠 Avanzata |
| **Torino** | `c_l219` | 4/11 | 🟡 Media |
| **Messina** | `c_e463` | 4/11 | 🟡 Media |

## Quick start

### Per visualizzare la dashboard

```bash
git clone https://github.com/<your-org>/comune-metrics
cd comune-metrics
python3 -m http.server 8080
# apri http://localhost:8080
```

Oppure pubblica su GitHub Pages (single-file HTML, zero backend).

### Per validare un CSV del paniere

```bash
pip install jsonschema

python3 - <<'EOF'
import json, csv
from jsonschema import Draft202012Validator

with open('schemas/rifiuti.schema.json') as f: schema = json.load(f)
with open('data/rifiuti.csv') as f: rows = list(csv.DictReader(f))
# (convertire i tipi numerici, vedi schemas/README.md)
errors = list(Draft202012Validator(schema).iter_errors(rows))
print(f"{'OK' if not errors else 'FAIL'} - {len(errors)} errori")
EOF
```

### Per pubblicare il paniere come Comune

1. Genera gli 11 CSV secondo gli schemi in `/schemas/`
2. Valida ogni CSV con il validatore JSON Schema
3. Genera la distribuzione TTL via [piersoft/CSV-to-RDF](https://github.com/piersoft/CSV-to-RDF) (vocabolari/ontologie PA italiana + DCAT-AP_IT)
4. Pubblica su CKAN aggiungendo extras:
   - `paniere_comunemetrics: true`
   - `paniere_dataset_id: <nome>` (es. `popolazione`)
   - `paniere_versione_schema: 2.1`
5. Inserisci il tuo Comune nel `comune-select` della dashboard

## I 11 dataset CORE

| # | Dataset | Tema EU | Frequenza | Ontologie PA italiana |
|---|---|---|---|---|
| 1 | popolazione | SOCI | Annuale | QB + SKOS + CLV |
| 2 | bilancio | ECON | Annuale | QB + SKOS + COV |
| 3 | opere_pubbliche | ECON | Trimestrale | CPSV-AP + CLV + TI + POI |
| 4 | pratiche_edilizie | GOVE | Trimestrale | CPSV-AP + TI + CLV + SKOS |
| 5 | servizi_sociali | SOCI | Annuale | CPSV-AP + QB + SKOS |
| 6 | istruzione | EDUC | Annuale | Cultural-ON + POI + CLV + TI |
| 7 | incidenti_stradali | TRAN | Mensile | QB + CLV + TI + SKOS |
| 8 | rifiuti | ENVI | Mensile | QB + SKOS + CLV |
| 9 | eventi_culturali | EDUC | Trimestrale | Cultural-ON + POI + CLV + TI |
| 10 | delibere | GOVE | Mensile | CPSV-AP + TI + COV + RO + ADMS |
| 11 | patrimonio | GOVE | Annuale | POI + CLV + SKOS |

Per ognuno: schema CSV completo, mapping per-campo a proprietà RDF dei vocabolari e ontologie della PA italiana, esempio Turtle reale, KPI calcolabili. Tutti i dettagli in [`docs/PANIERE.md`](docs/PANIERE.md).

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│  COMUNE                                                     │
│  ┌────────┐  ┌──────────┐  ┌───────────────┐                │
│  │ Sistemi│→ │ ETL      │→ │ 11 CSV paniere│                │
│  │ interni│  │ comune   │  │ + 11 TTL      │                │
│  └────────┘  └──────────┘  └───────┬───────┘                │
│                                    │                        │
│                                    ↓                        │
│                              ┌───────────┐                  │
│                              │ CKAN locale│                 │
│                              │ extras:    │                 │
│                              │ paniere:tru│                 │
│                              └─────┬─────┘                  │
└──────────────────────────────────────┼──────────────────────┘
                                       │ harvest DCAT-AP_IT
                                       ↓
┌──────────────────────────────────────────────────────────────┐
│  dati.gov.it                                                 │
│  └─ federazione nazionale, MQA scoring, Linked Open Data     │
└──────────────────────────────────────┬───────────────────────┘
                                       │ fetch / SPARQL
                                       ↓
┌──────────────────────────────────────────────────────────────┐
│  ComuneMetrics dashboard (single HTML)                       │
│  ├─ Loader CKAN (legge extras_paniere_comunemetrics:true)    │
│  ├─ Validator JSON Schema (Draft 2020-12)                    │
│  ├─ KPI Engine (~60 indicatori calcolati)                    │
│  ├─ Charts (Chart.js)                                        │
│  └─ Maps (Leaflet + OpenStreetMap)                           │
└──────────────────────────────────────────────────────────────┘
```

## Perché funziona come "killer application"

Il meccanismo è **gamification dell'OpenData**:

- Nessun Comune vuole il badge ROSSO 🔴 sul suo cruscotto pubblico
- Pubblicare i dataset mancanti per passare a 🟢 VERDE è uno **sforzo limitato** e **misurabile** (15 colonne CSV per dataset)
- I cittadini diffondono i confronti tra Comuni → **pressione reputazionale**
- L'ente politico responsabile può rivendicare il badge come **risultato di mandato**
- I dataset rilasciati restano patrimonio comune → **effetto esternalità positiva** sul resto della PA

## Standard di riferimento

- **DCAT-AP_IT v2.1** — metadati dataset
- **Vocabolari controllati e ontologie della PA italiana** ([schema.gov.it](https://schema.gov.it)) — 15 ontologie italiane (CLV, COV, CPV, POI, SM, RO, TI, ADMS, ACCO, PARK, GTFS, Cultural-ON, CPSV-AP, QB, SKOS)
- **W3C WGS84** — coordinate (`geo:lat` / `geo:long`)
- **JSON Schema Draft 2020-12** — validazione CSV
- **Codici IPA** — identità Comuni (IndicePA AgID)
- **DM 18/04/2012** — armonizzazione bilanci EELL
- **D.Lgs. 36/2023** — codice contratti pubblici (CUP/CIG ANAC)
- **D.Lgs. 33/2013** — trasparenza
- **D.Lgs. 42/2004** — vincoli culturali (patrimonio)

## Onestà metodologica (v0.1 → v0.2)

ComuneMetrics v0.1 è un **MVP dimostrativo**. È importante distinguere cosa è verificato da cosa è simulato:

**Verificato sulle fonti reali:**
- La **conformità** di ciascun Comune al paniere (badge ROSSO/GIALLO/ARANCIONE/VERDE) si basa sulla **presenza effettiva** dei 11 dataset CORE su `dati.gov.it`, verificata con chiamate API CKAN (`package_show`)
- Gli **slug** dei dataset cablati nei link footer sono quelli machine-readable persistenti (`name` field)
- La **freschezza** mostrata dalle card colorate (FRESCO/DATATO/OBSOLETO) è il valore reale di `dcat:modified` letto da `package_show`

**Simulato (mock data):**
- I **valori KPI** (totali, percentuali, importi) e i **dati dei grafici** (Chart.js, Leaflet) sono **dati di esempio plausibili**, NON letti dai CSV reali
- Molti campi attesi nei mock NON esistono nei CSV reali. Esempi:
  - eventi: nessun dataset comunale espone "spesa patrocini" o "% gratuiti"
  - lavori in corso Bologna: NON contiene CUP, importo, SAL, fonte di finanziamento (solo descrizione, indirizzo, date)
  - rifiuti Bologna: solo % differenziata per quartiere, non kg per frazione
  - asili Bologna: solo numero iscritti, non posti totali né lista d'attesa

**Cosa farà la v0.2:**
- Loader CKAN reale via Cloudflare Worker proxy (CORS)
- Lettura CSV reali e ricostruzione delle sole metriche effettivamente derivabili dai campi disponibili
- I grafici si semplificheranno: meno KPI ma 100% verificabili
- Una nuova sezione del paniere ("campi attesi vs campi reali") aiuterà i Comuni a estendere il proprio CSV per coprire le metriche civiche più rilevanti (es. CUP/importo per opere, accolto/respinto per pratiche)

Il banner giallo in cima al sito e il ribbon "DATI DI ESEMPIO" su ogni KPI ricordano costantemente al visitatore questa distinzione.

## Roadmap

- [x] **v0.1** — Paniere v2.13 + 11 JSON Schema + Dashboard MVP single-file
- [ ] **v0.2** — Loader CKAN reale via proxy CORS (Cloudflare Worker)
- [ ] **v0.3** — Federazione SPARQL: query cross-Comune via lod.dati.gov.it
- [ ] **v0.4** — Modulo "rendicontazione di mandato" con confronto inizio/fine consiliatura
- [ ] **v0.5** — Paniere ESTESO opzionale (GTFS, ACCO, PARK, aria via SOSA/SSN, ITP, FOIA)
- [ ] **v1.0** — Adozione formale da parte di un primo Comune pilota

## Crediti

Progetto ideato e sviluppato da [Piersoft](https://github.com/piersoft).

Si appoggia agli strumenti già pubblicati:
- [piersoft/CSV-to-RDF](https://github.com/piersoft/CSV-to-RDF) — generatore TTL conforme ai vocabolari/ontologie della PA italiana
- [piersoft/ckan-opendata-assistant](https://github.com/piersoft/ckan-opendata-assistant) — dashboard dati.gov.it monitoring
- [piersoft/dae-puglia-rdf](https://github.com/piersoft/dae-puglia-rdf) — pattern per pipeline RDF/Linked Open Data

## Licenza

MIT.

I dataset prodotti dai Comuni adottanti sono raccomandati in **CC-BY 4.0** o **IODL 2.0**.
