# Paniere OpenData ComuneMetrics — Specifica v2.1

**Data:** Maggio 2026
**Licenza dati raccomandata:** CC-BY 4.0 o IODL 2.0
**Formato:** CSV UTF-8 (separatore `,`, header obbligatorio sulla prima riga)
**Encoding date:** ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDThh:mm:ssZ`)
**Encoding numerici:** punto come separatore decimale (`123.45`), nessun separatore migliaia
**Conformità metadati:** DCAT-AP_IT v2.1 — 8 temi EU
**Conformità Linked Data:** OntoPiA / `schema.gov.it` (15 ontologie)
**Validazione:** ogni dataset ha JSON Schema in `/schemas/` e regole di mapping RDF in `/scripts/csv-to-rdf-rules/`

---

## Filosofia

Il paniere è composto da **11 dataset CORE obbligatori** che, se pubblicati da un Comune con schema CSV conforme **e distribuzione TTL allegata**, "accendono" la dashboard ComuneMetrics. La conformità è verificabile in modo automatico tramite:

1. **Validazione CSV** contro JSON Schema
2. **Validazione TTL** contro vocabolari OntoPiA (sparql ASK su `schema.gov.it/sparql`)
3. **Verifica metadati DCAT-AP_IT** (theme, license, frequency, holder)

Ogni Comune riceve un **badge di trasparenza**:

- **0–3 dataset CORE** → badge ROSSO "Trasparenza minima"
- **4–7 dataset CORE** → badge GIALLO "Trasparenza parziale"
- **8–10 dataset CORE** → badge ARANCIONE "Trasparenza avanzata"
- **11/11 dataset CORE** → badge VERDE "Comune Trasparente — ComuneMetrics Compliant"
- **11/11 + tutti con distribuzione TTL OntoPiA-compliant** → badge ORO "5★ Linked Open Data"

L'approccio "schema rigido + Linked Data" è una scelta deliberata: garantisce che i KPI siano comparabili tra Comuni, che la dashboard funzioni senza adattamenti, e che i dataset siano interrogabili in **federazione SPARQL** tra Comuni diversi.

### Esempi ancorati a dataset reali multi-Comune

Gli esempi Turtle che corredano ciascuno degli 11 dataset di questa specifica **non sono fittizi**: ogni esempio è derivato da un dataset realmente pubblicato e harvestato da `dati.gov.it`. La distribuzione tra i Comuni di riferimento è la seguente (mostra che il paniere non è tarato su un solo ente, ma intercetta pratiche di pubblicazione già attive in città di dimensioni e geografie diverse):

| # | Dataset | Comune di esempio | Codice IPA | Dataset reale di riferimento |
|---|---|---|---|---|
| 1 | popolazione | **Bologna** | `c_a944` | Popolazione residente per età, sesso, cittadinanza, quartiere |
| 2 | bilancio | **Milano** | `c_f205` | Bilancio trasparente: Spesa corrente per missioni e programmi |
| 3 | opere_pubbliche | **Bologna** | `c_a944` | Lavori in corso in città |
| 4 | pratiche_edilizie | **Bologna** | `c_a944` | CILA — comunicazioni inizio lavori |
| 5 | servizi_sociali | **Lecce** | `c_e506` | Numero pratiche evase Settore Servizi Sociali |
| 6 | istruzione (asili) | **Lecce** | `c_e506` | Elenco e ubicazione asili nido comunali |
| 7 | incidenti_stradali | **Firenze** | `c_d612` | Numero incidenti stradali per Quartiere |
| 8 | rifiuti | **Bologna** | `c_a944` | Indicatori Raccolta Differenziata |
| 9 | eventi_culturali | **Lecce** | `c_e506` | Eventi culturali ricorrenti |
| 10 | delibere | **Firenze** | `c_d612` | Delibere Consiglio Comunale - Anno 2023 |
| 11 | patrimonio | **Milano** | `c_f205` | Elenco immobili di proprietà del Comune di Milano |

**Distribuzione geografica:** 4 Bologna · 3 Lecce · 2 Firenze · 2 Milano (Nord 6, Centro 2, Sud 3).

---

## Indice delle 11 aree CORE

| # | Dataset | File | Tema DCAT-AP_IT | Frequenza min. | Ontologie OntoPiA primarie |
|---|---|---|---|---|---|
| 1 | Popolazione residente | `popolazione.csv` | SOCI | Annuale | QB + SKOS + CLV |
| 2 | Bilancio per missione | `bilancio.csv` | ECON | Annuale | QB + SKOS + COV |
| 3 | Opere pubbliche | `opere_pubbliche.csv` | ECON | Trimestrale | CPSV-AP + CLV + TI + POI |
| 4 | Pratiche edilizie | `pratiche_edilizie.csv` | GOVE | Trimestrale | CPSV-AP + TI + CLV + SKOS |
| 5 | Servizi sociali | `servizi_sociali.csv` | SOCI | Annuale | CPSV-AP + QB + SKOS |
| 6 | Istruzione & asili | `istruzione.csv` | EDUC | Annuale | Cultural-ON + POI + CLV + TI |
| 7 | Incidenti stradali | `incidenti_stradali.csv` | TRAN | Mensile | QB + CLV + TI + SKOS |
| 8 | Raccolta rifiuti | `rifiuti.csv` | ENVI | Mensile | QB + SKOS + CLV |
| 9 | Eventi culturali | `eventi_culturali.csv` | EDUC | Trimestrale | Cultural-ON + POI + CLV + TI |
| 10 | Delibere e atti | `delibere.csv` | GOVE | Mensile | CPSV-AP + TI + COV + RO + ADMS |
| 11 | Patrimonio immobiliare | `patrimonio.csv` | GOVE | Annuale | POI + CLV + SKOS |

---

## Convenzioni OntoPiA

### Ontologie usate (con prefissi standard)

```turtle
@prefix dcat:        <http://www.w3.org/ns/dcat#> .
@prefix dcatapit:    <http://dati.gov.it/onto/dcatapit#> .
@prefix dct:         <http://purl.org/dc/terms/> .
@prefix foaf:        <http://xmlns.com/foaf/0.1/> .
@prefix rdf:         <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:        <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos:        <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd:         <http://www.w3.org/2001/XMLSchema#> .
@prefix geo:         <http://www.w3.org/2003/01/geo/wgs84_pos#> .
@prefix qb:          <http://purl.org/linked-data/cube#> .

# OntoPiA — schema.gov.it
@prefix l0:          <https://w3id.org/italia/onto/l0/> .
@prefix clv:         <https://w3id.org/italia/onto/CLV/> .
@prefix cov:         <https://w3id.org/italia/onto/COV/> .
@prefix cpv:         <https://w3id.org/italia/onto/CPV/> .
@prefix poi:         <https://w3id.org/italia/onto/POI/> .
@prefix sm:          <https://w3id.org/italia/onto/SM/> .
@prefix ro:          <https://w3id.org/italia/onto/RO/> .
@prefix ti:          <https://w3id.org/italia/onto/TI/> .
@prefix adms:        <http://www.w3.org/ns/adms#> .
@prefix culturalon:  <https://w3id.org/italia/onto/Cultural-ON/> .
@prefix cpsvap:      <https://w3id.org/italia/onto/CPSV/> .
```

### Pattern URI canonico

Tutti gli URI delle entità seguono lo schema OntoPiA ufficiale:

```
https://w3id.org/italia/data/{codice-ipa}/{tipo-risorsa}/{id-riga}
```

Dove `{codice-ipa}` è il codice IPA del Comune (es. `c_a662` per Bari, `c_e506` per Lecce, `c_d761` per Firenze, `c_f205` per Milano, `c_a944` per Bologna, `c_f052` per Matera).

| Dataset | Tipo risorsa URI |
|---|---|
| popolazione | `population-observation` |
| bilancio | `budget-observation` |
| opere_pubbliche | `public-work` |
| pratiche_edilizie | `building-procedure` |
| servizi_sociali | `social-service-observation` |
| istruzione | `school-facility` |
| incidenti_stradali | `road-accident` |
| rifiuti | `waste-observation` |
| eventi_culturali | `cultural-event` |
| delibere | `administrative-act` |
| patrimonio | `point-of-interest` |

### Mapping deterministico colonne → proprietà RDF

Per le colonne ricorrenti, il mapping è **deterministico** (zero ambiguità). Coerente con `github.com/piersoft/CSV-to-RDF`:

| Pattern colonna | Proprietà RDF | Tipo XSD |
|---|---|---|
| `lat`, `latitudine` | `geo:lat` | `xsd:decimal` |
| `lon`, `lng`, `longitudine` | `geo:long` | `xsd:decimal` |
| `email`, `mail`, `pec` | `sm:hasEmail` | `xsd:string` |
| `tel`, `telefono`, `phone` | `sm:hasTelephone` | `xsd:string` |
| `sito`, `website`, `url` | `sm:hasWebSite` | `xsd:anyURI` |
| `id`, `codice`, `cf`, `piva` | `dct:identifier` | `xsd:string` |
| `nome`, `denominazione`, `titolo` | `rdfs:label` | `@it` |
| `descrizione`, `oggetto`, `note` | `dct:description` | `@it` |
| `data`, `data_*` | `dct:date` | `xsd:date` |
| `via`, `civico`, `cap`, `comune` | `clv:hasAddress` | (struttura `clv:Address`) |
| `tipo`, `tipologia`, `categoria` | `dct:type` | `@it` o `skos:Concept` |
| `stato`, `status` | `adms:status` | `skos:Concept` |
| `cup` | `dct:identifier` (con `dct:conformsTo` CIPE) | `xsd:string` |
| `cig` | `dct:identifier` (con `dct:conformsTo` ANAC) | `xsd:string` |

### Vocabolari controllati SKOS

I campi categoriali del paniere (es. `frazione`, `tipo_pratica`, `stato_uso`) sono pubblicati come `skos:ConceptScheme` riusabili. Schema URI:

```
https://w3id.org/italia/controlled-vocabulary/comune-metrics/{nome-vocabolario}
```

Esempio per le frazioni rifiuti: `https://w3id.org/italia/controlled-vocabulary/comune-metrics/waste-fractions`

