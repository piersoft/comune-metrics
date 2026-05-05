# Paniere CSV — Schema Canonico v1

> Specifica del formato CSV richiesto per la pubblicazione dei dataset CORE nel cruscotto ComuneMetrics.

## Filosofia

Il **Paniere CSV** è uno standard **federato e replicabile**. Ogni Comune produce CSV nel formato canonico documentato qui; il cruscotto li legge senza richiedere alias, sinonimi, o adattamenti specifici per portale.

A differenza del modello v1 (che era pieno di sinonimi colonne accumulati per ogni nuovo Comune), il modello v2 (questa specifica) impone:

- **Nomi colonne canonici** (case-sensitive, senza alias)
- **Validazione obbligatoria** prima del calcolo (CSV non conformi rifiutati)
- **Pochi vincoli, ma rigidi** (UTF-8, punto decimale, date ISO)

Questo permette al tool di funzionare per **N Comuni senza modifiche al codice**.

## Vincoli tecnici

| Vincolo | Valore |
|---|---|
| Encoding | UTF-8 obbligatorio (no BOM, no Latin-1, no Windows-1252) |
| Separatore di colonna | virgola `,` (preferita) o punto e virgola `;` (auto-detect) |
| Separatore decimale | solo punto `.` (mai virgola italiana) |
| Date | formato `YYYY-MM-DD` (ISO 8601) |
| Header | nomi colonne ESATTI come da schema, case-sensitive |
| Colonne sconosciute | NON ammesse (rifiuta validazione) |
| Campi quotati | virgolette doppie `"..."` per valori con virgole/quote |
| Escape virgolette | doppie virgolette `""` dentro campi quotati |

## I 11 dataset CORE

Schemi formali in [`schemas/csv/`](../schemas/csv/). Riepilogo:

### 1. `popolazione.csv`
**Required**: `anno` (1900-2050), `residenti` (intero ≥0)
**Optional**: `quartiere`, `sesso` (M/F/Totale), `fascia_eta`
**Esempio**:
```csv
anno,residenti,quartiere
2024,55421,Navile
2024,42183,Borgo Panigale
```

### 2. `bilancio.csv`
**Required**: `anno`, `missione`, `importo_euro`
**Optional**: `programma`, `tipo` (previsione/impegno/pagamento/consuntivo), `macroaggregato`
**Esempio**:
```csv
anno,missione,programma,importo_euro
2024,"Servizi istituzionali","Organi istituzionali",1250000.50
```

### 3. `opere_pubbliche.csv`
**Required**: `nome`
**Optional**: `anno`, `stato`, `importo_euro`, `cup`, `lat`, `lon`, `fonte_finanziamento`, `tipo`
**Note**: il CUP, se presente, deve seguire il pattern 15 caratteri standard CIPESS

### 4. `pratiche_edilizie.csv`
**Required**: `data` (YYYY-MM-DD)
**Optional**: `tipo`, `esito`, `data_chiusura`, `indirizzo`, `quartiere`
**Note**: `data_chiusura` vuota = pratica ancora aperta

### 5. `servizi_sociali.csv`
**Required**: `anno`, `categoria`
**Optional**: `utenti`, `spesa_euro`, `tipo_intervento`
**Note**: almeno `utenti` o `spesa_euro` deve essere compilato

### 6. `istruzione.csv`
**Required**: `struttura`
**Optional**: `anno_scolastico`, `tipo_struttura` (Asilo nido/Infanzia/Primaria/...), `iscritti`, `lat`, `lon`, `indirizzo`, `quartiere`, `gestione` (Statale/Comunale/Paritaria/Privata), `mensa`

### 7. `incidenti_stradali.csv`
**Required**: `data`
**Optional**: `lat`, `lon`, `morti`, `feriti`, `zona`, `tipo`, `veicoli_coinvolti`

### 8. `rifiuti.csv`
**Required**: `anno`
**Optional**: `rd_pct` (0-100), `kg_totali`, `kg_differenziata`, `kg_indifferenziata`, `frazione`, `cer`, `quartiere`

### 9. `eventi_culturali.csv`
**Required**: `nome`
**Optional**: `data_inizio`, `data_fine`, `categoria`, `luogo`, `indirizzo`, `lat`, `lon`, `quartiere`, `ingresso` (Gratuito/A pagamento/Su prenotazione), `organizzatore`

### 10. `delibere.csv`
**Required**: `data`
**Optional**: `tipo` (Delibera Giunta/Consiglio, Determina dirigenziale, Ordinanza, Decreto sindacale), `numero`, `oggetto`, `ufficio`, `url`

### 11. `patrimonio.csv`
**Required**: `denominazione`
**Optional**: `tipo`, `indirizzo`, `lat`, `lon`, `valore_euro`, `destinazione_uso`, `vincolo_culturale` (Sì/No), `stato_giuridico`, `superficie_mq`, `foglio_catastale`, `particella`

## Validazione

### CLI

```bash
node scripts/validate_csv.js <dataset> <path/file.csv>
```

Esempio output OK:
```
✓ CSV valido (6 righe, 3 colonne, delimiter=',')
  Headers: anno, residenti, quartiere
```

Esempio output FAIL:
```
✗ CSV non valido (4 errori):
  - Riga 2, colonna 'data': data non in formato YYYY-MM-DD: '15/01/2024'
  - Riga 2, colonna 'lon': valore 37924 sopra il massimo 180
  - Riga 2, colonna 'morti': non è un intero: '18.15166'
  - Riga 3, colonna 'lat': valore 200 sopra il massimo 90
```

### CI (GitHub Actions)

Su ogni PR che tocchi `data/comuni/<key>/manifest.yml` o un CSV, il workflow `validate-paniere.yml` esegue:
1. `validateCsv()` su ogni CSV trovato
2. Validazione struttura `manifest.yml` (campi obbligatori, source_type ammessi)
3. Se anche un solo file fallisce → PR FAIL, no merge

## FAQ

**D: Il mio CSV ha le colonne giuste ma con maiuscole/minuscole diverse (`Anno` invece di `anno`). Funziona?**
R: No. I nomi sono case-sensitive. Rinomina le colonne nel formato canonico.

**D: Ho dati storici fino al 1700 (es. catasto storico). Funzionano?**
R: No, il vincolo è `1900-2050`. Filtra prima di esportare il CSV.

**D: Posso aggiungere colonne mie oltre a quelle dello schema?**
R: No, vengono rifiutate. Se ti serve una colonna nuova, apri una issue per discutere l'estensione dello schema canonico.

**D: La virgola decimale italiana (`12,5`) viene accettata?**
R: No, solo il punto. Sostituisci `12,5` → `12.5` prima dell'export.

**D: Devo avere tutti gli 11 dataset?**
R: No. Dichiara `presente: false` nei dataset che non pubblichi. La dashboard mostra "Non pubblicato dal Comune" per quelli mancanti.

**D: Posso usare un URL HTTPS pubblico invece di committare il CSV?**
R: Sì, usa `source_type: external_csv` con `url:` nel manifest. Il builder fa fetch ad ogni run del workflow.

## Versionamento

Versione corrente: **csv-v1**.

Eventuali modifiche allo schema saranno versionate (`csv-v2`, `csv-v3`, ...) con periodo di deprecazione e fallback. Il manifest dichiara `paniere_version: "csv-v1"` per tracciare la compatibilità.
