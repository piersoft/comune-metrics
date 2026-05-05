# Paniere ComuneMetrics — Guida pratica per Comuni

> Come costruire gli 11 CSV del paniere partendo dai gestionali interni del Comune. Documento operativo per Responsabili Transizione Digitale, IT, e referenti OpenData.

**Specifica tecnica del formato CSV**: vedi [`PANIERE_CSV_SCHEMA.md`](PANIERE_CSV_SCHEMA.md) e gli schemi formali in [`../schemas/csv/`](../schemas/csv/).

**Procedura di adozione passo-passo**: vedi [README.md principale](../README.md).

---

## Cosa è il paniere

Il paniere è un insieme di **11 dataset CORE** che descrivono l'attività amministrativa di un Comune italiano:

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

Un Comune può adottarne **anche solo alcuni**: i mancanti vengono dichiarati `presente: false` nel manifest.

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
| **Aggiornare a mano una volta all'anno** | Il dato fresco è oro, quello vecchio rumore. Schedulare l'estrazione |

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
- **AgID — Linee guida open data** ([docs.italia.it](https://docs.italia.it))
- **DCAT-AP_IT v2.1** — profilo italiano di DCAT-AP

---

## Licenza

Documento rilasciato sotto **CC-BY 4.0**.
Le query SQL di esempio sono di pubblico dominio (CC0).