### Metadati DCAT-AP_IT obbligatori

Ogni distribuzione del paniere include come `dcat:Dataset`:

- `dct:title`: titolo del dataset
- `dct:description`: descrizione
- `dct:identifier`: identificativo univoco persistente
- `dct:issued`: data prima pubblicazione (ISO 8601)
- `dct:modified`: data ultimo aggiornamento (ISO 8601)
- `dct:publisher` (`foaf:Agent`): denominazione del Comune
- `dct:rightsHolder` (`dcatapit:Agent` con `dct:identifier` = codice IPA): titolare
- `dcat:theme`: codice tema EU (es. `http://publications.europa.eu/resource/authority/data-theme/SOCI`)
- `dct:accrualPeriodicity`: frequenza (`ANNUAL`, `QUARTERLY`, `MONTHLY`)
- `dct:license`: URL CC-BY 4.0 o IODL 2.0
- `dct:spatial`: codice ISTAT del Comune (URI)
- `dct:conformsTo`: URI di questo Paniere v2.0
- `dcatapit:holderIdentifier`: codice IPA del Comune

### Marker per riconoscimento automatico

I dataset CKAN del Comune devono includere nel campo `extras`:

- `paniere_comunemetrics`: `true`
- `paniere_dataset_id`: nome del dataset paniere (es. `popolazione`, `bilancio`)
- `paniere_versione_schema`: `2.0`

Questo permette al loader della dashboard di trovare automaticamente i dataset conformi cercando `extras_paniere_comunemetrics:true` nel catalogo del Comune o in dati.gov.it.

### Codifiche standard

| Tipo dato | Standard |
|---|---|
| Codice Comune | ISTAT (6 cifre) |
| Codice IPA | Indice PA (es. `c_a662`) |
| Codice fiscale / P.IVA | Standard italiano |
| Coordinate | WGS84 (EPSG:4326), gradi decimali |
| CUP opere | Codice Unitario Progetto (15 char) — CIPE |
| CIG gare | Codice Identificativo Gara — ANAC |
| Importi | Euro, decimali con punto, nessun simbolo |
| Missioni di bilancio | DM 18/04/2012 (codici 01–20) |

---

## Dataset 1 — Popolazione residente

**File:** `popolazione.csv`
**Frequenza:** annuale (al 31/12)
**Tema DCAT-AP_IT:** `SOCI` (Popolazione e società)
**Ontologie OntoPiA:** **QB** (osservazioni statistiche multidimensionali) + **SKOS** (vocabolari `fascia_eta`, `cittadinanza`) + **CLV** (`area_sub_comunale`)
**Granularità:** una riga per anno × area sub-comunale × fascia età × genere × cittadinanza
**URI tipo risorsa:** `population-observation`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `anno` | int | sì | `qb:dimension` → custom `:refYear` | `xsd:gYear` | `2024` |
| `area_sub_comunale` | string | sì | `qb:dimension` → `clv:hasCity` o `clv:hasSubCity` (riferimento `clv:City`) | URI o literal `@it` | `Centro storico` |
| `fascia_eta` | string | sì | `qb:dimension` → `skos:Concept` da CV `age-bands` | URI vocabolario | `30-44` |
| `genere` | string | sì | `qb:dimension` → `skos:Concept` (CV ISTAT genere) | URI | `F` |
| `cittadinanza` | string | sì | `qb:dimension` → `skos:Concept` (CV ISTAT) | URI | `ITA` |
| `residenti` | int | sì | `qb:measure` → custom `:residentsCount` | `xsd:nonNegativeInteger` | `1245` |
| `nati_anno` | int | no | `qb:measure` → custom `:birthsInYear` | `xsd:nonNegativeInteger` | `89` |
| `morti_anno` | int | no | `qb:measure` → custom `:deathsInYear` | `xsd:nonNegativeInteger` | `124` |
| `iscritti_anno` | int | no | `qb:measure` → custom `:registrationsInYear` | `xsd:nonNegativeInteger` | `212` |
| `cancellati_anno` | int | no | `qb:measure` → custom `:cancellationsInYear` | `xsd:nonNegativeInteger` | `198` |

### KPI derivabili

- **Indice di vecchiaia** = `pop_65+ / pop_0-14 × 100`
- **Saldo naturale** = `nati - morti`
- **Saldo migratorio** = `iscritti - cancellati`
- **% stranieri** = `pop_STR / pop_TOTALE × 100`
- **Trend popolazione** su serie temporale

### Esempio Turtle (Comune di Bologna, codice IPA `c_a944`)

> Esempio derivato dal dataset reale **"Popolazione residente per età, sesso, cittadinanza, quartiere e zona — serie storica dal 1986"** pubblicato dal Comune di Bologna su dati.gov.it (id `e770f5f1-9156-4612-b5ad-ee7b4bc6018d`).

```turtle
# DataSet di tipo qb:DataSet
<https://w3id.org/italia/data/c_a944/population-dataset/2024>
    a qb:DataSet, dcatapit:Dataset ;
    rdfs:label "Popolazione residente Comune di Bologna 2024"@it ;
    dct:publisher <https://w3id.org/italia/data/c_a944/public-organization/comune-bologna> ;
    qb:structure <https://w3id.org/italia/data/comune-metrics/dsd/population> ;
    dct:issued "2025-01-31"^^xsd:date ;
    dct:license <https://creativecommons.org/licenses/by/4.0/> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=e770f5f1-9156-4612-b5ad-ee7b4bc6018d> .

# Una osservazione: residenti 30-44 anni, donne, italiane, Quartiere San Vitale, anno 2024
<https://w3id.org/italia/data/c_a944/population-observation/2024-SAN_VITALE-30_44-F-ITA>
    a qb:Observation ;
    qb:dataSet <https://w3id.org/italia/data/c_a944/population-dataset/2024> ;
    <https://w3id.org/italia/data/comune-metrics/property/refYear> "2024"^^xsd:gYear ;
    <https://w3id.org/italia/data/comune-metrics/property/refArea>
        <https://w3id.org/italia/data/c_a944/sub-city/san-vitale> ;
    <https://w3id.org/italia/data/comune-metrics/property/ageBand>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/age-bands/30-44> ;
    <https://w3id.org/italia/data/comune-metrics/property/gender>
        <https://w3id.org/italia/controlled-vocabulary/istat/gender/F> ;
    <https://w3id.org/italia/data/comune-metrics/property/citizenship>
        <https://w3id.org/italia/controlled-vocabulary/istat/citizenship/ITA> ;
    <https://w3id.org/italia/data/comune-metrics/property/residentsCount>
        "5012"^^xsd:nonNegativeInteger .

# Quartiere come clv:City (sub-comunale)
<https://w3id.org/italia/data/c_a944/sub-city/san-vitale>
    a clv:City ;
    rdfs:label "Quartiere San Vitale"@it ;
    clv:hasHigherRank <https://w3id.org/italia/data/c_a944/public-organization/comune-bologna> .

# Vocabolario controllato fascia età
<https://w3id.org/italia/controlled-vocabulary/comune-metrics/age-bands/30-44>
    a skos:Concept ;
    skos:inScheme <https://w3id.org/italia/controlled-vocabulary/comune-metrics/age-bands> ;
    skos:prefLabel "30-44 anni"@it ;
    skos:notation "30-44" .
```

---

## Dataset 2 — Bilancio per missione

