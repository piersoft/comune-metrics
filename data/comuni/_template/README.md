# `_template/` — Template per nuovi Comuni

Questa cartella **non è un Comune reale** (nota il `_` iniziale che fa skip al builder). Serve come **modello da copiare** quando vuoi aggiungere il tuo Comune al cruscotto ComuneMetrics.

## Come usare il template

```bash
# 1. Copia la cartella dando il nome (slug) al tuo Comune
cp -r data/comuni/_template data/comuni/<chiave-comune>

# Esempio:
cp -r data/comuni/_template data/comuni/parma

# 2. Apri data/comuni/<chiave>/manifest.yml e compila:
#    - nome, ipa, istat, popolazione_attesa, mandato, sindaco
#    - mappa_center, mappa_zoom
#    - per ogni dataset CORE che pubblichi: source_type + url o path

# 3. Per i CSV (source_type: fixture), copiali nella stessa cartella:
#    data/comuni/<chiave>/popolazione.csv
#    data/comuni/<chiave>/bilancio.csv
#    ...
#
#    Devono rispettare lo schema canonico documentato in:
#    schemas/csv/<dataset>.csv-schema.json

# 4. Valida i tuoi CSV prima del commit:
node scripts/validate_csv.js popolazione data/comuni/parma/popolazione.csv

# 5. Apri PR su https://github.com/piersoft/comune-metrics
#    La GitHub Action verifica automaticamente tutto.
```

## Vincoli sui CSV (regole del Paniere)

I CSV vanno scritti in **formato canonico**:

- **Encoding**: UTF-8 obbligatorio
- **Separatore di colonna**: virgola `,` o punto e virgola `;` (auto-detect)
- **Separatore decimale**: solo punto `.` (mai virgola)
- **Date**: formato `YYYY-MM-DD` (ISO 8601)
- **Header**: nomi colonne ESATTI come da schema (case-sensitive)
- **Colonne sconosciute**: NON ammesse — il validatore le rifiuta

## Esempio veloce

Vuoi pubblicare solo la popolazione e il bilancio? Il manifest minimo:

```yaml
nome: "Parma"
ipa: "c_g337"
istat: "034027"
popolazione_attesa: 198292
mandato: "2022-2027"
sindaco: "Michele Guerra"
mappa_center: [44.8015, 10.3279]
mappa_zoom: 13
paniere_version: "csv-v1"

datasets:
  popolazione:
    source_type: fixture
    aggiornato: "2025-12-31"
    fonte: "Anagrafe comunale"

  bilancio:
    source_type: external_csv
    url: "https://opendata.parma.it/datasets/bilancio-2024.csv"
    aggiornato: "2024-12-31"
    fonte: "Bilancio consuntivo 2024"

  # Tutti gli altri 9 dataset sono assenti (default presente: false)
  opere_pubbliche:    { presente: false }
  pratiche_edilizie:  { presente: false }
  servizi_sociali:    { presente: false }
  istruzione:         { presente: false }
  incidenti_stradali: { presente: false }
  rifiuti:            { presente: false }
  eventi_culturali:   { presente: false }
  delibere:           { presente: false }
  patrimonio:         { presente: false }
```

E il file `data/comuni/parma/popolazione.csv`:

```csv
anno,residenti,quartiere
2024,55421,Cittadella
2024,42183,Oltretorrente
2023,55892,Cittadella
```

Punto. Niente codice da modificare. Niente alias. Niente sinonimi.

## Rapporti con il vecchio modello (Bologna, Lecce)

Bologna e Lecce sono attualmente in `config/comuni.yml` per ragioni storiche (Bologna usa l'API Opendatasoft live, Lecce ha fixture in `data/fixtures/lecce/`). Il builder li gestisce con un code-path legacy. **I nuovi Comuni passano sempre per il manifest.yml**.
