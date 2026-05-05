# Paniere CSV — Schema Canonico v2.0

> Specifica del formato CSV richiesto per la pubblicazione dei dataset CORE nel cruscotto ComuneMetrics.

## Changelog v2.0 (allineamento al tool CSV-to-RDF)

In v2.0 i nomi delle colonne sono stati allineati al **dizionario `DET_COL_RULES`** del tool [CSV-to-RDF di Piersoft](https://github.com/piersoft/CSV-to-RDF) per massimizzare la coverage del mapper deterministico zero-token.

**Coverage raggiunta**: 73 colonne su 78 totali del paniere → **93% deterministico** (le 5 restanti hanno semantica unica e vanno via fallback LLM).

### Tabella rinomine (riassunto)

| Dataset | Vecchio nome | Nuovo nome v2.0 | Predicato RDF |
|---|---|---|---|
| bilancio | `missione` | `settore_interv_inv` | `dct:subject@it` |
| bilancio | `importo_euro` | `totale_uscite` | `sdmx-measure:obsValue` |
| bilancio | `programma` | `sottosettore_interv_inv` | `dct:subject@it` |
| delibere | `data` | `data_atto` | `dct:date` |
| delibere | `tipo` | `tipo_atto` | `dct:type@it` |
| delibere | `numero` | `numero_atto` | `dct:identifier` |
| delibere | `ufficio`/`settore` | `uo_proponente` | `dct:publisher@it` |
| eventi_culturali | `data_inizio` | `datainizio` (CPEV) | `ti:startTime^^xsd:date` |
| eventi_culturali | `data_fine` | `datafine` (CPEV) | `ti:endTime^^xsd:date` |
| incidenti_stradali | `morti` | `decessi` | `sdmx-measure:obsValue` |
| incidenti_stradali | `zona` | `localita` | `clv:hasSpatialCoverage` |
| incidenti_stradali | `feriti` | (resta — semantica unica) | LLM |
| istruzione | `struttura` | `denominazione` | `rdfs:label@it` |
| istruzione | `iscritti` | `totale_alunni` | `sdmx-measure:obsValue` |
| istruzione | `tipo_struttura` | `tipologia` | `dct:type@it` |
| opere_pubbliche | `stato` | `codice_stato_cup` | `adms:status` |
| opere_pubbliche | `importo_euro` | `costo_lavori_previsto` | `pc:totalAmount` |
| opere_pubbliche | `rup` | `nome_completo` (persona) | `cpv:fullName` |
| opere_pubbliche | `fonte_finanziamento` | (resta — semantica unica) | LLM |
| patrimonio | `valore_euro` | `rendita` | `sdmx-measure:obsValue` |
| patrimonio | `vincolo_culturale` | `qualita` | `dct:type@it` |
| patrimonio | `uso` | `consistenza` | `dct:description` |
| popolazione | `residenti` | `totale_residenti` | LLM (semantica unica) |
| popolazione | `quartiere` | `localita` | `clv:hasSpatialCoverage` |
| pratiche_edilizie | `esito` | `codice_stato_cup` | `adms:status` |
| pratiche_edilizie | `data_chiusura` | `data_scadenza` | `ti:endTime^^xsd:date` |
| rifiuti | `(wide: anno,kg_totali,kg_diff,kg_indiff,rd_pct,frazione,quartiere)` | **RISTRUTTURATO LONG: `(anno, frazione, valore_assoluto, unita_misura, localita)`** | `sdmx-measure:obsValue` + `mu:hasMeasurementUnit` + `dct:type@it` |
| servizi_sociali | `utenti` | `numero` | `sdmx-measure:obsValue` |
| servizi_sociali | `spesa_euro` | `totale_costo` | `sdmx-measure:obsValue` |
| tributi | `tributo` | `tipo_atto` | `dct:type@it` |
| tributi | `gettito_euro` | `totale_entrate` | `sdmx-measure:obsValue` |
| tributi | `n_contribuenti` | `numero` | `sdmx-measure:obsValue` |
| tributi | `aliquota_base` | `valore` (+ `unita_misura`) | `iot:hasObservationValue` |

### Nota semantica importante: persone vs enti

Per `opere_pubbliche.nome_completo` (ex `rup`): il **RUP è una persona fisica** (`cpv:Person` → `cpv:fullName`), non un'organizzazione. Il **titolare giuridico** (Comune/Regione/Ministero) è una entità diversa, vive in una colonna separata `descrizione_ente` (`foaf:name@it`, ontologia COV) opzionale.

### Retrocompatibilità

I calcolatori (`scripts/calculators_v2.js`) supportano **entrambi i formati** tramite la funzione helper `withAliases(row, {vecchio: 'nuovo'})`. I CSV con i vecchi nomi (Bologna, Lecce, Potenza) continuano a funzionare senza modifiche.

Il caso speciale di `rifiuti` (formato wide → long) è gestito da auto-detect dell'header: se sono presenti le colonne wide (`kg_totali`, `rd_pct`) il calcolatore usa il path legacy; se sono presenti le colonne long (`frazione`, `valore_assoluto`, `unita_misura`) il calcolatore fa pivot e calcola.

---

## Riferimento canonico

Il **[Comune IDEALE](../data/comuni/demo/)** (visibile nella dashboard live) è costruito con CSV/JSON perfettamente allineati a questa specifica. Per allinearti velocemente, replica alla lettera la sua struttura: nomi colonne, formati, tipi. I CSV di riferimento sono in [`data/comuni/demo/`](../data/comuni/demo/).

> La cartella si chiama ancora `demo/` per ragioni storiche, ma rappresenta il Comune Ideale.

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
| Coordinate | lat 35-48, lon 6-19 (territorio italiano + isole) |
| Anno | 1900-2050 |

## I 12 dataset CORE

Schemi formali in [`schemas/csv/`](../schemas/csv/). Riepilogo allineato agli schemi JSON reali:

### 1. `popolazione.csv`

**Required**: `anno` (1900-2050), `residenti` (intero ≥0)
**Optional**: `quartiere` (stringa)

```csv
anno,residenti,quartiere
2024,55421,Navile
2024,42183,Borgo Panigale
2024,389127,
```

### 2. `bilancio.csv`

**Required**: `anno`, `missione` (stringa, es. "Servizi istituzionali"), `importo_euro` (numero ≥0)
**Optional**: `programma` (stringa), `tipo` (`previsione` | `impegno` | `pagamento` | `consuntivo`)

```csv
anno,missione,programma,importo_euro,tipo
2024,"Servizi istituzionali","Organi istituzionali",1250000.50,impegno
2024,"Istruzione e diritto allo studio","Istruzione prescolastica",3450000.00,pagamento
```

### 3. `opere_pubbliche.csv`

**Required**: `nome` (stringa)
**Optional**: `anno`, `stato` (stringa libera, tipicamente "Programmata"/"In corso"/"Conclusa"), `importo_euro`, `cup` (15 caratteri standard CIPESS), `fonte_finanziamento`, `lat`, `lon`, `tipo`, `rup`

```csv
nome,anno,stato,importo_euro,cup,lat,lon
"Riqualificazione Piazza Garibaldi",2024,"In corso",2400000.00,B33D24001230002,40.3520,18.1700
```

### 4. `pratiche_edilizie.csv`

**Required**: `data` (data presentazione, YYYY-MM-DD)
**Optional**: `tipo` (CILA, SCIA, PdC, ...), `esito` (Approvata, Respinta, ...), `chiusura_data` (vuota = ancora aperta), `via`, `civico`

```csv
data,tipo,esito,chiusura_data,via,civico
2024-03-15,CILA,Approvata,2024-04-22,Via Roma,42
2024-04-02,SCIA,,,Via Garibaldi,15
```

> Nota: il campo è `chiusura_data` (non `data_chiusura`).

### 5. `servizi_sociali.csv`

**Required**: `anno`, `categoria` (es. "Sostegno alla genitorialità", "Anziani non autosufficienti")
**Optional**: `utenti` (intero), `spesa_euro` (numero), `interventi` (intero, es. n. pratiche evase)

```csv
anno,categoria,utenti,spesa_euro,interventi
2024,"Anziani non autosufficienti",1240,2850000.00,1240
2024,"Sostegno alla genitorialità",,,420
```

### 6. `istruzione.csv`

**Required**: `struttura` (denominazione)
**Optional**: `anno` (anno solare di riferimento), `iscritti` (intero), `tipo_struttura` (Asilo nido / Infanzia / Primaria / Secondaria I / Secondaria II), `lat`, `lon`, `via`

```csv
struttura,anno,iscritti,tipo_struttura,lat,lon,via
"Scuola dell'Infanzia Aquilone",2024,82,Infanzia,45.4642,9.1900,"Via dei Fiori 12"
"Asilo Nido Il Cerbiatto",2024,45,Asilo nido,45.4651,9.1885,"Via Verdi 3"
```

### 7. `incidenti_stradali.csv`

**Required**: `data` (YYYY-MM-DD)
**Optional**: `lat`, `lon`, `morti` (intero ≥0), `feriti` (intero ≥0), `zona` (quartiere/via), `ora` (HH:MM, formato 24h)

```csv
data,lat,lon,morti,feriti,zona,ora
2024-01-15,40.3520,18.1700,,2,LECCE,17:30
2024-02-03,40.3611,18.1853,1,3,LECCE,22:45
```

### 8. `rifiuti.csv`

**Required**: `anno`
**Optional**: `kg_totali`, `kg_differenziata`, `kg_indifferenziata`, `rd_pct` (0-100, percentuale RD), `frazione` (es. "Carta", "Plastica"), `quartiere`

```csv
anno,kg_totali,kg_differenziata,kg_indifferenziata,rd_pct
2024,56704380,41512250,15192130,73.21
2023,55320120,40150780,15169340,72.58
```

### 9. `eventi_culturali.csv`

**Required**: `nome`
**Optional**: `data_inizio`, `data_fine`, `categoria` (Mostra, Concerto, Festival, ...), `luogo` (denominazione del luogo), `lat`, `lon`, `organizzatore`

```csv
nome,data_inizio,data_fine,categoria,luogo,lat,lon,organizzatore
"Notte Bianca della Cultura",2024-09-21,2024-09-21,Festival,"Centro storico",45.4642,9.1900,"Comune"
"Mostra del Tintoretto",2024-10-15,2025-01-31,Mostra,"Palazzo dei Diamanti",45.4675,9.1895,"Galleria d'Arte"
```

### 10. `delibere.csv`

**Required**: `data` (YYYY-MM-DD)
**Optional**: `tipo` (Delibera Giunta, Delibera Consiglio, Determina dirigenziale, Ordinanza, Decreto sindacale), `numero` (numero atto), `oggetto`, `settore` (settore/assessorato proponente)

```csv
data,tipo,numero,oggetto,settore
2024-03-15,"Delibera Giunta",78,"Approvazione bilancio consuntivo 2023","Ragioneria"
2024-03-22,"Determina dirigenziale",442,"Affidamento servizio manutenzione verde","Lavori Pubblici"
```

### 11. `patrimonio.csv`

**Required**: `denominazione`
**Optional**: `tipo` (Fabbricato, Terreno, Infrastruttura, ...), `indirizzo`, `lat`, `lon`, `valore_euro`, `vincolo_culturale` (boolean: `true`/`false`), `uso` (destinazione d'uso libera)

```csv
denominazione,tipo,indirizzo,lat,lon,valore_euro,vincolo_culturale,uso
"Palazzo Comunale",Fabbricato,"Piazza Garibaldi 1",45.4642,9.1900,12500000.00,true,"Sede istituzionale"
"Stadio Comunale",Fabbricato,"Via dello Sport 5",45.4651,9.1750,8200000.00,false,"Impianto sportivo"
```

### 12. `tributi.csv` ⭐ NUOVO

**Required**: `anno`, `tributo`
**Optional**: `gettito_euro` (riscosso effettivo, NON quello previsto a bilancio), `n_contribuenti` (intero), `aliquota_base` (numero), `descrizione` (testo libero), `categoria` (sotto-categoria, es. "Utenze domestiche" per TARI)

**Tipi `tributo` standardizzati** (categoria libera permessa per tributi minori):
`IMU`, `TARI`, `TASSA_SOGGIORNO`, `ADDIZIONALE_IRPEF`, `COSAP`, `IMPOSTA_PUBBLICITA`, `CANONE_UNICO`

```csv
anno,tributo,gettito_euro,n_contribuenti,aliquota_base,descrizione,categoria
2024,IMU,15800000.00,32500,1.06,"Aliquota ordinaria 10.6 per mille",
2024,TARI,12300000.00,38000,,,Utenze domestiche
2024,TARI,6200000.00,4000,,,Utenze non domestiche
2024,TASSA_SOGGIORNO,1250000.00,,2.50,"€2.50/notte categoria 4 stelle",
2024,ADDIZIONALE_IRPEF,8900000.00,,0.80,"Aliquota 0.80%",
```

> **Nota**: per TARI è frequente avere più righe per stesso anno con `categoria` diversa (domestiche/non domestiche, scaglioni). L'`aliquota_base` segue la convenzione del Portale del Federalismo Fiscale MEF: IMU in `‰`, addizionale IRPEF in `%`, tassa di soggiorno in €/notte.

## Validazione

### CLI

```bash
node scripts/validate_csv.js <dataset> <path/file.csv>
```

Esempio output OK:
```
✓ OK data/comuni/demo/popolazione.csv — 6 righe, 3 colonne
```

Esempio output FAIL:
```
✗ INVALID data/fixtures/lecce/incidenti.csv — 4 errori:
  - Riga 2, colonna 'data': data non in formato YYYY-MM-DD: '15/01/2024'
  - Riga 2, colonna 'lon': valore 37924 sopra il massimo 19
  - Riga 2, colonna 'morti': non è un intero: '18.15166'
  - Riga 3, colonna 'lat': valore 200 sopra il massimo 48
```

### CI (GitHub Actions)

Su ogni PR che tocchi `data/comuni/<key>/manifest.yml` o un CSV, il workflow [`validate-paniere.yml`](../.github/workflows/validate-paniere.yml) esegue:

1. `validateCsv()` su ogni CSV trovato sotto `data/comuni/` e `data/fixtures/`
2. Validazione struttura `manifest.yml` (campi obbligatori, `source_type` ammessi)
3. Se anche un solo file fallisce → PR FAIL, no merge

## FAQ

**D: Il mio CSV ha le colonne giuste ma con maiuscole/minuscole diverse (`Anno` invece di `anno`). Funziona?**
R: No. I nomi sono case-sensitive. Rinomina le colonne nel formato canonico.

**D: Ho dati storici fino al 1700 (es. catasto storico). Funzionano?**
R: No, il vincolo è `1900-2050`. Filtra prima di esportare il CSV.

**D: Posso aggiungere colonne mie oltre a quelle dello schema?**
R: No, vengono rifiutate (`additionalProperties: false` negli schemi JSON Schema). Se ti serve una colonna nuova, apri una issue per discutere l'estensione dello schema canonico.

**D: La virgola decimale italiana (`12,5`) viene accettata?**
R: No, solo il punto. Sostituisci `12,5` → `12.5` prima dell'export.

**D: Devo avere tutti i 12 dataset?**
R: No. Dichiara `presente: false` (oppure ometti il dataset dal manifest) per quelli che non pubblichi. La dashboard mostra "Non pubblicato dal Comune" per i mancanti. Il rapporto X/12 nel selettore Comuni indica quanti sono coperti.

**D: Posso usare un URL HTTPS pubblico invece di committare il CSV?**
R: Sì, usa `source_type: external_csv` con `url:` nel manifest. Il builder fa fetch ad ogni run del workflow.

**D: Per TARI con più scaglioni / categorie, come strutturo il CSV?**
R: Una riga per categoria, stesso `anno` e stesso `tributo: TARI`, valorizzando `categoria` (es. "Utenze domestiche", "Utenze non domestiche", "Scaglione A"). Il calcolatore aggrega in automatico.

**D: Il mio gestionale esporta i nomi delle colonne in italiano (`Anno`, `Numero pratiche`). Devo riscriverli?**
R: Sì, per il formato canonico. Se non puoi rinominarli alla fonte, scrivi un piccolo script di trasformazione (Python o jq) che produce il CSV nel formato canonico.

**D: Posso pubblicare un CSV con dati fino al 2018 e basta? Verrà mostrato come "obsoleto"?**
R: Sì, viene comunque accettato. La dashboard mostra un flag freshness: `🟢 recente` (< 12 mesi), `🟡 datato` (1-3 anni), `🔴 obsoleto` (> 3 anni). Lecce ha molti dataset `obsoleto` perché si sono fermati al 2017-2019.

## Versionamento

Versione corrente: **csv-v1**.

Eventuali modifiche allo schema saranno versionate (`csv-v2`, `csv-v3`, ...) con periodo di deprecazione e fallback. Il manifest dichiara `paniere_version: "csv-v1"` per tracciare la compatibilità.

### Storia

- **csv-v1** (corrente, 2026-05): 12 dataset CORE (popolazione, bilancio, opere_pubbliche, pratiche_edilizie, servizi_sociali, istruzione, incidenti_stradali, rifiuti, eventi_culturali, delibere, patrimonio, tributi)
  - 2026-05-05: aggiunto **dataset 12 — `tributi`** (gettito IMU/TARI/tassa soggiorno/addizionale IRPEF/COSAP per anno)
  - 2026-05-04: schema iniziale 11 dataset