**File:** `bilancio.csv`
**Frequenza:** annuale (post-rendiconto, entro 30/06 anno successivo)
**Tema DCAT-AP_IT:** `ECON` (Economia e finanze)
**Riferimento normativo:** DM 18/04/2012 (armonizzazione bilanci EELL)
**Ontologie OntoPiA:** **QB** (Cubo statistico anno × missione × programma) + **SKOS** (CV missioni DM 2012) + **COV** (Comune publisher)
**Granularità:** una riga per anno × missione × programma × titolo × tipo_documento
**URI tipo risorsa:** `budget-observation`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `anno` | int | sì | `qb:dimension` → `:refYear` | `xsd:gYear` | `2024` |
| `tipo_documento` | string | sì | `qb:dimension` → `skos:Concept` (CV `budget-doc-type`) | URI | `RENDICONTO` |
| `missione_codice` | string | sì | `qb:dimension` → `skos:Concept` (CV `budget-missions-DM2012`) | URI | `04` |
| `missione_nome` | string | sì | `skos:prefLabel` (sul concetto missione) | `@it` | `Istruzione e diritto allo studio` |
| `programma_codice` | string | sì | `qb:dimension` → `skos:Concept` (CV `budget-programs-DM2012`) | URI | `01` |
| `programma_nome` | string | sì | `skos:prefLabel` (sul concetto programma) | `@it` | `Istruzione prescolastica` |
| `titolo` | string | sì | `qb:dimension` → `skos:Concept` (CV `budget-titles`) | URI | `1` |
| `stanziamento_iniziale` | decimal | sì | `qb:measure` → `:initialAllocation` | `xsd:decimal` (€) | `1250000.00` |
| `stanziamento_assestato` | decimal | sì | `qb:measure` → `:adjustedAllocation` | `xsd:decimal` (€) | `1380500.00` |
| `impegnato` | decimal | sì | `qb:measure` → `:committedAmount` | `xsd:decimal` (€) | `1295000.00` |
| `pagato` | decimal | sì | `qb:measure` → `:paidAmount` | `xsd:decimal` (€) | `1180000.00` |
| `popolazione_riferimento` | int | sì | `qb:attribute` → `:refPopulation` | `xsd:nonNegativeInteger` | `45230` |

### KPI derivabili

- **Spesa pro capite per missione** = `impegnato / popolazione_riferimento`
- **Capacità di spesa** = `pagato / impegnato × 100`
- **Capacità di impegno** = `impegnato / stanziamento_assestato × 100`
- **% scostamento previsione/rendiconto** = `(impegnato - stanziamento_iniziale) / stanziamento_iniziale × 100`
- **Composizione spesa per missione** (% sul totale)
- **Trend pluriennale per missione**

### Esempio Turtle (Comune di Milano, codice IPA `c_f205`)

> Esempio derivato dal dataset reale **"Bilancio trasparente: Spesa corrente per missioni e programmi"** pubblicato dal Comune di Milano su dati.gov.it (id `9136135e-192d-4ffe-9a1f-6221e63a1df3`).

```turtle
<https://w3id.org/italia/data/c_f205/budget-dataset/2024>
    a qb:DataSet, dcatapit:Dataset ;
    rdfs:label "Bilancio 2024 Comune di Milano — Rendiconto per missione/programma"@it ;
    dct:publisher <https://w3id.org/italia/data/c_f205/public-organization/comune-milano> ;
    qb:structure <https://w3id.org/italia/data/comune-metrics/dsd/budget> ;
    dct:conformsTo <https://www.gazzettaufficiale.it/eli/id/2012/04/26/12A04652/sg> ;
    dct:license <https://creativecommons.org/licenses/by/4.0/> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=9136135e-192d-4ffe-9a1f-6221e63a1df3> .

<https://w3id.org/italia/data/c_f205/budget-observation/2024-RENDICONTO-04-01-1>
    a qb:Observation ;
    qb:dataSet <https://w3id.org/italia/data/c_f205/budget-dataset/2024> ;
    <https://w3id.org/italia/data/comune-metrics/property/refYear> "2024"^^xsd:gYear ;
    <https://w3id.org/italia/data/comune-metrics/property/budgetDocType>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/budget-doc-type/RENDICONTO> ;
    <https://w3id.org/italia/data/comune-metrics/property/budgetMission>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/budget-missions-DM2012/04> ;
    <https://w3id.org/italia/data/comune-metrics/property/budgetProgram>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/budget-programs-DM2012/04-01> ;
    <https://w3id.org/italia/data/comune-metrics/property/budgetTitle>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/budget-titles/1> ;
    <https://w3id.org/italia/data/comune-metrics/property/initialAllocation> "85000000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/adjustedAllocation> "92500000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/committedAmount> "89200000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/paidAmount> "81100000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/refPopulation> "1365698"^^xsd:nonNegativeInteger .

# Concetto missione 04 (DM 18/04/2012)
<https://w3id.org/italia/controlled-vocabulary/comune-metrics/budget-missions-DM2012/04>
    a skos:Concept ;
    skos:inScheme <https://w3id.org/italia/controlled-vocabulary/comune-metrics/budget-missions-DM2012> ;
    skos:notation "04" ;
    skos:prefLabel "Istruzione e diritto allo studio"@it .

# Comune come cov:PublicOrganization
<https://w3id.org/italia/data/c_f205/public-organization/comune-milano>
    a cov:PublicOrganization, dcatapit:Agent ;
    dct:identifier "c_f205" ;
    rdfs:label "Comune di Milano"@it ;
    cov:legalName "Comune di Milano"@it .
```

---

## Dataset 3 — Opere pubbliche

**File:** `opere_pubbliche.csv`
**Frequenza:** trimestrale
**Tema DCAT-AP_IT:** `ECON` (Economia e finanze)
**Riferimento:** Codice contratti pubblici (D.Lgs. 36/2023), CUP/CIG ANAC
**Ontologie OntoPiA:** **CPSV-AP** (procedimento PA) + **CLV** (indirizzo) + **TI** (cronoprogramma) + **POI** (geolocalizzazione opera) + **COV** (RUP/stazione appaltante)
**Granularità:** una riga per opera (chiave = `cup`)
**URI tipo risorsa:** `public-work`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `cup` | string | sì | `dct:identifier` (con `dct:conformsTo` CIPE) | `xsd:string` | `J17H21001230001` |
| `cig` | string | no | `dct:identifier` aggiuntivo (con `dct:conformsTo` ANAC) | `xsd:string` | `9876543210` |
| `denominazione` | string | sì | `rdfs:label` | `@it` | `Riqualificazione Piazza Garibaldi` |
| `categoria` | string | sì | `dct:type` → `skos:Concept` (CV `public-work-categories`) | URI | `VERDE` |
| `programma_triennale` | string | sì | `dct:isPartOf` (riferimento al PT-OOPP) | `xsd:string` | `2024-2026` |
| `importo_qe` | decimal | sì | `:plannedAmount` | `xsd:decimal` (€) | `850000.00` |
| `importo_aggiudicazione` | decimal | no | `:awardedAmount` | `xsd:decimal` (€) | `782300.00` |
| `data_inizio_prevista` | date | sì | `ti:hasIntervalStartDate` (su `ti:TimeInterval` previsto) | `xsd:date` | `2024-03-15` |
| `data_inizio_effettiva` | date | no | `ti:hasIntervalStartDate` (su intervallo effettivo) | `xsd:date` | `2024-04-22` |
| `data_fine_prevista` | date | sì | `ti:hasIntervalEndDate` (su intervallo previsto) | `xsd:date` | `2024-12-31` |
| `data_fine_effettiva` | date | no | `ti:hasIntervalEndDate` (su intervallo effettivo) | `xsd:date` | `2025-02-18` |
| `stato` | string | sì | `adms:status` → `skos:Concept` (CV `public-work-status`) | URI | `IN_CORSO` |
| `sal_percentuale` | int | no | `:workProgressPercentage` | `xsd:integer` (0-100) | `45` |
| `fonte_finanziamento` | string | sì | `:fundingSource` (multipla, `skos:Concept`) | URI multipli | `PNRR\|BILANCIO` |
| `lat` | decimal | no | `geo:lat` | `xsd:decimal` | `40.3528` |
| `lon` | decimal | no | `geo:long` | `xsd:decimal` | `18.1718` |
| `responsabile_unico` | string | no | `:hasRUP` → `cpv:Person` | URI | `Mario Rossi` |

### KPI derivabili

- **Numero opere per stato** (programmate/in corso/concluse)
- **Scostamento tempi medio** = `(data_fine_effettiva - data_fine_prevista)` in giorni
- **Scostamento costi medio** = `(importo_aggiudicazione - importo_qe) / importo_qe × 100`
- **% opere concluse nei tempi** = opere con `data_fine_effettiva ≤ data_fine_prevista`
- **% PNRR sul totale finanziato**
- **SAL medio opere in corso**
- **Mappa opere geolocalizzate**

### Esempio Turtle (Comune di Bologna, codice IPA `c_a944`)

> Esempio derivato dal dataset reale **"Lavori in corso in città"** pubblicato dal Comune di Bologna su dati.gov.it (id `d64e15bc-ba85-453e-af0b-2c2338c08158`). Il CUP è di esempio plausibile.

