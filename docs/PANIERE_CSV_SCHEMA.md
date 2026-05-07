# Paniere CSV — Schema canonico

> Specifica del formato CSV richiesto per la pubblicazione dei dataset CORE nel cruscotto ComuneMetrics.

## Riferimento canonico

Il **[Comune IDEALE](../data/comuni/demo/)** (visibile nella dashboard live) è costruito con CSV/JSON perfettamente allineati a questa specifica. Per allinearti velocemente, replica alla lettera la sua struttura: nomi colonne, formati, tipi. I CSV di riferimento sono in [`data/comuni/demo/`](../data/comuni/demo/).

> La cartella si chiama ancora `demo/` per ragioni storiche, ma rappresenta il Comune Ideale.

## Filosofia

Il **Paniere CSV** è uno standard **federato e replicabile**. Ogni Comune produce CSV nel formato canonico documentato qui; il cruscotto li legge senza richiedere alias, sinonimi, o adattamenti specifici per portale.

Lo schema impone:

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

## I 14 dataset CORE

Schemi formali in [`schemas/csv/`](../schemas/csv/). Riepilogo allineato agli schemi JSON reali:

### 1. `popolazione.csv`

**Required**: `anno` (1900-2050), `totale_residenti` (intero ≥0)
**Optional**: `localita` (stringa, quartiere o zona)

```csv
anno,totale_residenti,localita
2024,55421,Navile
2024,42183,Borgo Panigale
2024,389127,
```

### 2. `bilancio.csv`

**Required**: `anno`, `settore_interv_inv` (stringa, es. "Spese correnti"), `totale_uscite` (numero ≥0)
**Optional**: `sottosettore_interv_inv` (stringa, dettaglio macro-aggregato es. "Acquisto di beni e servizi"), `tipo` (`previsione` | `impegno` | `pagamento` | `consuntivo`)

```csv
anno,settore_interv_inv,sottosettore_interv_inv,totale_uscite,tipo
2025,"Spese correnti","Acquisto di beni e servizi",31479240.42,pagamento
2025,"Spese in conto capitale","Investimenti fissi lordi e acquisto terreni",18164888.76,pagamento
```

