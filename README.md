# ComuneMetrics

Cruscotto civico per Comuni italiani basato su un **paniere standardizzato di 11 dataset OpenData**. Ogni Comune che adotta il paniere ottiene una dashboard pubblica con grafici, mappa e KPI di mandato.

**Dashboard live**: https://piersoft.github.io/comune-metrics/

---

## I 3 Comuni attualmente nel cruscotto

| Comune | Dataset OK | Modalità | Note |
|---|---|---|---|
| **Comune IDEALE** | 12/12 | manifest CSV | Riferimento canonico: struttura CSV perfettamente allineata agli schemi del paniere |
| **Bologna** | 9/12 | live API | Portale Opendatasoft con API aggregations |
| **Lecce** | 11/12 | snapshot statico | Comune in passato virtuoso, ora portale con limiti tecnici (HTTP, geo-fencing) |

**Il Comune IDEALE è il modello di riferimento** che ogni Comune deve seguire alla lettera per allineare struttura CSV e nomi colonna agli schemi canonici. Replicando la sua impostazione, un Comune nuovo arriva senza fatica al 12/12.

---

## I 11 dataset CORE del paniere

| # | Dataset | Cosa contiene | File CSV |
|---|---|---|---|
| 1 | Popolazione | Residenti per anno e quartiere | `popolazione.csv` |
| 2 | Bilancio | Spesa per missione e programma | `bilancio.csv` |
| 3 | Opere pubbliche | Cantieri con CUP, importo, geo | `opere_pubbliche.csv` |
| 4 | Pratiche edilizie | CILA/SCIA/PdC con esito | `pratiche_edilizie.csv` |
| 5 | Servizi sociali | Utenti e spesa per categoria | `servizi_sociali.csv` |
| 6 | Istruzione | Scuole, iscritti, geo | `istruzione.csv` |
| 7 | Incidenti stradali | Sinistri con vittime e geo | `incidenti_stradali.csv` |
| 8 | Rifiuti | RD% e quantità raccolte | `rifiuti.csv` |
| 9 | Eventi culturali | Manifestazioni con geo | `eventi_culturali.csv` |
| 10 | Delibere | Atti dell'albo pretorio | `delibere.csv` |
| 11 | Patrimonio | Immobili comunali con valore | `patrimonio.csv` |

Il Comune **non deve** pubblicarli tutti per essere visibile: i dataset mancanti vengono dichiarati `presente: false` nel manifest.

Schemi formali completi in [`schemas/csv/`](schemas/csv/) — specifica leggibile in [`docs/PANIERE_CSV_SCHEMA.md`](docs/PANIERE_CSV_SCHEMA.md).

**Per i Comuni**: la [guida pratica `docs/PANIERE.md`](docs/PANIERE.md) spiega come ricavare i CSV partendo dai gestionali interni (anagrafe, finanziaria, SUE, polizia locale, ecc.) con esempi di query SQL.

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
  url: "https://opendata.comune.parma.it/datasets/popolazione.csv"
  aggiornato: "2024-12-31"
  fonte: "Portale OpenData del Comune"
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

Crea un branch dedicato sul tuo fork, committa, e pushalo:

```bash
git checkout -b add-comune-parma
git add data/comuni/parma/
git commit -m "feat: aggiungo Comune di Parma al paniere"
git push origin add-comune-parma
```

`origin` punta al tuo fork (impostato dal `git clone` del Passo 1), quindi `git push` carica il branch nel **tuo repository**, non nel repo originale.

Vai su `https://github.com/<tuo-utente>/comune-metrics` — GitHub mostra un avviso giallo "Compare & pull request". Clicca quel pulsante.

Nella schermata di apertura della PR, verifica che:
- **base repository**: `piersoft/comune-metrics` — branch `main`
- **head repository**: `<tuo-utente>/comune-metrics` — branch `add-comune-parma`

Inserisci una breve descrizione (es. "Aggiungo il Comune di Parma con 7 dataset CORE pubblicati") e clicca **Create pull request**.

### Passo 7 — La GitHub Action valida tutto

Quando apri la PR, parte automaticamente il workflow [`validate-paniere.yml`](.github/workflows/validate-paniere.yml) che verifica:
- I CSV rispettano gli schemi canonici
- Il `manifest.yml` ha tutti i campi obbligatori
- I `source_type` sono validi

Se tutto è verde, il maintainer del repo `piersoft/comune-metrics` revisiona e mergia la PR. Dopo il merge, entro pochi minuti il workflow `build-data.yml` rigenera i dati e la dashboard, e il tuo Comune compare su https://piersoft.github.io/comune-metrics/.

Se la GitHub Action fallisce, leggi i log (tab "Checks" della PR), correggi i CSV nel tuo branch locale, fai un nuovo `git commit` e `git push origin add-comune-parma` — la PR si aggiorna automaticamente e il workflow rigira.

---

## Aggiornare i dati nel tempo

Hai due opzioni:

### Opzione 1 — Aggiornamento manuale (Comuni piccoli)

Quando hai dati nuovi, aggiorni il CSV nel tuo fork e apri una nuova PR. Il workflow rigenera automaticamente.

### Opzione 2 — URL esterno (auto-refresh)

Se usi `source_type: external_csv` con un URL pubblico, ComuneMetrics fa fetch del CSV **ad ogni run del workflow** (settimanale, oppure ad ogni push, oppure manuale). Il Comune deve solo mantenere aggiornato il CSV al suo URL.

Il workflow gira automaticamente:
- Ogni domenica alle 3 UTC (cron)
- Ad ogni push su `main` (modifiche a script o config)
- Su trigger manuale dalla pagina Actions

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

## Casi speciali (Bologna, Lecce)

Bologna e Lecce sono nel cruscotto da prima dell'introduzione del modello federato e usano un code-path legacy:
- **Bologna** usa direttamente l'API Opendatasoft del proprio portale (caso unico in Italia)
- **Lecce** ha fixture committate a mano perché il portale non risponde dai runner GitHub

Questi due casi sono **mantenuti per ragioni storiche** ma non sono il modello da seguire. **Tutti i nuovi Comuni usano il manifest CSV** descritto sopra.

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
