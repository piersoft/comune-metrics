# Paniere ComuneMetrics — Guida pratica per Comuni

> Come costruire i 12 CSV del paniere partendo dai gestionali interni del Comune. Documento operativo per Responsabili Transizione Digitale, IT, e referenti OpenData.

**Specifica tecnica del formato CSV**: vedi [`PANIERE_CSV_SCHEMA.md`](PANIERE_CSV_SCHEMA.md) e gli schemi formali in [`../schemas/csv/`](../schemas/csv/).

**Procedura di adozione passo-passo**: vedi [README.md principale](../README.md).

---

## Cosa è il paniere

Il paniere è un insieme di **12 dataset CORE** che descrivono l'attività amministrativa di un Comune italiano.

> **Riferimento canonico**: il **Comune IDEALE** (visibile nella dashboard live) è costruito con CSV/JSON perfettamente allineati agli schemi del paniere. Per allinearsi velocemente, un Comune nuovo replica alla lettera la sua struttura (nomi colonne, formati, tipi). I CSV del Comune Ideale sono in [`data/comuni/demo/`](../data/comuni/demo/).

I 12 dataset CORE sono:

| # | Dataset | Cosa contiene |
|---|---|---|
| 1 | Popolazione | Residenti per anno e quartiere |
| 2 | Bilancio | Spesa per missione e programma (DLgs 118/2011) |
| 3 | Opere pubbliche | Cantieri con CUP, importo, geolocalizzazione |
| 4 | Pratiche edilizie | CILA/SCIA/PdC con esito |
| 5 | Servizi sociali | Utenti e spesa per categoria di intervento |
| 6 | Istruzione | Scuole e asili nido con iscritti |
| 7 | Incidenti stradali | Sinistri con vittime e geo |
| 8 | Rifiuti | Raccolta differenziata e quantità |
| 9 | Eventi culturali | Manifestazioni con luogo e data |
| 10 | Delibere | Atti dell'albo pretorio |
| 11 | Patrimonio | Immobili comunali con valore catastale |
| 12 | **Tributi** | **Gettito IMU/TARI/tassa soggiorno per anno** |

Un Comune può adottarne **anche solo alcuni**: i mancanti vengono dichiarati `presente: false` nel manifest.

> **Lecce è un caso scuola interessante**: pubblica 10/12 dataset (quasi tutti fermi al 2015-2019, MA il dataset incidenti è aggiornato al 31 dicembre 2023, 11 anni di serie storica). Dimostra che l'OpenData non è "tutto o niente": un Comune può tenere viva una serie temporale anche se ha lasciato andare le altre.

---

## Principio: fonti interne, non dati di terzi

I CSV del paniere devono provenire **dai gestionali interni del Comune**, non da banche dati nazionali centralizzate (ISTAT, Anagrafe Tributaria, OpenCUP, BDAP). Ragioni:

1. **Tempestività**: i dati interni sono aggiornati in tempo reale; quelli centralizzati arrivano con 12-24 mesi di ritardo
2. **Granularità**: i gestionali hanno il dettaglio per zona, quartiere, indirizzo; le banche nazionali aggregano per Comune
3. **Responsabilità**: il Comune è proprietario del dato e ne risponde direttamente
4. **Indipendenza dalla connettività**: i gestionali sono in casa, le API esterne possono cadere

Il paniere è **dati del Comune sul Comune**.

---

## Mappa delle fonti tipiche per gestionale

| Dataset CORE | Gestionale tipico | Esempi vendor |
|---|---|---|
| Popolazione | Anagrafe della Popolazione Residente (APR) | Maggioli ANPR, Halley, Engineering, GPI |
| Bilancio | Software finanziario / contabile | Halley, Maggioli, Sicraweb, Gruppo Buffetti |
| Opere pubbliche | Software lavori pubblici / programma triennale | Maggioli OO.PP., STR Vision, OpenCUP CIPESS |
| Pratiche edilizie | SUE — Sportello Unico Edilizia | Maggioli SUE, Halley SUE, Globo, regionali |
| Servizi sociali | Cartella sociale / sw welfare | Cosmocard, Garsia, Maggioli, regionali (es. CARTELLAINFOSOC Lombardia) |
| Istruzione | Anagrafe scolastica / iscrizioni nido | Software regionali, Maggioli Servizi Demografici |
| Incidenti stradali | Sw Polizia Locale | Concilia, Maggioli PL, OpenSquare |
| Rifiuti | Sw gestione rifiuti / dati gestore | Software del gestore (Hera, A2A, Iren, AMA, locali) |
| Eventi culturali | CMS comunale / agenda eventi | Sito web istituzionale, sw assessorato cultura |
| Delibere | Sw atti amministrativi / albo pretorio | Maggioli AdWeb, Halley, Sicraweb, Iter |
| Patrimonio | Inventario beni immobili | Maggioli Patrimonio, Halley, sw catastali |
| **Tributi** | **Sw gestione tributi locali / federalismo fiscale** | **Maggioli Tributi, Halley Tributi, Engineering, sw concessionari (Equitalia, Andreani, ICA)** |

