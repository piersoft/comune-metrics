# ComuneMetrics

Cruscotto civico per Comuni italiani basato su un **paniere standardizzato di 14 dataset OpenData**. Ogni Comune che adotta il paniere ottiene una dashboard pubblica con grafici, mappa e KPI di mandato.

**Dashboard live**: https://piersoft.github.io/comune-metrics/

---

## I 4 Comuni attualmente nel cruscotto

| Comune | Dataset OK | Modalità | Note |
|---|---|---|---|
| **Comune IDEALE** | 14/14 | manifest CSV | Riferimento canonico: struttura CSV perfettamente allineata agli schemi del paniere |
| **Bologna** | 11/14 | live API | Portale Opendatasoft con API aggregations |
| **Lecce** | 12/14 | snapshot statico | Comune in passato virtuoso, ora portale con limiti tecnici (HTTP, geo-fencing) |
| **Potenza** | 8/14 | ricostruzione da fonti nazionali | Il Comune non pubblica OpenData propri: i dati visibili sono ricostruiti da banche dati ministeriali (ISTAT, MEF/BDAP, MIM, ISPRA, MiC) |

**Il Comune IDEALE è il modello di riferimento** che ogni Comune deve seguire alla lettera per allineare struttura CSV e nomi colonna agli schemi canonici. Replicando la sua impostazione, un Comune nuovo arriva senza fatica al 14/14.

---

## I 14 dataset CORE del paniere

| # | Dataset | Cosa contiene | File CSV |
|---|---|---|---|
| 1 | Popolazione | Residenti per anno e quartiere | `popolazione.csv` |
| 2 | Bilancio | Spesa per Titolo e macro-aggregato | `bilancio.csv` |
| 3 | Opere pubbliche | Cantieri con CUP, importo, geo | `opere_pubbliche.csv` |
| 4 | Pratiche edilizie | CILA/SCIA/PdC con esito | `pratiche_edilizie.csv` |
| 5 | Servizi sociali | Utenti e spesa per categoria | `servizi_sociali.csv` |
| 6 | Istruzione | Scuole, iscritti, geo | `istruzione.csv` |
| 7 | Incidenti stradali | Sinistri con vittime e geo | `incidenti_stradali.csv` |
| 8 | Rifiuti | RD% e quantità raccolte per frazione | `rifiuti.csv` |
| 9 | Eventi culturali | Manifestazioni con geo | `eventi_culturali.csv` |
| 10 | Delibere | Atti dell'albo pretorio | `delibere.csv` |
| 11 | Patrimonio | Immobili comunali con valore | `patrimonio.csv` |
| 12 | Tributi | Gettito e aliquote IMU/TARI/tassa soggiorno/addizionale IRPEF | `tributi.csv` |

Il Comune **non deve** pubblicarli tutti per essere visibile: i dataset mancanti vengono dichiarati `presente: false` nel manifest.

Schemi formali completi in [`schemas/csv/`](schemas/csv/) — specifica leggibile in [`PANIERE_CSV_SCHEMA.md`](docs/PANIERE_CSV_SCHEMA.md).

**Per i Comuni**: la [guida pratica](docs/PANIERE.md) spiega come ricavare i CSV partendo dai gestionali interni (anagrafe, finanziaria, SUE, polizia locale, ecc.) e a quale ufficio rivolgersi per ciascun dataset.

---

## Linked Open Data — pubblica i tuoi dati come RDF

I 14 dataset del Comune Ideale producono TTL semanticamente corretti su classi come `qb:Observation` (popolazione, rifiuti), `pc:Contract` (opere pubbliche), `cpsv:PublicService` (pratiche edilizie, bilancio), `cpev:PublicEvent` (eventi culturali), `tr:TransparencyObligation` (delibere), `smapit:School` (istruzione), `ch:CulturalHeritage` (patrimonio), `indicator:Indicator` (tributi), `poi:PointOfInterest` (defibrillatori), `park:CarPark` (parcheggi).