> **Comuni che non pubblicano il bilancio**: i dati di spesa sono comunque ricostruibili dalle banche dati nazionali del MEF. Vedi [`PANIERE.md` § Comuni che non pubblicano](PANIERE.md#comuni-che-non-pubblicano-il-fallback-nazionale).

### 3. `opere_pubbliche.csv`

**Required**: `nome` (stringa)
**Optional**: `anno`, `codice_stato_cup` (stringa, es. "ATTIVO"/"CHIUSO"/"In corso"/"Conclusa"), `costo_lavori_previsto` (numero), `cup` (15 caratteri standard CIPESS), `fonte_finanziamento`, `lat`, `lon`, `tipo` (Natura Intervento), `nome_completo` (nome del RUP, persona fisica)

```csv
nome,anno,codice_stato_cup,costo_lavori_previsto,cup,fonte_finanziamento,lat,lon,tipo,nome_completo
"NODO COMPLESSO DEL GALLITELLO",2007,ATTIVO,29884600.00,B31B05000260007,Statale,40.6406,15.8059,"NUOVA REALIZZAZIONE","Mario Rossi"
```

> Il campo `nome_completo` è la persona fisica responsabile del procedimento (RUP), non il titolare giuridico dell'opera (Comune, Regione, Ministero) che è informazione diversa.

> **Comuni che non pubblicano le opere pubbliche**: l'elenco delle opere CUP intestate al Comune è ricostruibile dalle banche dati nazionali del MEF. Vedi [`PANIERE.md` § Comuni che non pubblicano](PANIERE.md#comuni-che-non-pubblicano-il-fallback-nazionale).

### 4. `pratiche_edilizie.csv`

**Required**: `data` (data presentazione, YYYY-MM-DD)
**Optional**: `tipo` (CILA, SCIA, PdC, ...), `codice_stato_cup` (Approvata, Respinta, ecc.), `data_scadenza` (vuota = ancora aperta), `via`, `civico`

```csv
data,tipo,codice_stato_cup,data_scadenza,via,civico
2024-03-15,CILA,Approvata,2024-04-22,Via Roma,42
2024-04-02,SCIA,,,Via Garibaldi,15
```

### 5. `servizi_sociali.csv`

**Required**: `anno`, `categoria` (es. "Sostegno alla genitorialità", "Anziani non autosufficienti")
**Optional**: `numero` (intero, n. utenti serviti), `totale_costo` (numero, spesa €), `interventi` (intero, es. n. pratiche evase)

```csv
anno,categoria,numero,totale_costo,interventi
2024,"Anziani non autosufficienti",1240,2850000.00,1240
2024,"Sostegno alla genitorialità",,,420
```

### 6. `istruzione.csv`

**Required**: `denominazione` (nome struttura)
**Optional**: `anno` (anno solare di riferimento), `totale_alunni` (intero), `tipologia` (Asilo nido / Infanzia / Primaria / Secondaria I / Secondaria II), `lat`, `lon`, `via`

```csv
denominazione,anno,totale_alunni,tipologia,lat,lon,via
"Scuola dell'Infanzia Aquilone",2024,82,Infanzia,45.4642,9.1900,"Via dei Fiori 12"
"Asilo Nido Il Cerbiatto",2024,45,Asilo nido,45.4651,9.1885,"Via Verdi 3"
```

### 7. `incidenti_stradali.csv`

**Required**: `data` (YYYY-MM-DD)
**Optional**: `lat`, `lon`, `decessi` (intero ≥0), `feriti` (intero ≥0), `localita` (quartiere/via), `ora` (HH:MM, formato 24h)

```csv
data,lat,lon,decessi,feriti,localita,ora
2024-01-15,40.3520,18.1700,,2,LECCE,17:30
2024-02-03,40.3611,18.1853,1,3,LECCE,22:45
```

### 8. `rifiuti.csv`

**Required**: `anno`, `frazione` (categoria osservazione), `valore_assoluto` (numero ≥0)
**Optional**: `unita_misura` (`kg` / `t` / `%` / `kg/abitante`), `localita` (quartiere), `cer` (codice CER)

Formato **long** (tidy data): una riga per (anno, frazione). Frazioni canoniche: `Totale`, `Differenziata`, `Indifferenziata`, `Differenziata_pct`, e poi merceologiche (`Carta`, `Plastica`, `Vetro`, `Organico`, ...).

```csv
anno,frazione,valore_assoluto,unita_misura,localita
2024,Totale,16910000,kg,
2024,Differenziata_pct,73.2,%,
2024,Carta,3450000,kg,
2024,Plastica,1820000,kg,
2023,Totale,16980000,kg,
2023,Differenziata_pct,71.5,%,
```

### 9. `eventi_culturali.csv`

**Required**: `nome`
**Optional**: `datainizio`, `datafine`, `categoria` (Mostra, Concerto, Festival, ...), `luogo` (denominazione del luogo), `lat`, `lon`, `organizzatore`

```csv
nome,datainizio,datafine,categoria,luogo,lat,lon,organizzatore
"Notte Bianca della Cultura",2024-09-21,2024-09-21,Festival,"Centro storico",45.4642,9.1900,"Comune"
"Mostra del Tintoretto",2024-10-15,2025-01-31,Mostra,"Palazzo dei Diamanti",45.4675,9.1895,"Galleria d'Arte"
```

### 10. `delibere.csv`

**Required**: `data_atto` (YYYY-MM-DD)
**Optional**: `tipo_atto` (Delibera Giunta, Delibera Consiglio, Determina dirigenziale, Ordinanza, Decreto sindacale), `numero_atto` (numero atto), `oggetto`, `uo_proponente` (settore/assessorato proponente)

```csv
data_atto,tipo_atto,numero_atto,oggetto,uo_proponente
2024-03-15,"Delibera Giunta",78,"Approvazione bilancio consuntivo 2023","Ragioneria"
2024-03-22,"Determina dirigenziale",442,"Affidamento servizio manutenzione verde","Lavori Pubblici"
```

### 11. `patrimonio.csv`

**Required**: `denominazione`
**Optional**: `tipo` (Fabbricato, Terreno, Infrastruttura, ...), `indirizzo`, `lat`, `lon`, `rendita` (numero, valore patrimoniale o rendita catastale €), `qualita` (es. "monumentale", "paesaggistico", "nessuno"), `consistenza` (destinazione d'uso, es. "Strumentale"/"Disponibile"/"Storico-artistico")

```csv
denominazione,tipo,indirizzo,lat,lon,rendita,qualita,consistenza
"Palazzo Comunale",Fabbricato,"Piazza Garibaldi 1",45.4642,9.1900,12500000.00,monumentale,"Sede istituzionale"
"Stadio Comunale",Fabbricato,"Via dello Sport 5",45.4651,9.1750,8200000.00,nessuno,"Impianto sportivo"
```

### 12. `tributi.csv`

**Required**: `anno`, `tipo_atto` (es. IMU, TARI, ecc.)
**Optional**: `totale_entrate` (riscosso effettivo, NON quello previsto a bilancio), `numero` (intero, n. contribuenti/utenze), `valore` (numero, aliquota o tariffa), `unita_misura` (`%` / `permille` / `€/notte`), `descrizione` (testo libero), `categoria` (sotto-categoria, es. "Utenze domestiche" per TARI)

**Tipi `tipo_atto` standardizzati** (categoria libera permessa per tributi minori):
`IMU`, `TARI`, `TASSA_SOGGIORNO`, `ADDIZIONALE_IRPEF`, `COSAP`, `IMPOSTA_PUBBLICITA`, `CANONE_UNICO`

```csv
anno,tipo_atto,totale_entrate,numero,valore,unita_misura,descrizione,categoria
2024,IMU,15800000.00,32500,1.06,permille,"Aliquota ordinaria 10.6 per mille",
2024,TARI,12300000.00,38000,,,,"Utenze domestiche"
2024,TARI,6200000.00,4000,,,,"Utenze non domestiche"
2024,TASSA_SOGGIORNO,1250000.00,,2.50,€/notte,"€2.50/notte categoria 4 stelle",
2024,ADDIZIONALE_IRPEF,8900000.00,,0.80,%,"Aliquota 0.80%",
```

### 13. Defibrillatori (DAE)

**Cosa**: postazioni dei defibrillatori semiautomatici esterni (DAE) pubblicamente accessibili nel territorio comunale.

**Fonte interna tipica**: Polizia Locale, Protezione Civile, ufficio 118 regionale (registro consolidato), Settore Sport (impianti sportivi).

**Schema canonico** (allineato al demo Worker `poi`):

```csv
id,nome_poi,tipo_poi,lat,lon,indirizzo,comune,accessibile_h24,email
1,Municipio Centrale,DAE,45.4654,9.1859,Piazza del Comune 1,Comune Ideale,si,dae@comuneideale.it
2,Stazione Centrale,DAE,45.4862,9.2055,Piazza Duca d'Aosta 1,Comune Ideale,si,
3,Ospedale San Raffaele,DAE,45.5052,9.2641,Via Olgettina 60,Comune Ideale,si,dae@hsr.it
```

**Note**:
- `tipo_poi`: per i DAE valore fisso `"DAE"`. La colonna esiste perché il modello POI è generico (può ospitare anche altri punti di interesse pubblico)
- `accessibile_h24`: `si` o `no`. Indica se il DAE è raggiungibile fuori orario di apertura della struttura ospitante (es. defibrillatori esterni alle farmacie, ai supermercati, nei box stradali)
- I dataset reali possono usare nomi colonna diversi (es. Bologna usa `nome,citta,indirizzo,geo_point`); il sistema accetta i sinonimi più comuni

### 14. Parcheggi pubblici

**Cosa**: strutture e aree di parcheggio pubblico nel territorio comunale (multipiano, raso, scoperto, di interscambio).

**Fonte interna tipica**: Settore Mobilità, Polizia Locale (per la sosta tariffata), azienda partecipata di gestione parcheggi (se esiste).

**Schema canonico** (allineato al demo Worker `park`):

```csv
id,nome,indirizzo,comune,provincia,lat,lon,stalli,posti_disabili,tariffa_oraria,tipo_parcheggio,accessibile_h24
1,P. Centrale Stazione,Via Stazione 1,Comune Ideale,BA,45.4862,9.2055,250,12,1.50,Coperto,si
2,P. Piazza Duomo,Piazza Duomo,Comune Ideale,BA,45.4641,9.1900,80,4,2.00,Scoperto,no
3,P. Aeroporto Linate Lunga,Viale Forlanini,Comune Ideale,BA,45.4451,9.2767,2000,40,0.80,Multipiano,si
```

**Note**:
- `stalli`: numero totale di posti, inclusi i `posti_disabili`
- `tariffa_oraria`: in euro. `0` per parcheggi gratuiti
- `tipo_parcheggio`: valori liberi ma standardizzati: `Multipiano`, `Coperto`, `Scoperto`, `Raso`, `Struttura`, `Interscambio`
- I dataset reali possono usare tariffa testuale invece che numerica (es. Bologna usa `abbonamento`/`pagamento`/`libero`); il calcolatore detecta automaticamente entrambi i formati

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

**D: Devo avere tutti i 14 dataset?**
R: No. Dichiara `presente: false` (oppure ometti il dataset dal manifest) per quelli che non pubblichi. La dashboard mostra "Non pubblicato dal Comune" per i mancanti. Il rapporto X/14 nel selettore Comuni indica quanti sono coperti.

**D: Posso usare un URL HTTPS pubblico invece di committare il CSV?**
R: Sì, usa `source_type: external_csv` con `url:` nel manifest. Il builder fa fetch ad ogni run del workflow.

**D: Per TARI con più scaglioni / categorie, come strutturo il CSV?**
R: Una riga per categoria, stesso `anno` e stesso `tributo: TARI`, valorizzando `categoria` (es. "Utenze domestiche", "Utenze non domestiche", "Scaglione A"). Il calcolatore aggrega in automatico.

**D: Il mio gestionale esporta i nomi delle colonne in italiano (`Anno`, `Numero pratiche`). Devo riscriverli?**
R: Sì, per il formato canonico. Se non puoi rinominarli alla fonte, scrivi un piccolo script di trasformazione (Python o jq) che produce il CSV nel formato canonico.

**D: Posso pubblicare un CSV con dati fino al 2018 e basta? Verrà mostrato come "obsoleto"?**
R: Sì, viene comunque accettato. La dashboard mostra un flag freshness: `🟢 recente` (< 12 mesi), `🟡 datato` (1-3 anni), `🔴 obsoleto` (> 3 anni). Lecce ha molti dataset `obsoleto` perché si sono fermati al 2017-2019.

---

Se hai pubblicato in passato CSV con nomi colonna diversi da quelli documentati qui (`missione`, `importo_euro`, `gettito_euro`, ecc.), continuano a essere accettati: il sistema riconosce automaticamente i nomi precedenti.

---

## Linked Open Data — esposizione semantica DCAT-AP_IT

I CSV del paniere sono progettati per produrre RDF/Turtle conforme alle [ontologie per le PA italiane](https://github.com/italia/dati-semantic-assets), pubblicate sul [Catalogo Nazionale Dati Semantici](https://schema.gov.it/). Quando convertiti, i 15 dataset mappano su classi semantiche corrette del profilo italiano DCAT-AP_IT.

### Mapping canonico

| Dataset CORE | Ontologia DCAT-AP_IT | Classe principale |
|---|---|---|
| Popolazione | QB + CLV | `qb:Observation` |
| Bilancio | QB + CPSV-AP + COV | `cpsv:PublicService` |
| Opere pubbliche | PublicContract + CPV + COV + TI + QB | `pc:Contract` |
| Pratiche edilizie | CPSV-AP + COV | `cpsv:PublicService` |
| Servizi sociali | COV + CLV + POI + SM + ACCO | `acco:Accommodation` |
| Istruzione | SMAPIT + CLV + SM | `smapit:School` |
| Incidenti stradali | POI + CLV + TI | `poi:PointOfInterest` |
| Rifiuti | QB + CLV | `qb:Observation` |
| Eventi culturali | CPEV + TI + POI + CLV | `cpev:PublicEvent` |
| Delibere | Transparency + COV | `tr:TransparencyObligation` |
| Patrimonio | CulturalHeritage + CLV | `ch:CulturalHeritage` |
| Tributi | Indicator + QB + COV | `indicator:Indicator` |
| Defibrillatori (DAE) | POI + CLV + SM | `poi:PointOfInterest` |
| Parcheggi pubblici | PARK + POI + CLV | `park:CarPark` |
| Strutture ricettive | ACCO + CLV + POI | `acco:Accommodation` |

### Esempi pre-generati

Nella cartella [`tests/expected-ttl/`](../tests/expected-ttl/) trovi i 14 file `.ttl` di esempio, generati dai CSV del Comune Ideale e validati con `rdflib`. Sono il riferimento canonico del *cosa ci si aspetta* quando un CSV del paniere viene convertito in RDF.

### Conversione CSV → RDF nel proprio Comune

Per la conversione effettiva ognuno è libero di usare lo strumento che preferisce: librerie Python (`rdflib`, `csvw`), Java (`Jena`), tool open source di mapping CSV → RDF, oppure scriversi un convertitore basato sui mapping della tabella sopra. Una volta prodotto il TTL, può essere caricato in un endpoint SPARQL Virtuoso, in un catalogo DCAT-AP_IT su [dati.gov.it](https://www.dati.gov.it), o in un harvester piveau.

Lo strumento [`piersoft/CSV-to-RDF`](https://github.com/piersoft/CSV-to-RDF) (open source) è quello che è stato usato per generare i TTL di esempio in `tests/expected-ttl/` e contiene il motore di matching colonne → [ontologie per le PA italiane](https://github.com/italia/dati-semantic-assets). Il README del repo spiega come deployarlo per un uso autonomo, in locale o come servizio interno della propria PA.