```turtle
<https://w3id.org/italia/data/c_a944/public-work/J33B22000180001>
    a cpsvap:PublicService, poi:PointOfInterest ;
    dct:identifier "J33B22000180001" ;
    dct:conformsTo <https://www.cipess.gov.it/cup> ;
    rdfs:label "Riqualificazione asse Via Indipendenza"@it ;
    dct:type <https://w3id.org/italia/controlled-vocabulary/comune-metrics/public-work-categories/STRADE> ;
    dct:isPartOf "Programma Triennale OO.PP. 2024-2026"@it ;
    <https://w3id.org/italia/data/comune-metrics/property/plannedAmount> "2400000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/awardedAmount> "2210500.00"^^xsd:decimal ;
    adms:status <https://w3id.org/italia/controlled-vocabulary/comune-metrics/public-work-status/IN_CORSO> ;
    <https://w3id.org/italia/data/comune-metrics/property/workProgressPercentage> "60"^^xsd:integer ;
    <https://w3id.org/italia/data/comune-metrics/property/fundingSource>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/funding-sources/PNRR> ,
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/funding-sources/BILANCIO> ;
    <https://w3id.org/italia/data/comune-metrics/property/plannedTimeInterval>
        <https://w3id.org/italia/data/c_a944/time-interval/J33B22000180001-planned> ;
    <https://w3id.org/italia/data/comune-metrics/property/actualTimeInterval>
        <https://w3id.org/italia/data/c_a944/time-interval/J33B22000180001-actual> ;
    geo:lat "44.4949"^^xsd:decimal ;
    geo:long "11.3426"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/hasRUP>
        <https://w3id.org/italia/data/c_a944/person/rup-anonymized> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=d64e15bc-ba85-453e-af0b-2c2338c08158> .

# Cronoprogramma previsto
<https://w3id.org/italia/data/c_a944/time-interval/J33B22000180001-planned>
    a ti:TimeInterval ;
    ti:hasIntervalStartDate "2024-03-15"^^xsd:date ;
    ti:hasIntervalEndDate "2024-12-31"^^xsd:date ;
    rdfs:label "Cronoprogramma previsto opera J33B22000180001"@it .

# Cronoprogramma effettivo
<https://w3id.org/italia/data/c_a944/time-interval/J33B22000180001-actual>
    a ti:TimeInterval ;
    ti:hasIntervalStartDate "2024-04-22"^^xsd:date ;
    rdfs:label "Cronoprogramma effettivo opera J33B22000180001"@it .

# RUP
<https://w3id.org/italia/data/c_a944/person/rup-anonymized>
    a cpv:Person ;
    rdfs:label "RUP — nominativo non pubblicato per riservatezza"@it .
```

---

## Dataset 4 — Pratiche edilizie

**File:** `pratiche_edilizie.csv`
**Frequenza:** trimestrale
**Tema DCAT-AP_IT:** `GOVE` (Governo e settore pubblico)
**Riferimento:** D.P.R. 380/2001 (Testo Unico Edilizia)
**Ontologie OntoPiA:** **CPSV-AP** (procedimento PA) + **TI** (tempi lavorazione) + **CLV** (zona) + **SKOS** (CV `tipo_pratica`, `esito`, `categoria_intervento`)
**Granularità:** una riga per pratica
**URI tipo risorsa:** `building-procedure`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `id_pratica` | string | sì | `dct:identifier` | `xsd:string` (anonimizzato) | `PE-2024-001245` |
| `tipo_pratica` | string | sì | `dct:type` → `skos:Concept` (CV `building-procedure-types`) | URI | `SCIA` |
| `data_protocollo` | date | sì | `ti:hasIntervalStartDate` su `ti:TimeInterval` lavorazione | `xsd:date` | `2024-02-12` |
| `data_chiusura` | date | no | `ti:hasIntervalEndDate` | `xsd:date` | `2024-03-08` |
| `giorni_lavorazione` | int | no | `:processingDays` | `xsd:nonNegativeInteger` | `25` |
| `esito` | string | sì | `adms:status` → `skos:Concept` (CV `building-procedure-outcomes`) | URI | `APPROVATA` |
| `zona` | string | sì | `clv:hasCity` riferimento `clv:City` (sub-comunale) | URI | `Centro storico` |
| `categoria_intervento` | string | sì | `:interventionCategory` → `skos:Concept` (CV `intervention-categories`) | URI | `RISTRUTTURAZIONE` |
| `superficie_mq` | decimal | no | `:areaSquareMeters` | `xsd:decimal` (m²) | `120.50` |

### KPI derivabili

- **Tempo medio rilascio per tipo** (giorni)
- **% pratiche entro i termini di legge** (PDC ≤90gg, SCIA ≤30gg)
- **Distribuzione per zona** (concentrazione interventi)
- **Tasso di approvazione** = `APPROVATE / (APPROVATE + RIGETTATE) × 100`
- **Volumi mensili/trimestrali** (trend)

### Esempio Turtle (Comune di Bologna, codice IPA `c_a944`)

> Esempio derivato dal dataset reale **"CILA-comunicazioni inizio lavori"** pubblicato dal Comune di Bologna su dati.gov.it (id `046f5414-ef0e-4a07-a55d-21d4e6d7ab7d`).

```turtle
<https://w3id.org/italia/data/c_a944/building-procedure/CILA-2024-005678>
    a cpsvap:PublicService ;
    dct:identifier "CILA-2024-005678" ;
    dct:type <https://w3id.org/italia/controlled-vocabulary/comune-metrics/building-procedure-types/CILA> ;
    rdfs:label "CILA — Comunicazione Inizio Lavori 2024-005678"@it ;
    adms:status <https://w3id.org/italia/controlled-vocabulary/comune-metrics/building-procedure-outcomes/APPROVATA> ;
    <https://w3id.org/italia/data/comune-metrics/property/interventionCategory>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/intervention-categories/MANUTENZIONE_STRAORDINARIA> ;
    <https://w3id.org/italia/data/comune-metrics/property/areaSquareMeters> "85.30"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/processingDays> "12"^^xsd:nonNegativeInteger ;
    clv:hasCity <https://w3id.org/italia/data/c_a944/sub-city/quartiere-savena> ;
    <https://w3id.org/italia/data/comune-metrics/property/processingTimeInterval>
        <https://w3id.org/italia/data/c_a944/time-interval/CILA-2024-005678-processing> ;
    cpsvap:isOwnedBy <https://w3id.org/italia/data/c_a944/public-organization/comune-bologna> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=046f5414-ef0e-4a07-a55d-21d4e6d7ab7d> .

<https://w3id.org/italia/data/c_a944/time-interval/CILA-2024-005678-processing>
    a ti:TimeInterval ;
    ti:hasIntervalStartDate "2024-02-12"^^xsd:date ;
    ti:hasIntervalEndDate "2024-02-24"^^xsd:date .

<https://w3id.org/italia/controlled-vocabulary/comune-metrics/building-procedure-types/CILA>
    a skos:Concept ;
    skos:inScheme <https://w3id.org/italia/controlled-vocabulary/comune-metrics/building-procedure-types> ;
    skos:notation "CILA" ;
    skos:prefLabel "Comunicazione di Inizio Lavori Asseverata"@it .
```

---

## Dataset 5 — Servizi sociali

**File:** `servizi_sociali.csv`
**Frequenza:** annuale
**Tema DCAT-AP_IT:** `SOCI` (Popolazione e società)
**Riferimento:** L. 328/2000 (Legge quadro servizi sociali)
**Ontologie OntoPiA:** **CPSV-AP** (servizio PA erogato) + **QB** (osservazioni utenti/spesa) + **SKOS** (CV `tipologia_servizio`)
**Granularità:** una riga per anno × tipologia servizio
**URI tipo risorsa:** `social-service-observation`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `anno` | int | sì | `qb:dimension` → `:refYear` | `xsd:gYear` | `2024` |
| `tipologia_servizio` | string | sì | `qb:dimension` → `skos:Concept` (CV `social-service-types`) — coincide con un `cpsvap:PublicService` riferito | URI | `ANZIANI_DOMICILIARE` |
| `utenti_serviti` | int | sì | `qb:measure` → `:usersServed` | `xsd:nonNegativeInteger` | `87` |
| `domande_pervenute` | int | sì | `qb:measure` → `:applicationsReceived` | `xsd:nonNegativeInteger` | `132` |
| `domande_accolte` | int | sì | `qb:measure` → `:applicationsAccepted` | `xsd:nonNegativeInteger` | `87` |
| `lista_attesa` | int | no | `qb:measure` → `:waitingList` | `xsd:nonNegativeInteger` | `12` |
| `spesa_totale` | decimal | sì | `qb:measure` → `:totalExpenditure` | `xsd:decimal` (€) | `285000.00` |
| `compartecipazione_utenti` | decimal | no | `qb:measure` → `:userCoPayment` | `xsd:decimal` (€) | `35000.00` |
| `popolazione_target` | int | no | `qb:attribute` → `:targetPopulation` | `xsd:nonNegativeInteger` | `8500` |

### KPI derivabili

- **Tasso di copertura** = `utenti_serviti / popolazione_target × 100`
- **% domande accolte** = `domande_accolte / domande_pervenute × 100`
- **Spesa media per utente** = `spesa_totale / utenti_serviti`
- **Tasso compartecipazione** = `compartecipazione_utenti / spesa_totale × 100`
- **Trend pluriennale per tipologia**

### Esempio Turtle (Comune di Lecce, codice IPA `c_e506`)

> Esempio derivato dal dataset reale **"Numero pratiche evase dal Settore Servizi Sociali del Comune di Lecce"** pubblicato dal Comune di Lecce su dati.gov.it (id `cef61e18-18bc-496f-951e-2b949b7ccad4`).