Il Comune **già ha** questi dati. Il paniere chiede solo di esportarli in CSV nel formato canonico.

---

## Workflow di adozione per il Comune

### Fase 1 — Censimento (1 giornata)

Il Responsabile della Transizione Digitale convoca un tavolo con:
- Anagrafe (popolazione)
- Ragioneria (bilancio)
- LL.PP. (opere)
- SUE (pratiche edilizie)
- Servizi Sociali
- Pubblica Istruzione
- Polizia Locale (incidenti)
- Ambiente (rifiuti)
- Cultura (eventi)
- Segreteria Generale (delibere)
- Patrimonio

Per ogni dataset si verifica:
1. **Esiste un gestionale che contiene questi dati?** (di solito sì)
2. **È possibile estrarre un CSV?** (export nativo, query SQL, custom report)
3. **Chi è il referente che esegue l'estrazione?**
4. **Con quale cadenza il dato è aggiornato?** (real-time, mensile, annuale)

Output del tavolo: tabella `dataset → gestionale → referente → cadenza → fattibilità`.

### Fase 2 — Estrazione (1-3 giornate per dataset)

Per ogni dataset, il referente IT scrive **una query SQL** o **un export filtro** che produca il CSV nel formato canonico (vedi schemi in `schemas/csv/`).

Le query vanno **standardizzate e schedulate**: meglio un cron notturno che produce il CSV automaticamente, piuttosto che un export manuale che si dimentica di fare.

