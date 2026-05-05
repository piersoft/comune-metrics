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
2. **È possibile estrarne un CSV?** (export nativo, report custom, estrazione su richiesta del fornitore)
3. **Chi è il referente che esegue l'estrazione?**
4. **Con quale cadenza il dato è aggiornato?** (real-time, mensile, annuale)

Output del tavolo: tabella `dataset → gestionale → referente → cadenza → fattibilità`.

### Fase 2 — Estrazione (1-3 giornate per dataset)

Per ogni dataset, il referente IT (o il fornitore del gestionale) prepara un'**estrazione automatizzata** che produca il CSV nel formato canonico (vedi schemi in `schemas/csv/`).

L'estrazione va **standardizzata e schedulata**: meglio un job notturno che genera il CSV automaticamente, piuttosto che un export manuale che si dimentica di fare.

Vedi [§ A chi chiedere cosa dentro il Comune](#a-chi-chiedere-cosa-dentro-il-comune) per la mappa ufficio→gestionale di ciascun dataset.

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

## A chi chiedere cosa dentro il Comune

Il paniere è dati del Comune sul Comune: nessun dato del paniere è in mano al RTD da solo. Per popolare ciascun dataset bisogna **chiedere un'estrazione all'ufficio responsabile** o al fornitore del relativo gestionale. Sotto, la mappa operativa.

> Per ogni dataset, il **formato di output desiderato** è la scheda corrispondente in [`PANIERE_CSV_SCHEMA.md`](PANIERE_CSV_SCHEMA.md): nome colonne, tipi, esempi. Allegare la scheda alla richiesta evita malintesi.

| Dataset | Ufficio interno responsabile | Tipo di gestionale di partenza | Cosa chiedere all'IT o al fornitore |
|---|---|---|---|
| 1. Popolazione | Servizi Demografici / Anagrafe | APR-ANPR | Estrazione annua dei residenti per anno e quartiere/zona, dal 2010 a oggi |
| 2. Bilancio | Ragioneria | Gestionale finanziario armonizzato (DLgs 118/2011) | Estrazione annua delle spese consuntivate per Titolo e macro-aggregato del Piano dei Conti |
| 3. Opere pubbliche | Lavori Pubblici / OO.PP. | Gestionale OO.PP. integrato con SIMOG-ANAC | Elenco opere CUP con stato, costo previsto, fonte di finanziamento, geolocalizzazione |
| 4. Pratiche edilizie | SUE — Sportello Unico Edilizia | Gestionale SUE / protocollo edilizio | Elenco CILA/SCIA/Permessi con data di presentazione, tipo, esito, data di chiusura |
| 5. Servizi sociali | Servizi Sociali / Welfare | Cartella sociale informatizzata | Numero utenti e spesa per categoria di intervento (anziani, minori, disabilità, ecc.) |
| 6. Istruzione | Servizi Educativi (per asili nido, infanzia comunali) + Anagrafe Scuole MIM | Gestionale iscrizioni nidi/infanzia | Elenco strutture con denominazione, tipologia, alunni iscritti, geolocalizzazione |
| 7. Incidenti stradali | Polizia Locale | Software di rilevazione incidenti | Elenco sinistri con data, ora, geolocalizzazione, decessi, feriti |
| 8. Rifiuti | Ambiente / Igiene Urbana | Gestionale igiene urbana o report del gestore (es. AMA, AMIU, ecc.) | Quantitativi annui per frazione (totale, differenziata, indifferenziata) e percentuale RD |
| 9. Eventi culturali | Cultura / Turismo | Gestionale eventi o calendario sito istituzionale | Calendario manifestazioni con data inizio/fine, luogo, organizzatore |
| 10. Delibere | Segreteria Generale | Gestionale atti / Albo Pretorio online | Elenco atti con data, tipo, numero, oggetto, ufficio proponente |
| 11. Patrimonio | Patrimonio | Inventario beni immobili | Elenco immobili con denominazione, indirizzo, rendita catastale, vincolo, destinazione |
| 12. Tributi | Tributi | Gestionale tributi locali | Gettito riscosso annuo per tipo (IMU, TARI, tassa soggiorno, addizionale IRPEF, ecc.) e relative aliquote |

### Modello di richiesta

Una richiesta efficace contiene quattro elementi:

1. **Lo scopo**: «pubblicare il dataset `<nome>` su `dati.gov.it` come previsto dal piano triennale RTD»
2. **Il formato richiesto**: link alla scheda dataset in [`PANIERE_CSV_SCHEMA.md`](PANIERE_CSV_SCHEMA.md)
3. **La frequenza**: estrazione annuale, mensile o trimestrale a seconda del dataset
4. **La destinazione**: URL stabile che il Comune o il fornitore espone, da censire poi nel manifest (vedi sezione successiva)

> **Suggerimento operativo**: per i Comuni che esternalizzano l'IT, conviene inserire la pubblicazione del paniere come **clausola contrattuale** alla prossima gara: 12 estrazioni schedulate verso un endpoint pubblico stabile costano poco se chiesto al fornitore in fase di gara, costano molto se chiesto come variazione in corso d'opera.

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