```turtle
# Servizio PA erogato (CPSV-AP)
<https://w3id.org/italia/data/c_e506/public-service/anziani-domiciliare>
    a cpsvap:PublicService ;
    dct:identifier "ANZIANI_DOMICILIARE" ;
    rdfs:label "Servizio Assistenza Domiciliare Anziani"@it ;
    cpsvap:isOwnedBy <https://w3id.org/italia/data/c_e506/public-organization/comune-lecce> ;
    cpsvap:isClassifiedBy
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/social-service-types/ANZIANI_DOMICILIARE> .

# Osservazione QB sull'erogazione 2024
<https://w3id.org/italia/data/c_e506/social-service-observation/2024-ANZIANI_DOMICILIARE>
    a qb:Observation ;
    qb:dataSet <https://w3id.org/italia/data/c_e506/social-service-dataset/2024> ;
    <https://w3id.org/italia/data/comune-metrics/property/refYear> "2024"^^xsd:gYear ;
    <https://w3id.org/italia/data/comune-metrics/property/refService>
        <https://w3id.org/italia/data/c_e506/public-service/anziani-domiciliare> ;
    <https://w3id.org/italia/data/comune-metrics/property/usersServed> "87"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/applicationsReceived> "132"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/applicationsAccepted> "87"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/waitingList> "12"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/totalExpenditure> "285000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/userCoPayment> "35000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/targetPopulation> "8500"^^xsd:nonNegativeInteger ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=cef61e18-18bc-496f-951e-2b949b7ccad4> .
```

---

## Dataset 6 — Istruzione & asili

**File:** `istruzione.csv`
**Frequenza:** annuale (per anno scolastico)
**Tema DCAT-AP_IT:** `EDUC` (Istruzione, cultura e sport)
**Ontologie OntoPiA:** **Cultural-ON** (istituti formativi come istituzioni culturali) + **POI** + **CLV** (indirizzo plesso) + **TI** (anno scolastico)
**Granularità:** una riga per anno scolastico × tipo struttura × plesso
**URI tipo risorsa:** `school-facility`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `anno_scolastico` | string | sì | `:refSchoolYear` (anche `ti:TimeInterval`) | `xsd:string` (`YYYY/YYYY`) | `2024/2025` |
| `tipo_struttura` | string | sì | `dct:type` → `skos:Concept` (CV `school-types`) | URI | `ASILO_NIDO` |
| `plesso_nome` | string | sì | `rdfs:label` / `culturalon:institutionalCISName` | `@it` | `Asilo Il Girasole` |
| `plesso_indirizzo` | string | sì | `clv:hasAddress` → `clv:Address` | URI struttura | `Via Roma 12` |
| `posti_disponibili` | int | sì | `:availableSeats` | `xsd:nonNegativeInteger` | `60` |
| `iscritti` | int | sì | `:enrolled` | `xsd:nonNegativeInteger` | `58` |
| `domande_ricevute` | int | no | `:applicationsReceived` | `xsd:nonNegativeInteger` | `89` |
| `lista_attesa` | int | no | `:waitingList` | `xsd:nonNegativeInteger` | `28` |
| `mensa_attiva` | bool | no | `:hasCanteenService` | `xsd:boolean` | `true` |
| `pasti_erogati_anno` | int | no | `:mealsProvidedInYear` | `xsd:nonNegativeInteger` | `9800` |
| `trasporto_attivo` | bool | no | `:hasTransportService` | `xsd:boolean` | `true` |
| `utenti_trasporto` | int | no | `:transportUsers` | `xsd:nonNegativeInteger` | `45` |
| `lat` | decimal | no | `geo:lat` | `xsd:decimal` | `40.3528` |
| `lon` | decimal | no | `geo:long` | `xsd:decimal` | `18.1718` |

### KPI derivabili

- **Tasso copertura asili nido** = `posti_disponibili / popolazione_0-2 × 100` (target EU: 33%)
- **Tasso saturazione asili** = `iscritti / posti_disponibili × 100`
- **Domanda inevasa** = `lista_attesa / domande_ricevute × 100`
- **Mappa plessi scolastici** geolocalizzati
- **Pasti medi per utente mensa**

### Esempio Turtle (Comune di Lecce, codice IPA `c_e506`)

> Esempio derivato dal dataset reale **"Elenco e ubicazione asili nido comunali Lecce"** pubblicato dal Comune di Lecce su dati.gov.it (id `3d12df6d-b8f1-4f8f-9b21-ada0274da3c8`). L'asilo "Il Piccolo Principe" è un asilo nido comunale realmente esistente a Lecce.

```turtle
<https://w3id.org/italia/data/c_e506/school-facility/il-piccolo-principe-2024-2025>
    a culturalon:CulturalInstituteOrSite, poi:PointOfInterest ;
    dct:identifier "il-piccolo-principe" ;
    rdfs:label "Asilo Nido Il Piccolo Principe — A.S. 2024/2025"@it ;
    dct:type <https://w3id.org/italia/controlled-vocabulary/comune-metrics/school-types/ASILO_NIDO> ;
    <https://w3id.org/italia/data/comune-metrics/property/refSchoolYear> "2024/2025" ;
    <https://w3id.org/italia/data/comune-metrics/property/availableSeats> "60"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/enrolled> "58"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/applicationsReceived> "89"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/waitingList> "28"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/hasCanteenService> "true"^^xsd:boolean ;
    <https://w3id.org/italia/data/comune-metrics/property/mealsProvidedInYear> "9800"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/hasTransportService> "true"^^xsd:boolean ;
    <https://w3id.org/italia/data/comune-metrics/property/transportUsers> "45"^^xsd:nonNegativeInteger ;
    clv:hasAddress <https://w3id.org/italia/data/c_e506/address/il-piccolo-principe> ;
    geo:lat "40.3528"^^xsd:decimal ;
    geo:long "18.1718"^^xsd:decimal ;
    culturalon:isOwnedBy <https://w3id.org/italia/data/c_e506/public-organization/comune-lecce> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=3d12df6d-b8f1-4f8f-9b21-ada0274da3c8> .

<https://w3id.org/italia/data/c_e506/address/il-piccolo-principe>
    a clv:Address ;
    clv:fullAddress "Lecce LE — vedi dataset reale per indirizzo esatto"@it ;
    clv:postCode "73100" ;
    clv:hasCity <https://w3id.org/italia/data/c_e506/city/lecce> .
```

---

## Dataset 7 — Incidenti stradali

**File:** `incidenti_stradali.csv`
**Frequenza:** mensile
**Tema DCAT-AP_IT:** `TRAN` (Trasporti)
**Riferimento:** ISTAT, modulo CTT/INC, Direttiva (UE) 2019/1936 (gestione sicurezza infrastrutture)
**Ontologie OntoPiA:** **QB** (Cubo statistico data × via × natura) + **CLV** (via/civico) + **TI** (timestamp) + **SKOS** (CV `natura`,`tipo_strada`,`condizioni_meteo`)
**Standard W3C complementari:** WGS84 (`geo:lat`/`geo:long`)
**Granularità:** una riga per incidente
**URI tipo risorsa:** `road-accident`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `id_incidente` | string | sì | `dct:identifier` | `xsd:string` (anonimizzato) | `INC-2024-04-0123` |
| `data` | date | sì | `:accidentDate` | `xsd:date` | `2024-04-15` |
| `ora` | string | sì | `:accidentTime` | `xsd:time` | `18:35` |
| `lat` | decimal | sì | `geo:lat` | `xsd:decimal` | `40.3528` |
| `lon` | decimal | sì | `geo:long` | `xsd:decimal` | `18.1718` |
| `via` | string | sì | `clv:hasAddress` → `clv:Address.clv:hasStreetToponym` | URI struttura | `Via Roma` |
| `civico` | string | no | `clv:hasNumber` (su `clv:Address`) | `xsd:string` | `42` |
| `tipo_strada` | string | sì | `:roadType` → `skos:Concept` (CV `road-types`) | URI | `URBANA_PRINCIPALE` |
| `natura` | string | sì | `:accidentNature` → `skos:Concept` (CV `accident-natures`) | URI | `INVESTIMENTO_PEDONE` |
| `veicoli_coinvolti` | int | sì | `:vehiclesInvolved` | `xsd:nonNegativeInteger` | `2` |
| `feriti` | int | sì | `:injured` | `xsd:nonNegativeInteger` | `1` |
| `feriti_gravi` | int | no | `:seriouslyInjured` | `xsd:nonNegativeInteger` | `0` |
| `deceduti` | int | sì | `:deceased` | `xsd:nonNegativeInteger` | `0` |
| `coinvolti_pedoni` | int | no | `:pedestriansInvolved` | `xsd:nonNegativeInteger` | `1` |
| `coinvolti_ciclisti` | int | no | `:cyclistsInvolved` | `xsd:nonNegativeInteger` | `0` |
| `condizioni_meteo` | string | no | `:weatherConditions` → `skos:Concept` (CV `weather-conditions`) | URI | `SERENO` |

### KPI derivabili

- **Indice di mortalità** = `deceduti / incidenti × 100`
- **Indice di lesività** = `feriti / incidenti × 100`
- **Hot spot mappa di calore** (cluster geografici via coordinate `geo:lat`/`geo:long`)
- **Trend stagionale/orario**
- **% incidenti coinvolgenti utenti vulnerabili** (pedoni + ciclisti)
- **Variazione anno su anno** (target EU: -50% vittime al 2030)

