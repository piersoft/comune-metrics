# TTL ground-truth — Linked Open Data del Comune Ideale

Questa cartella contiene i 12 file Turtle (TTL) generati dai CSV del Comune Ideale tramite il Worker [`csv2rdf.datigovit.workers.dev`](https://github.com/piersoft/CSV-to-RDF).

Sono il **gold standard** che ogni Comune che adotta il paniere dovrebbe ottenere quando converte i propri CSV in RDF: predicati DCAT-AP_IT corretti, classi semantiche ex-OntoPiA, conformità al [Catalogo Nazionale Dati Semantici](https://schema.gov.it/).

---

## A cosa servono

- **Validare** che le proprie modifiche ai CSV demo non rompano la mappatura semantica
- **Esempio** di output atteso per chi vuole replicare il paniere nel proprio Comune
- **Test di regressione**: rigenera i TTL e confronta con questi per scoprire cambiamenti silenziosi

---

## Mapping CSV → Ontologia

| # | Dataset CORE | Demo Worker fonte | Ontologia DCAT-AP_IT | Classe principale |
|---|---|---|---|---|
| 1 | Popolazione | `andamento_demografico` | QB + CLV | `qb:Observation` |
| 2 | Bilancio | `peg_bilancio_comunale` | QB + CPSV-AP + COV | `cpsv:PublicService` |
| 3 | Opere pubbliche | `publiccontract` | PublicContract + CPV + COV + TI + QB | `pc:Contract` |
| 4 | Pratiche edilizie | `cpsv` | CPSV-AP + COV | `cpsv:PublicService` |
| 5 | Servizi sociali | `strutture_sociali` | COV + CLV + POI + SM + ACCO | `acco:Accommodation` |
| 6 | Istruzione | `istituti_scolastici` | SMAPIT + CLV + SM | `smapit:School` |
| 7 | Incidenti stradali | `incidenti_stradali` | POI + CLV + TI | `poi:PointOfInterest` |
| 8 | Rifiuti | (schema QB+CLV) | QB + CLV | `qb:Observation` |
| 9 | Eventi culturali | `cpev` | CPEV + TI + POI + CLV | `cpev:PublicEvent` |
| 10 | Delibere | `transparency` | Transparency + COV | `tr:TransparencyObligation` |
| 11 | Patrimonio | `culturalheritage` | CulturalHeritage + CLV | `ch:CulturalHeritage` |
| 12 | Tributi | `indicator` | Indicator + QB + COV | `indicator:Indicator` |

---

## Come rigenerare

Ogni TTL si rigenera al volo passando il CSV pubblico al Worker, con il parametro `?onto=` per forzare le ontologie:

```bash
curl "https://csv2rdf.datigovit.workers.dev/?url=https://raw.githubusercontent.com/piersoft/comune-metrics/main/data/comuni/demo/popolazione.csv&ipa=c_ideal&pa=Comune+Ideale&onto=QB,CLV,L0" \
  -o popolazione.ttl
```

I link diretti ai 12 endpoint Worker sono nel [PANIERE_CSV_SCHEMA.md](../../docs/PANIERE_CSV_SCHEMA.md) sotto la sezione "Linked Open Data".

---

## Validazione

I 12 TTL sono parsabili da [rdflib](https://rdflib.readthedocs.io/) (Python) senza errori:

```python
import rdflib
g = rdflib.Graph()
g.parse('popolazione.ttl', format='turtle')
print(f'Triple: {len(g)}')
```

---

## Note

- **`patrimonio.ttl`** usa la classe `ch:CulturalHeritage` invece di `cis:CulturalInstituteOrSite`. Entrambe sono valide: `CulturalHeritage` è più appropriata per beni patrimoniali del Comune, `Cultural-ON` lo è per istituti culturali (musei, biblioteche).
- **`servizi_sociali.ttl`** usa `acco:Accommodation`. È coerente: RSA, case di riposo e centri diurni sono strutture ricettive sociali con `posti_letto`. Il Worker rileva la colonna e attiva ACCO automaticamente.
- I TTL sono generati col Comune Ideale come ente pubblicante (`ipa=c_ideal`). Per usare i CSV nel proprio Comune sostituire `ipa` con il proprio codice IPA.