Tabella completa con link diretti per generare ogni TTL: [docs/PANIERE_CSV_SCHEMA.md](docs/PANIERE_CSV_SCHEMA.md#linked-open-data--esposizione-semantica-dcat-apit). I 14 TTL pre-generati come ground-truth: [tests/expected-ttl/](tests/expected-ttl/).

---

## Documentazione

Il progetto ha quattro documenti, ciascuno con uno scopo distinto:

- **[README.md](README.md)** *(questo file)* — pitch del progetto, elenco dei Comuni nel cruscotto, lista dei 14 dataset CORE e procedura passo-passo per aggiungere il proprio Comune.
- **[docs/PANIERE.md](docs/PANIERE.md)** — il manifesto del paniere: cosa contiene ognuno dei 14 dataset CORE, perché è stato scelto, fonti dati tipiche per un Comune italiano, esposizione come Linked Open Data 5 stelle.
- **[docs/PANIERE_CSV_SCHEMA.md](docs/PANIERE_CSV_SCHEMA.md)** — riferimento tecnico per il publisher: schema canonico colonna-per-colonna di ogni CSV, validazione, esempi pronti da copiare, tabella completa di mapping CSV → ontologie semantiche.
- **[tests/expected-ttl/README.md](tests/expected-ttl/README.md)** — i 14 file TTL ground-truth: esempi pre-generati di output Linked Open Data corretto, da usare come gold standard per validare la propria pipeline di conversione CSV → RDF.

In sintesi: parti dal **README** per capire cos'è e come aderire, leggi **PANIERE.md** per capire il *cosa* e il *perché*, consulta **PANIERE_CSV_SCHEMA.md** quando devi preparare i tuoi CSV, usa **expected-ttl** come gold standard se vuoi anche il livello Linked Open Data.

---

## Come aggiungere il tuo Comune (procedura passo-passo)

### Passo 1 — Fork del repository

Vai su https://github.com/piersoft/comune-metrics e clicca **Fork**.

Clona il fork in locale:
```bash
git clone https://github.com/<tuo-utente>/comune-metrics.git
cd comune-metrics
```

### Passo 2 — Crea la cartella del tuo Comune

Copia la cartella `demo` (il **Comune IDEALE**, modello di riferimento) come base di partenza:
```bash
cp -r data/comuni/demo data/comuni/<chiave-comune>
```

Esempio per Parma:
```bash
cp -r data/comuni/demo data/comuni/parma
```

La chiave deve essere uno **slug** (lettere minuscole, niente spazi, niente accenti).

### Passo 3 — Modifica `manifest.yml`

Apri `data/comuni/<chiave-comune>/manifest.yml` e cambia:

```yaml
nome: "Parma"                # Nome del Comune
ipa: "c_g337"                 # Codice IPA (cerca su indicepa.gov.it)
istat: "034027"               # Codice ISTAT
popolazione_attesa: 198292    # Residenti attuali
mandato: "2022-2027"          # Mandato del sindaco
sindaco: "Michele Guerra"     # Nome sindaco

mappa_center: [44.8015, 10.3279]  # [latitudine, longitudine] del centro
mappa_zoom: 13

paniere_version: "csv-v1"
```

Per ogni dataset, scegli **una** delle 3 forme:

**Forma A — CSV nel repo** (per Comuni piccoli, ~MB di dati):
```yaml
popolazione:
  source_type: fixture
  aggiornato: "2024-12-31"
  fonte: "Anagrafe comunale"
```
Metti il file `popolazione.csv` nella stessa cartella.

**Forma B — URL esterno** (per Comuni grandi, dati che cambiano):
```yaml
popolazione:
  source_type: external_csv
  url: "https://opendata.comune.parma.it/dataset/popolazione-residente-al-1-gennaio-2025/resource/ac707546-bd05-4ddb-9de7-0c2357ef7aca"
  aggiornato: "2025-05-26"
  fonte: "Portale OpenData del Comune di Parma"
```

**Forma C — Dataset non pubblicato**:
```yaml
patrimonio:
  presente: false
  motivo: "In fase di pubblicazione"
```

### Passo 4 — Prepara i CSV nel formato canonico

Ogni CSV **deve rispettare lo schema** in `schemas/csv/<dataset>.csv-schema.json`.

Regole **obbligatorie** per tutti i CSV:
- Encoding **UTF-8**
- Separatore **virgola** `,` (o punto e virgola `;`)
- Separatore decimale **punto** `.` (mai virgola italiana)
- Date in formato **YYYY-MM-DD**
- **Header esatti** come da schema (case-sensitive)
- Niente colonne extra non previste dallo schema

Esempio `popolazione.csv` minimo:
```csv
anno,residenti
2024,198292
2023,198000
2022,197000
```

Esempio `bilancio.csv` con classificazione DLgs 118/2011:
```csv
anno,missione,programma,importo_euro
2024,"Servizi istituzionali","Organi istituzionali",1250000.50
2024,"Istruzione e diritto allo studio","Istruzione prescolastica",8900000.00
```

I CSV del **Comune IDEALE** sono il riferimento canonico: vedi [`data/comuni/demo/`](data/comuni/demo/) (la cartella si chiama ancora "demo" per ragioni storiche, ma rappresenta il Comune Ideale).

### Passo 5 — Valida i CSV in locale

Prima di committare, verifica che ogni CSV sia conforme:

```bash
node scripts/validate_csv.js popolazione data/comuni/parma/popolazione.csv
# ✓ OK data/comuni/parma/popolazione.csv — 6 righe, 3 colonne

node scripts/validate_csv.js bilancio data/comuni/parma/bilancio.csv
node scripts/validate_csv.js opere_pubbliche data/comuni/parma/opere_pubbliche.csv
# ... uno per ogni dataset
```

Se compaiono errori, leggi il messaggio (indica riga e colonna) e correggi il CSV.

### Passo 6 — Committa e pubblica sul tuo fork

Aggiungi i file e committa sul tuo fork:

```bash
git add data/comuni/parma/
git commit -m "feat: aggiungo Comune di Parma al paniere"
git push origin main
```

`origin` punta al tuo fork (impostato dal `git clone` del Passo 1), quindi `git push` carica il commit nel **tuo repository**.

### Passo 7 — Valida e attiva la tua dashboard pubblica

Sul tuo fork, vai su `Actions` e parte automaticamente il workflow [`validate-paniere.yml`](.github/workflows/validate-paniere.yml) che verifica:
- I CSV rispettano gli schemi canonici
- Il `manifest.yml` ha tutti i campi obbligatori
- I `source_type` sono validi

Se la validazione fallisce, leggi i log (tab `Actions → validate-paniere`), correggi i CSV in locale, fai un nuovo `git commit` e `git push` — il workflow rigira automaticamente.

Quando i check sono verdi, **attiva la tua dashboard**:

1. Su `Settings → Pages`: abilita GitHub Pages selezionando il branch `main` e cartella `/` (root)
2. Su `Actions → Build dashboard data → Run workflow`: lancia la rigenerazione dei dati
3. Dopo qualche minuto la tua dashboard è online su `https://<tuo-utente>.github.io/comune-metrics/`

Il fork è **completamente autonomo**: workflow, dati e pagina pubblica vivono tutti nel tuo repository, sotto il tuo controllo. Niente passaggi intermedi, niente attese, niente dipendenze da terzi.

---

## Aggiornare i dati nel tempo

Hai due opzioni:

### Opzione 1 — Aggiornamento manuale (Comuni piccoli)

Quando hai dati nuovi, aggiorni i CSV nel tuo fork (`git add`, `git commit`, `git push origin main`). Poi vai su `Actions → Build dashboard data → Run workflow` per rigenerare la dashboard. Dopo qualche minuto la tua pagina pubblica riflette i nuovi dati.

### Opzione 2 — URL esterno (auto-refresh)

Se usi `source_type: external_csv` con un URL pubblico, il builder fa fetch del CSV ad ogni esecuzione del workflow. Il Comune deve solo mantenere aggiornato il CSV al suo URL: la dashboard si rigenera con i dati nuovi al successivo run del workflow.

> ⚙️ **Nota sui trigger del workflow `build-data.yml`**: di default il workflow è in modalità **solo manuale** (`workflow_dispatch`). I trigger automatici (cron settimanale, push su `main`) sono commentati nel file ma documentati e riattivabili modificando `.github/workflows/build-data.yml` sul tuo fork.

---

## Validazione: cosa rifiuta il workflow

Esempi di errori che **bloccano** il build (messaggi reali del validatore):

| Errore | Messaggio |
|---|---|
| Colonna inattesa | `Colonna sconosciuta: 'citta' (ammesse: anno, residenti, quartiere)` |
| Anno fuori range | `riga 2: campo 'anno' = 1850 < minimum 1900` |
| Data non ISO | `riga 2: campo 'data' = '15/01/2024' non è una data YYYY-MM-DD` |
| Pattern violato | `riga 2: campo 'cup' = 'C84D1900060002' non rispetta il pattern` |
| Tipo sbagliato | `riga 2: campo 'residenti' = 'abc' deve essere intero` |
| Campo obbligatorio mancante | `riga 2: campo obbligatorio 'anno' mancante` |

**La validazione è hard**: anche un solo errore blocca il build. È fatta apposta per garantire qualità.

---

## Casi speciali (Bologna, Lecce, Potenza)

Tre Comuni sono nel cruscotto con un code-path diverso dal manifest CSV standard:
- **Bologna** usa direttamente l'API Opendatasoft del proprio portale (caso unico in Italia)
- **Lecce** ha fixture committate a mano perché il portale non risponde dai runner GitHub
- **Potenza** non pubblica OpenData propri: i dati sono ricostruiti da banche dati nazionali (`mode: reconstructed_from_national`) e il banner rosso lo segnala in dashboard

Questi tre casi sono mantenuti per **rendere visibili anche i Comuni non virtuosi** o tecnicamente bloccati. **Tutti i nuovi Comuni che pubblicano OpenData usano il manifest CSV** descritto sopra.

---

## Tecnologie

- **Builder**: Node.js (>=18) puro, niente dipendenze esterne
- **Dashboard**: HTML + Chart.js + Leaflet, single-file
- **Validatore**: JSON Schema Draft 2020-12
- **CI**: GitHub Actions
- **Hosting**: GitHub Pages (gratis)

Costo zero per il Comune. Costo zero per il tool.

---

## Licenza

Codice: MIT.
Dati: ogni Comune mantiene la licenza originale dei propri dataset (tipicamente CC-BY 4.0).

---

## Contatti

Issue tracker: https://github.com/piersoft/comune-metrics/issues
Maintainer: [@piersoft](https://github.com/piersoft) (Francesco Piero Paolicelli)