### Esempio Turtle (Comune di Firenze, codice IPA `c_d612`)

> Esempio derivato dal dataset reale **"Numero incidenti stradali per Quartiere"** pubblicato dal Comune di Firenze su dati.gov.it (id `b78af8c5-af19-42ea-81e6-196b2df59ca0`). Il singolo evento è di esempio plausibile (Firenze ha quartieri Q1-Q5; Q1 è il Centro Storico).

```turtle
<https://w3id.org/italia/data/c_d612/road-accident/INC-2024-04-0123>
    a <https://w3id.org/italia/data/comune-metrics/class/RoadAccident> ;
    dct:identifier "INC-2024-04-0123" ;
    rdfs:label "Incidente stradale Via dei Calzaiuoli — 15/04/2024 18:35"@it ;
    <https://w3id.org/italia/data/comune-metrics/property/accidentDate> "2024-04-15"^^xsd:date ;
    <https://w3id.org/italia/data/comune-metrics/property/accidentTime> "18:35:00"^^xsd:time ;
    <https://w3id.org/italia/data/comune-metrics/property/roadType>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/road-types/URBANA_PRINCIPALE> ;
    <https://w3id.org/italia/data/comune-metrics/property/accidentNature>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/accident-natures/INVESTIMENTO_PEDONE> ;
    <https://w3id.org/italia/data/comune-metrics/property/weatherConditions>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/weather-conditions/SERENO> ;
    <https://w3id.org/italia/data/comune-metrics/property/vehiclesInvolved> "2"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/injured> "1"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/seriouslyInjured> "0"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/deceased> "0"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/pedestriansInvolved> "1"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/cyclistsInvolved> "0"^^xsd:nonNegativeInteger ;
    clv:hasAddress <https://w3id.org/italia/data/c_d612/address/inc-2024-04-0123> ;
    geo:lat "43.7711"^^xsd:decimal ;
    geo:long "11.2552"^^xsd:decimal ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=b78af8c5-af19-42ea-81e6-196b2df59ca0> .

<https://w3id.org/italia/data/c_d612/address/inc-2024-04-0123>
    a clv:Address ;
    clv:hasStreetToponym <https://w3id.org/italia/data/c_d612/street-toponym/via-dei-calzaiuoli> ;
    clv:hasNumber "42" ;
    clv:hasCity <https://w3id.org/italia/data/c_d612/city/firenze> .
```

---

## Dataset 8 — Raccolta rifiuti

**File:** `rifiuti.csv`
**Frequenza:** mensile
**Tema DCAT-AP_IT:** `ENVI` (Ambiente)
**Riferimento:** ISPRA-Catasto Rifiuti, MUD, D.Lgs. 152/2006
**Ontologie OntoPiA:** **QB** (Cubo statistico anno × mese × frazione × area) + **SKOS** (CV 15 frazioni come `skos:ConceptScheme`) + **CLV** (`area_sub_comunale`)
**Granularità:** una riga per anno × mese × frazione × area
**URI tipo risorsa:** `waste-observation`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `anno` | int | sì | `qb:dimension` → `:refYear` | `xsd:gYear` | `2024` |
| `mese` | int | sì | `qb:dimension` → `:refMonth` | `xsd:gMonth` | `4` |
| `area_sub_comunale` | string | sì | `qb:dimension` → `clv:hasCity` (riferimento `clv:City` o `TOTALE_COMUNE`) | URI | `TOTALE_COMUNE` |
| `frazione` | string | sì | `qb:dimension` → `skos:Concept` (CV `waste-fractions`) | URI | `ORGANICO` |
| `quantita_kg` | decimal | sì | `qb:measure` → `:wasteQuantityKg` | `xsd:decimal` (kg) | `45230.50` |
| `costo_totale` | decimal | no | `qb:measure` → `:totalCost` | `xsd:decimal` (€) | `12500.00` |
| `popolazione_servita` | int | sì | `qb:attribute` → `:servedPopulation` | `xsd:nonNegativeInteger` | `45230` |

### KPI derivabili

- **% raccolta differenziata** = `(totale - INDIFFERENZIATO) / totale × 100` (target normativo: 65%)
- **Produzione pro capite** (kg/ab/anno) = `Σ quantita_kg / popolazione_servita`
- **Trend stagionale per frazione**
- **Confronto per area sub-comunale** (mappa coropletica)
- **Costo medio per kg trattato** = `costo_totale / quantita_kg`

### Esempio Turtle (Comune di Bologna, codice IPA `c_a944`)

> Esempio derivato dal dataset reale **"Indicatori Raccolta Differenziata"** pubblicato dal Comune di Bologna su dati.gov.it (id `3321dad8-2d58-48bc-9b37-d21efc87d623`). Il dataset Bologna riporta la % differenziata per quartiere (Centro, Borgo Panigale, ecc.); l'esempio mostra una osservazione di volume per la frazione organico.

```turtle
<https://w3id.org/italia/data/c_a944/waste-dataset/2024>
    a qb:DataSet, dcatapit:Dataset ;
    rdfs:label "Raccolta rifiuti Comune di Bologna 2024"@it ;
    dct:publisher <https://w3id.org/italia/data/c_a944/public-organization/comune-bologna> ;
    qb:structure <https://w3id.org/italia/data/comune-metrics/dsd/waste> ;
    dct:license <https://creativecommons.org/licenses/by/4.0/> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=3321dad8-2d58-48bc-9b37-d21efc87d623> .

<https://w3id.org/italia/data/c_a944/waste-observation/2024-04-TOTALE_COMUNE-ORGANICO>
    a qb:Observation ;
    qb:dataSet <https://w3id.org/italia/data/c_a944/waste-dataset/2024> ;
    <https://w3id.org/italia/data/comune-metrics/property/refYear> "2024"^^xsd:gYear ;
    <https://w3id.org/italia/data/comune-metrics/property/refMonth> "--04"^^xsd:gMonth ;
    <https://w3id.org/italia/data/comune-metrics/property/refArea>
        <https://w3id.org/italia/data/c_a944/sub-city/totale-comune> ;
    <https://w3id.org/italia/data/comune-metrics/property/wasteFraction>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/waste-fractions/ORGANICO> ;
    <https://w3id.org/italia/data/comune-metrics/property/wasteQuantityKg> "2150000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/totalCost> "320000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/servedPopulation> "390636"^^xsd:nonNegativeInteger .

# Frazione come SKOS Concept (in vocabolario controllato)
<https://w3id.org/italia/controlled-vocabulary/comune-metrics/waste-fractions/ORGANICO>
    a skos:Concept ;
    skos:inScheme <https://w3id.org/italia/controlled-vocabulary/comune-metrics/waste-fractions> ;
    skos:notation "ORGANICO" ;
    skos:prefLabel "Frazione organica (umido)"@it ;
    skos:altLabel "FORSU"@it ;
    skos:exactMatch <http://eurovoc.europa.eu/c_b9b8e8a9> .  # esempio link EuroVoc
```

---

## Dataset 9 — Eventi culturali e sportivi

**File:** `eventi_culturali.csv`
**Frequenza:** trimestrale
**Tema DCAT-AP_IT:** `EDUC` (Istruzione, cultura e sport)
**Ontologie OntoPiA:** **Cultural-ON** (eventi culturali, classe `culturalon:Event` o estensione) + **POI** (luogo) + **CLV** (indirizzo) + **TI** (intervallo data_inizio→data_fine) + **COV** (organizzatore se ente)
**Granularità:** una riga per evento
**URI tipo risorsa:** `cultural-event`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `id_evento` | string | sì | `dct:identifier` | `xsd:string` | `EV-2024-0234` |
| `denominazione` | string | sì | `rdfs:label` | `@it` | `Festival del Teatro di Strada` |
| `categoria` | string | sì | `dct:type` → `skos:Concept` (CV `event-categories`) | URI | `TEATRO` |
| `data_inizio` | date | sì | `ti:hasIntervalStartDate` (su `ti:TimeInterval` evento) | `xsd:date` | `2024-07-15` |
| `data_fine` | date | sì | `ti:hasIntervalEndDate` (su `ti:TimeInterval` evento) | `xsd:date` | `2024-07-18` |
| `luogo_nome` | string | sì | `:hasVenue` → `poi:PointOfInterest` (`rdfs:label`) | URI | `Piazza Sant Oronzo` |
| `lat` | decimal | no | `geo:lat` (sul venue) | `xsd:decimal` | `40.3528` |
| `lon` | decimal | no | `geo:long` (sul venue) | `xsd:decimal` | `18.1718` |
| `tipo_organizzazione` | string | sì | `:organizationRole` → `skos:Concept` (CV `event-organization-roles`) | URI | `PATROCINATO` |
| `contributo_comunale` | decimal | no | `:municipalContribution` | `xsd:decimal` (€) | `5000.00` |
| `partecipanti_stimati` | int | no | `:estimatedAttendees` | `xsd:nonNegativeInteger` | `2500` |
| `gratuito` | bool | sì | `:isFreeAdmission` | `xsd:boolean` | `true` |

### KPI derivabili

