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

### Passo 6 — Apri pull request

Aggiungi i file e committa sul tuo fork:

```bash
git add data/comuni/parma/
git commit -m "feat: aggiungo Comune di Parma al paniere"
git push origin main
```

`origin` punta al tuo fork (impostato dal `git clone` del Passo 1), quindi `git push` carica il commit nel **tuo repository**, non nel repo originale.

Vai su `https://github.com/<tuo-utente>/comune-metrics` — GitHub mostra un avviso giallo "Compare & pull request". Clicca quel pulsante.

Nella schermata di apertura della PR, verifica che:
- **base repository**: `piersoft/comune-metrics` — branch `main`
- **head repository**: `<tuo-utente>/comune-metrics` — branch `main`

Inserisci una breve descrizione (es. "Aggiungo il Comune di Parma con 7 dataset CORE pubblicati") e clicca **Create pull request**.

> 💡 **Variante consigliata se prevedi di contribuire ancora in futuro**: invece di lavorare direttamente sul `main` del tuo fork, crea un branch dedicato (`git checkout -b add-comune-parma` prima del commit, poi `git push origin add-comune-parma`). Così il `main` del tuo fork resta allineato all'upstream `piersoft/comune-metrics` e puoi aprire più PR contemporaneamente. Per una sola contribuzione una tantum, lavorare su `main` è perfettamente OK.

### Passo 7 — La GitHub Action valida tutto

Quando apri la PR, parte automaticamente il workflow [`validate-paniere.yml`](.github/workflows/validate-paniere.yml) che verifica:
- I CSV rispettano gli schemi canonici
- Il `manifest.yml` ha tutti i campi obbligatori
- I `source_type` sono validi

Se la GitHub Action fallisce, leggi i log (tab "Checks" della PR), correggi i CSV in locale, fai un nuovo `git commit` e `git push` (sullo stesso branch da cui hai aperto la PR) — la PR si aggiorna automaticamente e il workflow rigira.

Quando i check sono verdi, hai due strade indipendenti:

**Strada A — Dashboard sul tuo fork** (consigliata se vuoi una pagina pubblica del tuo Comune sotto il tuo controllo)

Non c'è bisogno di aspettare il merge. Sul tuo fork:
1. Vai su `Settings → Pages` e abilita GitHub Pages dal branch `main`, cartella `/` (root)
2. Vai su `Actions → Build dashboard data → Run workflow` per rigenerare i dati
3. Dopo qualche minuto la dashboard è online su `https://<tuo-utente>.github.io/comune-metrics/`

In questo scenario il fork è **completamente autonomo**: workflow, dati e pagina pubblica vivono tutti nel tuo repository. La PR verso `piersoft/comune-metrics` è opzionale (la apri se vuoi che il tuo Comune compaia anche nella dashboard "vetrina" centrale).

**Strada B — Inclusione nella dashboard centrale**

Se vuoi che il tuo Comune compaia anche su `https://piersoft.github.io/comune-metrics/` (la dashboard "vetrina" multi-Comune mantenuta dall'autore del progetto), aspetta che il maintainer riveda e mergi la PR. Dopo il merge, il workflow `build-data.yml` viene lanciato manualmente sul repo centrale e rigenera la pagina pubblica.

Le due strade non si escludono: puoi avere la tua dashboard sul fork **e** essere incluso nella vetrina centrale.

---

## Aggiornare i dati nel tempo

Hai due opzioni:

### Opzione 1 — Aggiornamento manuale (Comuni piccoli)

Quando hai dati nuovi, aggiorni i CSV sul tuo fork. Poi:
- **se la tua dashboard è sul fork** (Strada A del Passo 7): vai su `Actions → Build dashboard data → Run workflow` per rigenerare. Niente PR necessaria.
- **se vuoi anche aggiornare la vetrina centrale** (Strada B): apri una nuova PR verso `piersoft/comune-metrics`. Dopo il merge, il workflow del repo centrale viene rilanciato manualmente.

### Opzione 2 — URL esterno (auto-refresh)

Se usi `source_type: external_csv` con un URL pubblico, il builder fa fetch del CSV ad ogni esecuzione del workflow. Il Comune deve solo mantenere aggiornato il CSV al suo URL: la dashboard si rigenera con i dati nuovi al successivo run.

> ⚙️ **Nota sui trigger del workflow `build-data.yml`**: nel repository centrale il workflow è impostato in modalità **solo manuale** (`workflow_dispatch`). I trigger automatici (cron settimanale, push su `main`) sono disabilitati per evitare build a vuoto. Sul tuo fork puoi riabilitare gli automatismi modificando `.github/workflows/build-data.yml` (le sezioni `schedule` e `push` sono commentate ma documentate nel file).

---

## Validazione: cosa rifiuta il workflow

Esempi di errori che **bloccano** una PR (messaggi reali del validatore):

| Errore | Messaggio |
|---|---|
| Colonna inattesa | `Colonna sconosciuta: 'citta' (ammesse: anno, residenti, quartiere)` |
| Anno fuori range | `riga 2: campo 'anno' = 1850 < minimum 1900` |
| Data non ISO | `riga 2: campo 'data' = '15/01/2024' non è una data YYYY-MM-DD` |
| Pattern violato | `riga 2: campo 'cup' = 'C84D1900060002' non rispetta il pattern` |
| Tipo sbagliato | `riga 2: campo 'residenti' = 'abc' deve essere intero` |
| Campo obbligatorio mancante | `riga 2: campo obbligatorio 'anno' mancante` |

**La validazione è hard**: anche un solo errore blocca la PR. È fatta apposta per garantire qualità.

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