Vedi più sotto [esempi di query SQL](#esempi-di-query-sql-su-gestionali-tipici) per i gestionali più diffusi.

### Fase 3 — Pubblicazione (mezza giornata)

I CSV vanno esposti pubblicamente in uno di questi modi (in ordine di preferenza):

1. **Portale OpenData del Comune** (CKAN, Opendatasoft, Drupal): URL HTTPS pubblico, auto-refresh
2. **Repository GitHub del Comune** con GitHub Action che aggiorna i CSV ogni notte
3. **PR diretta sul repo `piersoft/comune-metrics`** con i CSV come fixture

Per le opzioni 1 e 2 il manifest del Comune userà `source_type: external_csv` con l'URL pubblico. Per l'opzione 3 si usa `source_type: fixture`.

### Fase 4 — Manifest e PR (mezza giornata)

Il Responsabile crea il manifest seguendo il [README](../README.md) e apre la pull request. Quando la PR viene mergiata, il Comune compare nella dashboard.

### Tempi realistici totali

- **Comune piccolo** (≤10.000 ab., 4-5 dataset): **1 settimana** di lavoro distribuito
- **Comune medio** (10.000-50.000 ab., 7-9 dataset): **2-3 settimane**
- **Comune grande** (>50.000 ab., 11/11): **1-2 mesi** se si fa il lavoro per bene con automation

---

## Esempi di query SQL su gestionali tipici

Le query seguenti sono **template di partenza** da adattare al proprio gestionale. I nomi delle tabelle/colonne variano per vendor.

### Dataset 1 — Popolazione (da Anagrafe APR)

```sql
-- PostgreSQL/Oracle, schema tipico ANPR/APR
SELECT
    EXTRACT(YEAR FROM data_riferimento)::int AS anno,
    quartiere,
    COUNT(*) AS residenti
FROM anagrafe_residenti
WHERE stato_civile_attuale != 'CESSATO'
  AND data_cancellazione IS NULL
  AND data_riferimento BETWEEN '2010-01-01' AND CURRENT_DATE
GROUP BY EXTRACT(YEAR FROM data_riferimento), quartiere
ORDER BY anno, quartiere;
```

### Dataset 2 — Bilancio (da gestionale finanziario)

```sql
-- Spesa consuntiva per missione/programma DLgs 118/2011
SELECT
    anno_esercizio AS anno,
    missione_descrizione AS missione,
    programma_descrizione AS programma,
    SUM(importo_pagato) AS importo_euro
FROM movimenti_finanziari
WHERE tipo_movimento = 'PAGAMENTO'
  AND anno_esercizio BETWEEN 2018 AND EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY anno_esercizio, missione_descrizione, programma_descrizione
ORDER BY anno_esercizio, missione_descrizione;
```

### Dataset 3 — Opere pubbliche (da gestionale LL.PP.)

```sql
SELECT
    descrizione_opera AS nome,
    anno_inserimento AS anno,
    stato_avanzamento AS stato,
    importo_quadro_economico AS importo_euro,
    codice_cup AS cup,
    fonte_finanziamento,
    latitudine AS lat,
    longitudine AS lon,
    rup_nominativo AS rup
FROM opere_pubbliche
WHERE data_cancellazione IS NULL
ORDER BY anno DESC;
```

### Dataset 4 — Pratiche edilizie (da SUE)

```sql
SELECT
    data_protocollo AS data,
    tipo_pratica AS tipo,
    esito_pratica AS esito,
    data_chiusura AS chiusura_data,
    via_intervento AS via,
    civico_intervento AS civico
FROM pratiche_sue
WHERE data_protocollo >= '2018-01-01'
ORDER BY data_protocollo DESC;
```

### Dataset 5 — Servizi sociali (da cartella sociale)

```sql
SELECT
    EXTRACT(YEAR FROM data_apertura)::int AS anno,
    tipo_intervento AS categoria,
    COUNT(DISTINCT codice_fiscale_utente) AS utenti,
    SUM(importo_erogato) AS spesa_euro,
    COUNT(*) AS interventi
FROM interventi_sociali
WHERE data_apertura BETWEEN '2020-01-01' AND CURRENT_DATE
GROUP BY EXTRACT(YEAR FROM data_apertura), tipo_intervento
ORDER BY anno, categoria;
```

### Dataset 7 — Incidenti stradali (da sw Polizia Locale)

```sql
SELECT
    data_evento AS data,
    latitudine AS lat,
    longitudine AS lon,
    n_morti_30gg AS morti,
    n_feriti AS feriti,
    via_toponomastica AS zona,
    natura_evento AS tipo,
    TO_CHAR(data_evento, 'HH24:MI') AS ora
FROM incidenti_stradali
WHERE data_evento >= '2020-01-01'
ORDER BY data_evento DESC;
```

### Dataset 11 — Patrimonio (da inventario)

```sql
SELECT
    denominazione_immobile AS denominazione,
    tipologia AS tipo,
    indirizzo,
    latitudine AS lat,
    longitudine AS lon,
    valore_iscritto_bilancio AS valore_euro,
    CASE WHEN flag_vincolo_culturale = 'S' THEN true ELSE false END AS vincolo_culturale,
    destinazione_uso AS uso
FROM patrimonio_immobiliare
WHERE flag_attivo = 'S'
ORDER BY tipologia, denominazione_immobile;
```

### Dataset 12 — Tributi (da gestionale tributi locali)

Schema canonico: `anno, tributo` (required); `gettito_euro, n_contribuenti, aliquota_base, descrizione, categoria` (optional).

I tipi di tributo standardizzati sono: `IMU`, `TARI`, `TASSA_SOGGIORNO`, `ADDIZIONALE_IRPEF`, `COSAP`, `IMPOSTA_PUBBLICITA`, `CANONE_UNICO`. Categoria libera per disaggregazioni (es. "Utenze domestiche" / "Utenze non domestiche" per TARI).

```sql
-- Gettito IMU: somma dei versamenti spontanei e accertamenti riscossi
SELECT
    EXTRACT(YEAR FROM data_versamento) AS anno,
    'IMU' AS tributo,
    SUM(importo_versato) AS gettito_euro,
    COUNT(DISTINCT codice_fiscale) AS n_contribuenti,
    1.06 AS aliquota_base,  -- da delibera Consiglio Comunale
    'Aliquota ordinaria 10.6 per mille' AS descrizione
FROM versamenti_imu
WHERE data_versamento >= '2020-01-01'
GROUP BY EXTRACT(YEAR FROM data_versamento);

-- Gettito TARI: dal ruolo tariffario annuale
SELECT
    anno_imposta AS anno,
    'TARI' AS tributo,
    SUM(importo_dovuto) AS gettito_euro,
    COUNT(DISTINCT codice_utente) AS n_contribuenti,
    NULL AS aliquota_base,  -- TARI ha tariffe per categoria, non aliquota
    categoria_tarsu AS categoria  -- "Utenze domestiche" / "Utenze non domestiche"
FROM ruolo_tari
WHERE anno_imposta >= 2020
GROUP BY anno_imposta, categoria_tarsu;

-- Tassa di soggiorno
SELECT
    EXTRACT(YEAR FROM data_versamento) AS anno,
    'TASSA_SOGGIORNO' AS tributo,
    SUM(importo) AS gettito_euro,
    NULL AS n_contribuenti,  -- versano gli alberghi, non i turisti
    2.50 AS aliquota_base,
    'Tassa €2.50/notte categoria 4 stelle' AS descrizione
FROM versamenti_tassa_soggiorno
GROUP BY EXTRACT(YEAR FROM data_versamento);
```

**Esempio di CSV finale (5 tributi per il 2024):**

```csv
anno,tributo,gettito_euro,n_contribuenti,aliquota_base,descrizione,categoria
2024,IMU,15800000.00,32500,1.06,Aliquota ordinaria 10.6 per mille,
2024,TARI,12300000.00,38000,,,Utenze domestiche
2024,TARI,6200000.00,4000,,,Utenze non domestiche
2024,TASSA_SOGGIORNO,1250000.00,,2.50,Tassa €2.50/notte,
2024,ADDIZIONALE_IRPEF,8900000.00,,0.80,Aliquota 0.80%,
2024,COSAP,420000.00,820,,,Spazi pubblici
```

Note importanti:
- `gettito_euro` deve essere il **riscosso effettivo**, non il previsto a bilancio
- Per TARI è frequente avere più righe per stesso anno con `categoria` diversa (domestiche/non domestiche, scaglioni)
- L'`aliquota_base` è quella pubblicata sul Portale del Federalismo Fiscale del MEF, link normalmente tra le delibere comunali

---

## Cosa NON fare

| Anti-pattern | Perché è sbagliato |
|---|---|
| **Esportare PDF invece di CSV** | I PDF non sono parsabili automaticamente. Il workflow li rifiuta |
| **Mettere virgola come separatore decimale** (`123,45`) | Lo standard del paniere è il punto. La virgola è ambigua nei CSV |
| **Lasciare colonne vuote senza criterio** | Se una colonna obbligatoria è sempre vuota, il dato è inutile |
| **Esportare ZIP con dentro CSV** | Il workflow non disimbusta archivi. Esporre direttamente il CSV |
| **Usare nomi colonne in maiuscolo** (`ANNO` invece di `anno`) | Gli header sono case-sensitive. Il validatore rifiuta |
| **Pubblicare su URL temporanei** (Google Drive privato, OneDrive) | Il workflow non può autenticarsi. Servono URL pubblici stabili |
| **Aggiornare a mano una volta all'anno** | Il dato recente è oro, quello vecchio rumore. Schedulare l'estrazione |

---

## Comuni che non pubblicano: il fallback nazionale

Se un Comune non pubblica i propri OpenData, ComuneMetrics non lo nasconde dalla dashboard. Mostra un **banner rosso** con la scritta «`<Comune>` non pubblica OpenData» e ricostruisce — dove possibile — i dataset del paniere a partire da **banche dati nazionali pubbliche**. Sulla dashboard questi Comuni sono marcati come `mode: reconstructed_from_national`.

È il caso del Comune di Potenza, dove 8 dei 12 dataset CORE sono stati ricostruiti.

**Importante**: la ricostruzione da fonti nazionali NON sostituisce la pubblicazione vera. È un fallback divulgativo che evidenzia la mancata pubblicazione e mostra il dato che il cittadino *avrebbe avuto* se il Comune avesse fatto il suo lavoro.

### Quali fonti vengono usate

| Dataset paniere | Fonte nazionale | Cosa fornisce |
|---|---|---|
| popolazione | ISTAT — Demografia | residenti per Comune e per anno |
| bilancio | MEF — banca dati BDAP-RGS | spese del Comune classificate per Titolo (correnti, in conto capitale, rimborso prestiti) |
| opere pubbliche | MEF — Monitoraggio Opere Pubbliche (MOP) | elenco delle opere CUP intestate al Comune |
| istruzione | MIM — Anagrafe Scuole Statali | scuole presenti sul territorio comunale |
| rifiuti | ISPRA — Catasto Rifiuti | percentuale di raccolta differenziata |
| eventi culturali | MiC — ArCo (Catalogo Generale Beni Culturali) | luoghi della cultura del Comune |
| patrimonio | MiC — ArCo (Catalogo Generale Beni Culturali) | beni culturali e immobili vincolati |
| tributi | MEF — Portale Federalismo Fiscale | aliquote IMU e addizionale IRPEF (non il gettito reale) |

### Quali dataset NON sono ricostruibili

Quattro dataset del paniere **non hanno una fonte nazionale a livello comunale**:

- **Pratiche edilizie**: ogni SUE è gestito autonomamente dal Comune, non esiste un aggregatore nazionale.
- **Servizi sociali**: i dati ministeriali sono aggregati a livello regionale.
- **Incidenti stradali**: la rilevazione ISTAT è provinciale; i dati ACI escludono le strade urbane dei centri abitati >10.000 abitanti.
- **Delibere**: ogni Comune le pubblica solo sul proprio Albo Pretorio, non esiste un catalogo nazionale.

Per questi 4 dataset, l'unica strada è che il Comune li pubblichi direttamente.

---



## Sinonimi accettati nei nomi colonna

Il builder ComuneMetrics riconosce **sinonimi** comuni per i nomi delle colonne, in modo che il Comune non sia costretto a rinominare i campi del proprio gestionale. Esempi:

| Campo canonico | Sinonimi accettati |
|---|---|
| `data` | `Data`, `data_evento`, `data_incidente`, `Data Evento` |
| `lat` | `Lat`, `Latitude`, `latitudine`, `y` |
| `lon` | `Lon`, `Longitude`, `longitudine`, `x` |
| `morti` | `Morti`, `Decessi`, `n_morti`, `Persone decedute`, `n_decessi` |
| `feriti` | `Feriti`, `n_feriti`, `Persone ferite`, `Numero feriti` |
| `categoria` | `Categoria`, `intervento_tipo` |
| `interventi` | `n_pratiche`, `Numero_pratiche`, `count` |
| `rd_pct` | `RD %`, `Percentuale differenziata`, `raccolta_differenziata_pct` |
| `gettito_euro` | `importo_versato`, `Importo`, `riscosso`, `gettito` |

L'elenco completo è in [`config/metrics.yml`](../config/metrics.yml) sezione `expected_fields`. Se il vostro gestionale esporta con un nome non standard, **aprite una PR** per aggiungerlo: di solito è una riga sola.

> **Suggerimento operativo**: NON rinominate manualmente le colonne del CSV se il vostro gestionale usa già nomi tipo `Persone decedute` o `Numero_pratiche`. Lasciate che il builder li riconosca da solo. Manutenzione zero per voi.

---

## Integrazione con `dati.gov.it`

Se il Comune già pubblica su un portale CKAN harvestato da `dati.gov.it`, può sfruttarlo:

1. Crea i CSV del paniere come **risorse aggiuntive** dei dataset esistenti (non sostituirli)
2. Nel manifest ComuneMetrics usa `source_type: external_csv` con l'URL della risorsa CSV
3. Il workflow `build-data.yml` farà fetch ad ogni run

I metadati DCAT-AP_IT del dataset originale rimangono invariati. Il Comune mantiene la sovranità sul proprio portale.

---

## Riferimenti normativi

- **DLgs 33/2013** — Riordino della disciplina riguardante il diritto di accesso civico (FOIA)
- **DLgs 36/2006** modificato dal **DLgs 102/2015** — Riutilizzo delle informazioni del settore pubblico (PSI Directive)
- **DLgs 82/2005** (CAD) — art. 50, 52 sull'apertura dei dati
- **DLgs 118/2011** — Armonizzazione bilanci PA, classificazione missioni/programmi
- **DLgs 446/1997** — disciplina IMU/TARI; aliquote pubblicate sul [Portale del Federalismo Fiscale MEF](https://www1.finanze.gov.it/finanze/pubblicazioneregolamenti/public/elencoPubblicazioni)
- **AgID — Linee guida open data** ([docs.italia.it](https://docs.italia.it))
- **DCAT-AP_IT v2.1** — profilo italiano di DCAT-AP

---

## Licenza

Documento rilasciato sotto **CC-BY 4.0**.
Le query SQL di esempio sono di pubblico dominio (CC0).