- **Numero eventi per categoria/anno**
- **Distribuzione mensile** (stagionalità offerta)
- **Spesa media per evento patrocinato** = `Σ contributo_comunale / N eventi PATROCINATO`
- **Mappa luoghi degli eventi** (concentrazione spaziale)
- **% eventi gratuiti**
- **Confronto eventi organizzati vs patrocinati**

### Esempio Turtle (Comune di Lecce, codice IPA `c_e506`)

> Esempio derivato dal dataset reale **"Eventi culturali ricorrenti"** pubblicato dal Comune di Lecce su dati.gov.it (id `44f1e470-0432-4a38-b865-86627aa656a7`).

```turtle
<https://w3id.org/italia/data/c_e506/cultural-event/EV-2024-0234>
    a culturalon:Event ;
    dct:identifier "EV-2024-0234" ;
    rdfs:label "Festival del Teatro di Strada"@it ;
    dct:type <https://w3id.org/italia/controlled-vocabulary/comune-metrics/event-categories/TEATRO> ;
    <https://w3id.org/italia/data/comune-metrics/property/organizationRole>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/event-organization-roles/PATROCINATO> ;
    <https://w3id.org/italia/data/comune-metrics/property/municipalContribution> "5000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/estimatedAttendees> "2500"^^xsd:nonNegativeInteger ;
    <https://w3id.org/italia/data/comune-metrics/property/isFreeAdmission> "true"^^xsd:boolean ;
    <https://w3id.org/italia/data/comune-metrics/property/eventTimeInterval>
        <https://w3id.org/italia/data/c_e506/time-interval/EV-2024-0234> ;
    <https://w3id.org/italia/data/comune-metrics/property/hasVenue>
        <https://w3id.org/italia/data/c_e506/point-of-interest/piazza-sant-oronzo> ;
    culturalon:isOwnedBy <https://w3id.org/italia/data/c_e506/public-organization/comune-lecce> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=44f1e470-0432-4a38-b865-86627aa656a7> .

<https://w3id.org/italia/data/c_e506/time-interval/EV-2024-0234>
    a ti:TimeInterval ;
    ti:hasIntervalStartDate "2024-07-15"^^xsd:date ;
    ti:hasIntervalEndDate "2024-07-18"^^xsd:date .

<https://w3id.org/italia/data/c_e506/point-of-interest/piazza-sant-oronzo>
    a poi:PointOfInterest ;
    rdfs:label "Piazza Sant'Oronzo"@it ;
    geo:lat "40.3528"^^xsd:decimal ;
    geo:long "18.1718"^^xsd:decimal .
```

---

## Dataset 10 — Delibere e atti

**File:** `delibere.csv`
**Frequenza:** mensile
**Tema DCAT-AP_IT:** `GOVE` (Governo e settore pubblico)
**Riferimento:** D.Lgs. 33/2013 (Trasparenza), TUEL D.Lgs. 267/2000
**Ontologie OntoPiA:** **CPSV-AP** (atti come procedimenti) + **TI** (data adozione/pubblicazione/esecutività) + **COV** (settore proponente) + **RO** (ruoli politici) + **ADMS** (atti come asset semantici versionati)
**Granularità:** una riga per atto
**URI tipo risorsa:** `administrative-act`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `numero` | string | sì | `dct:identifier` (combinato con anno+tipo) | `xsd:string` | `145` |
| `tipo` | string | sì | `dct:type` → `skos:Concept` (CV `act-types`) | URI | `DELIBERA_GIUNTA` |
| `data_adozione` | date | sì | `:adoptionDate` | `xsd:date` | `2024-04-15` |
| `data_pubblicazione` | date | sì | `dct:issued` | `xsd:date` | `2024-04-17` |
| `data_esecutivita` | date | no | `:effectiveDate` | `xsd:date` | `2024-04-27` |
| `oggetto` | string | sì | `dct:description` / `dct:title` | `@it` | `Approvazione progetto preliminare ...` |
| `settore` | string | sì | `:proposingDepartment` → `cov:OrganizationalUnit` | URI | `LL.PP.` |
| `proponente` | string | no | `:proposer` → `cpv:Person` o `ro:Role` | URI | `Ass. Mobilita` |
| `esito` | string | sì | `adms:status` → `skos:Concept` (CV `act-outcomes`) | URI | `APPROVATA` |
| `voti_favorevoli` | int | no | `:favorableVotes` | `xsd:nonNegativeInteger` | `15` |
| `voti_contrari` | int | no | `:contraryVotes` | `xsd:nonNegativeInteger` | `4` |
| `astenuti` | int | no | `:abstainedVotes` | `xsd:nonNegativeInteger` | `2` |
| `url_atto` | string | sì | `foaf:page` / `dcat:landingPage` | `xsd:anyURI` | `https://...` |

### KPI derivabili

- **Tempo medio pubblicazione** = `data_pubblicazione - data_adozione` (target normativo: ≤15 gg)
- **% atti pubblicati nei termini**
- **Volume atti per tipo** (mensile/trimestrale)
- **Atti per settore** (intensità lavoro per assessorato)
- **Tasso di approvazione consigliare** (su delibere CC)
- **Compattezza politica** = % delibere CC con voto unanime vs spaccato

### Esempio Turtle (Comune di Firenze, codice IPA `c_d612`)

> Esempio derivato dal dataset reale **"Delibere - Anno 2023"** del Consiglio Comunale di Firenze pubblicato su dati.gov.it (id `c5ccc140-8af8-4174-899e-a227c261422f`). I valori del singolo atto sono di esempio plausibile.

```turtle
<https://w3id.org/italia/data/c_d612/administrative-act/2023-145-DELIBERA_GIUNTA>
    a cpsvap:PublicService, adms:Asset ;
    dct:identifier "DG-2023-145" ;
    dct:type <https://w3id.org/italia/controlled-vocabulary/comune-metrics/act-types/DELIBERA_GIUNTA> ;
    dct:title "Approvazione progetto preliminare riqualificazione area mercatale Sant'Ambrogio"@it ;
    dct:description "Approvazione progetto preliminare riqualificazione area mercatale Sant'Ambrogio"@it ;
    <https://w3id.org/italia/data/comune-metrics/property/adoptionDate> "2023-04-15"^^xsd:date ;
    dct:issued "2023-04-17"^^xsd:date ;
    <https://w3id.org/italia/data/comune-metrics/property/effectiveDate> "2023-04-27"^^xsd:date ;
    adms:status <https://w3id.org/italia/controlled-vocabulary/comune-metrics/act-outcomes/APPROVATA> ;
    <https://w3id.org/italia/data/comune-metrics/property/proposingDepartment>
        <https://w3id.org/italia/data/c_d612/organizational-unit/lavori-pubblici> ;
    <https://w3id.org/italia/data/comune-metrics/property/proposer>
        <https://w3id.org/italia/data/c_d612/role/assessore-mobilita> ;
    foaf:page <https://www.comune.fi.it/albo-pretorio/atto/DG-2023-145.pdf> ;
    cpsvap:isOwnedBy <https://w3id.org/italia/data/c_d612/public-organization/comune-firenze> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=c5ccc140-8af8-4174-899e-a227c261422f> .

# Settore proponente (cov:OrganizationalUnit)
<https://w3id.org/italia/data/c_d612/organizational-unit/lavori-pubblici>
    a cov:OrganizationalUnit ;
    rdfs:label "Direzione Servizi Tecnici"@it ;
    cov:classification "LL.PP." ;
    cov:isOrganizationalUnitOf <https://w3id.org/italia/data/c_d612/public-organization/comune-firenze> .

# Ruolo politico proponente (RO)
<https://w3id.org/italia/data/c_d612/role/assessore-mobilita>
    a ro:Role ;
    rdfs:label "Assessore alla Mobilità e Lavori Pubblici"@it .
```

---

## Dataset 11 — Patrimonio immobiliare

**File:** `patrimonio.csv`
**Frequenza:** annuale (al 31/12)
**Tema DCAT-AP_IT:** `GOVE` (Governo e settore pubblico)
**Riferimento:** Conto del patrimonio (allegato al rendiconto), D.Lgs. 42/2004 (vincolo culturale)
**Ontologie OntoPiA:** **POI** (classe principale `poi:PointOfInterest`) + **CLV** (`clv:Address`) + **SKOS** (CV `categoria`,`stato_uso`,`efficienza_energetica`)
**Standard W3C complementari:** WGS84 (`geo:lat`/`geo:long`)
**Granularità:** una riga per immobile
**URI tipo risorsa:** `point-of-interest`

### Schema CSV con mapping RDF

