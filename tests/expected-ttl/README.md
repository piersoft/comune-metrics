# TTL ground-truth — Linked Open Data del Comune Ideale

Questa cartella contiene i **15 file Turtle (TTL)** di esempio, generati dai CSV del Comune Ideale e validati con `rdflib`.

Sono il **gold standard** che ogni Comune che adotta il paniere dovrebbe ottenere quando converte i propri CSV in RDF: predicati DCAT-AP_IT corretti, classi semantiche conformi alle [ontologie per le PA italiane](https://github.com/italia/dati-semantic-assets), pubblicate sul [Catalogo Nazionale Dati Semantici](https://schema.gov.it/).

---

## A cosa servono

- **Esempio** di output atteso per chi vuole esporre i propri dati come Linked Open Data nel proprio Comune
- **Validare** che le proprie modifiche ai CSV demo del paniere non rompano la mappatura semantica
- **Test di regressione**: rigenera i TTL con il proprio strumento di conversione preferito e confronta con questi per scoprire cambiamenti silenziosi
- **Riferimento canonico** delle classi e [ontologie per le PA italiane](https://github.com/italia/dati-semantic-assets) da usare per ciascun dataset CORE

---

## Mapping CSV → Ontologia

| # | Dataset CORE | Ontologia DCAT-AP_IT | Classe principale |
|---|---|---|---|
| 1 | Popolazione | QB + CLV | `qb:Observation` |
| 2 | Bilancio | QB + CPSV-AP + COV | `cpsv:PublicService` |
| 3 | Opere pubbliche | PublicContract + CPV + COV + TI + QB | `pc:Contract` |
| 4 | Pratiche edilizie | CPSV-AP + COV | `cpsv:PublicService` |
| 5 | Servizi sociali | COV + CLV + POI + SM + ACCO | `acco:Accommodation` |
| 6 | Istruzione | SMAPIT + CLV + SM | `smapit:School` |
| 7 | Incidenti stradali | POI + CLV + TI | `poi:PointOfInterest` |
| 8 | Rifiuti | QB + CLV | `qb:Observation` |
| 9 | Eventi culturali | CPEV + TI + POI + CLV | `cpev:PublicEvent` |
| 10 | Delibere | Transparency + COV | `tr:TransparencyObligation` |
| 11 | Patrimonio | CulturalHeritage + CLV | `ch:CulturalHeritage` |
| 12 | Tributi | Indicator + QB + COV | `indicator:Indicator` |
| 13 | Defibrillatori (DAE) | POI + CLV + SM | `poi:PointOfInterest` |
| 14 | Parcheggi pubblici | PARK + POI + CLV | `park:CarPark` |
| 15 | Strutture ricettive | ACCO + CLV + POI | `acco:Accommodation` |

---

## Validazione

I 15 TTL sono parsabili da [rdflib](https://rdflib.readthedocs.io/) (Python) senza errori:

```python
import rdflib
g = rdflib.Graph()
g.parse('popolazione.ttl', format='turtle')
print(f'Triple: {len(g)}')
```

Per validare tutti e 15 in batch:

```bash
for ttl in tests/expected-ttl/*.ttl; do
  python3 -c "
import rdflib
g = rdflib.Graph()
g.parse('$ttl', format='turtle')
print(f'$ttl: {len(g)} triple OK')
"
done
```

---

## Come ricreare i TTL nel proprio Comune

Per la conversione CSV → RDF nel proprio Comune ognuno è libero di usare lo strumento che preferisce: librerie Python (`rdflib`, `csvw`), Java (`Jena`), tool open source di mapping CSV → RDF, oppure scriversi un convertitore basato sui mapping della tabella sopra.

Una volta prodotto il TTL, può essere caricato in un endpoint SPARQL Virtuoso, in un catalogo DCAT-AP_IT su [dati.gov.it](https://www.dati.gov.it), o in un harvester piveau.

Lo strumento [`piersoft/CSV-to-RDF`](https://github.com/piersoft/CSV-to-RDF) (open source) è quello che è stato usato per generare i 15 TTL di questa cartella e contiene il motore di matching colonne → [ontologie per le PA italiane](https://github.com/italia/dati-semantic-assets). Il suo README spiega come deployarlo per un uso autonomo, in locale o come servizio interno della propria PA.

**Nota**: i 15 TTL in questa cartella sono **statici, generati una tantum**. Non vengono rigenerati automaticamente. Se modifichi i CSV in `data/comuni/demo/`, ricordati di rigenerare manualmente i TTL corrispondenti col tuo strumento di conversione e ricommittarli.

---

## Note tecniche sui TTL

- **`patrimonio.ttl`** usa la classe `ch:CulturalHeritage` invece di `cis:CulturalInstituteOrSite`. Entrambe sono valide: `CulturalHeritage` è più appropriata per beni patrimoniali del Comune, `Cultural-ON` lo è per istituti culturali (musei, biblioteche).
- **`servizi_sociali.ttl`** usa `acco:Accommodation`. È coerente: RSA, case di riposo e centri diurni sono strutture ricettive sociali con `posti_letto`.
- **`defibrillatori.ttl`** mappa su `poi:PointOfInterest`: ogni postazione DAE è un punto di interesse pubblico georeferenziato con accessibilità h24.
- **`parcheggi.ttl`** mappa su `park:CarPark` (ontologia PARK del Catalogo Nazionale): include `posti_disabili`, `tariffa_oraria`, `tipo_parcheggio`.
- I TTL sono generati col Comune Ideale come ente pubblicante (`ipa=c_ideal`). Per usare i CSV nel proprio Comune sostituire `ipa` con il proprio codice IPA reale.