| Colonna | Tipo | Obbl. | Proprietà RDF | Tipo XSD/Note | Esempio |
|---|---|---|---|---|---|
| `id_immobile` | string | sì | `dct:identifier` | `xsd:string` | `IMM-LE-001245` |
| `denominazione` | string | sì | `rdfs:label` | `@it` | `Palazzo Carafa - Sede Comunale` |
| `categoria` | string | sì | `poi:category` → `skos:Concept` (CV `property-categories`) | URI | `EDIFICIO_AMMINISTRATIVO` |
| `indirizzo` | string | sì | `clv:hasAddress` → `clv:Address` | URI struttura | `Via Vittorio Emanuele II, 1` |
| `lat` | decimal | no | `geo:lat` | `xsd:decimal` | `40.3528` |
| `lon` | decimal | no | `geo:long` | `xsd:decimal` | `18.1718` |
| `superficie_mq` | decimal | no | `:areaSquareMeters` | `xsd:decimal` (m²) | `2450.00` |
| `volume_mc` | decimal | no | `:volumeCubicMeters` | `xsd:decimal` (m³) | `8800.00` |
| `valore_catastale` | decimal | no | `:cadastralValue` | `xsd:decimal` (€) | `4500000.00` |
| `valore_bilancio` | decimal | sì | `:bookValue` | `xsd:decimal` (€) | `5200000.00` |
| `stato_uso` | string | sì | `adms:status` → `skos:Concept` (CV `property-use-status`) | URI | `IN_USO` |
| `destinazione_uso` | string | no | `:effectiveUse` | `@it` | `Sede Sindaco e Assessori` |
| `vincolo_culturale` | bool | no | `:hasCulturalConstraint` | `xsd:boolean` | `true` |
| `redditivita_annua` | decimal | no | `:annualIncome` | `xsd:decimal` (€) | `0.00` |
| `anno_costruzione` | int | no | `:constructionYear` | `xsd:gYear` | `1572` |
| `efficienza_energetica` | string | no | `:energyClass` → `skos:Concept` (CV `energy-classes`) | URI | `D` |

### KPI derivabili

- **Valore totale patrimonio** (€) = `Σ valore_bilancio`
- **% immobili inutilizzati** (proxy di valorizzazione)
- **Composizione per categoria**
- **Mappa patrimonio** geolocalizzato
- **Redditività complessiva** = `Σ redditivita_annua / Σ valore_bilancio × 100`
- **% immobili sottoposti a vincolo culturale**
- **Distribuzione classi energetiche**

### Esempio Turtle (Comune di Milano, codice IPA `c_f205`)

> Esempio derivato dal dataset reale **"Elenco immobili di proprietà del Comune di Milano"** pubblicato dal Comune di Milano su dati.gov.it (id `8c32b60e-a7e4-4fd0-a76a-50abf191a6d5`). Palazzo Marino in Piazza della Scala è la sede storica del Comune di Milano.

```turtle
<https://w3id.org/italia/data/c_f205/point-of-interest/IMM-MI-001>
    a poi:PointOfInterest ;
    dct:identifier "IMM-MI-001" ;
    rdfs:label "Palazzo Marino - Sede del Comune di Milano"@it ;
    poi:category <https://w3id.org/italia/controlled-vocabulary/comune-metrics/property-categories/EDIFICIO_AMMINISTRATIVO> ;
    adms:status <https://w3id.org/italia/controlled-vocabulary/comune-metrics/property-use-status/IN_USO> ;
    <https://w3id.org/italia/data/comune-metrics/property/effectiveUse> "Sede Sindaco, Giunta e Consiglio Comunale"@it ;
    <https://w3id.org/italia/data/comune-metrics/property/hasCulturalConstraint> "true"^^xsd:boolean ;
    <https://w3id.org/italia/data/comune-metrics/property/areaSquareMeters> "12500.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/volumeCubicMeters> "62000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/cadastralValue> "85000000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/bookValue> "120000000.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/annualIncome> "0.00"^^xsd:decimal ;
    <https://w3id.org/italia/data/comune-metrics/property/constructionYear> "1558"^^xsd:gYear ;
    <https://w3id.org/italia/data/comune-metrics/property/energyClass>
        <https://w3id.org/italia/controlled-vocabulary/comune-metrics/energy-classes/E> ;
    clv:hasAddress <https://w3id.org/italia/data/c_f205/address/imm-mi-001> ;
    geo:lat "45.4669"^^xsd:decimal ;
    geo:long "9.1900"^^xsd:decimal ;
    poi:isOwnedBy <https://w3id.org/italia/data/c_f205/public-organization/comune-milano> ;
    dct:source <https://www.dati.gov.it/view-dataset/dataset?id=8c32b60e-a7e4-4fd0-a76a-50abf191a6d5> .

<https://w3id.org/italia/data/c_f205/address/imm-mi-001>
    a clv:Address ;
    clv:fullAddress "Piazza della Scala 2, 20121 Milano MI"@it ;
    clv:hasNumber "2" ;
    clv:postCode "20121" .
```

---

## Validazione automatica

Ogni dataset è validato a **due livelli**:

### Livello 1 — Validazione CSV (JSON Schema)

Il validatore CLI `comune-metrics-validate` (in `/scripts/`) controlla contro `/schemas/<nome_dataset>.schema.json`:

1. **Conformità schema** — colonne obbligatorie presenti, tipi corretti
2. **Valori controllati** — enum dei campi categoriali (es. `frazione`, `tipo_pratica`)
3. **Coerenza referenziale** — chiavi composte uniche dove richiesto
4. **Range temporali** — date plausibili (no anni futuri impossibili, no date inverse)
5. **Coordinate** — `lat` in [-90,90], `lon` in [-180,180], dentro bounding box italiano

### Livello 2 — Validazione TTL (OntoPiA)

Il validatore `comune-metrics-rdf-validate` controlla:

1. **Sintassi Turtle valida** (parsing con `rdflib`)
2. **Whitelist classi/proprietà OntoPiA** (verifiche contro mappa locale `ONTO_CLASSES` + SPARQL ASK su `https://schema.gov.it/sparql`)
3. **Pattern URI canonico** (`https://w3id.org/italia/data/{ipa}/{tipo-risorsa}/{id}`)
4. **Vocabolari controllati SKOS** — i concetti referenziati esistono nel `skos:ConceptScheme` dichiarato
5. **Conformità DCAT-AP_IT 2.1** del Dataset wrapper

## Integrazione con dati.gov.it

Il paniere è progettato per essere harvestato da **dati.gov.it** via DCAT-AP_IT. I dataset CKAN del Comune devono includere nel campo `extras`:

| Extra | Valore | Funzione |
|---|---|---|
| `paniere_comunemetrics` | `true` | Marker di adozione |
| `paniere_dataset_id` | `popolazione` \| `bilancio` \| ... | Identifica quale dei 11 |
| `paniere_versione_schema` | `2.0` | Versione paniere |

Inoltre ogni dataset deve avere **due distribuzioni**:

- una `dcat:Distribution` con `dct:format = text/csv`
- una `dcat:Distribution` con `dct:format = text/turtle` (per il TTL OntoPiA generato con `github.com/piersoft/CSV-to-RDF`)

Questo permette al loader della dashboard di:

1. trovare automaticamente i dataset conformi (`extras_paniere_comunemetrics:true`)
2. scaricare il CSV per i KPI numerici (rendering veloce)
3. interrogare il TTL via SPARQL per query semantiche cross-Comune (federazione)

## Estensioni future (paniere ESTESO, non obbligatorio)

Dataset utili ma non richiesti per il badge VERDE:

- Tempi di pagamento fornitori (ITP) — già obbligo MEF
- Accesso civico generalizzato (FOIA) — D.Lgs. 33/2013
- Personale comunale (organico, assenteismo)
- Polizia Locale — sanzioni per tipologia (CPSV-AP + SKOS)
- Trasporto pubblico locale — corse, fermate, copertura (**GTFS**)
- Aria — rilevazioni centraline (PM10, NO2, O3) (**QB** + SOSA/SSN)
- Strutture ricettive turistiche (**ACCO**)
- Parcheggi (**PARK**)
- Sportelli/servizi al cittadino con orari (**POI** + **TI** + **SM**)

---

## Riferimenti

- **OntoPiA / schema.gov.it**: <https://schema.gov.it> · <https://github.com/italia/dati-semantic-assets>
- **DCAT-AP_IT 2.1**: <https://docs.italia.it/AgID/documenti-in-consultazione/lg-cataloghi-opendata-docs/it/bozza/profilo-DCAT-AP_IT.html>
- **Strumento CSV → TTL**: <https://github.com/piersoft/CSV-to-RDF> · demo <https://piersoft.github.io/CSV-to-RDF>
- **Vocabolari controllati ufficiali**: <https://github.com/italia/daf-ontologie-vocabolari-controllati>
- **dati.gov.it**: <https://www.dati.gov.it>
- **MQA data.europa.eu**: <https://data.europa.eu/mqa>
- **Codici IPA**: <https://indicepa.gov.it>

---

## Cronistoria versione

- **v2.1** (Maggio 2026) — Esempi Turtle ancorati a dataset reali multi-Comune (Bologna, Milano, Firenze, Lecce). Ogni esempio cita la `dct:source` del dataset di riferimento harvestato da dati.gov.it. Aggiunto riquadro di derivazione esempi nella sezione Filosofia.
- **v2.0.1** (Maggio 2026) — Patch: rimossa GeoSPARQL (non OntoPiA, standard OGC esterno). Le geometrie usano solo W3C WGS84 (`geo:lat`/`geo:long`) coerentemente con il README di `github.com/piersoft/CSV-to-RDF`
- **v2.0** (Maggio 2026) — Mapping OntoPiA completo, esempi Turtle per ogni dataset, badge ORO 5★ LOD
- **v1.0** (Maggio 2026) — Prima release: 11 dataset CORE, schema rigido, mapping DCAT-AP_IT
