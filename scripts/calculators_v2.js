// =============================================================================
// calculators_v2.js — Calcolatori metriche per CSV in formato Paniere CANONICO
// =============================================================================
//
// Differenza con calculators.js (v1):
// - v1 ha alias di colonne per ogni portale (50+ sinonimi accumulati nel tempo)
//   e logica di fallback per formati eterogenei
// - v2 assume CSV già nel formato canonico definito in schemas/csv/<dataset>.csv-schema.json
//   - colonne con nomi standard
//   - decimal separator = '.'
//   - encoding UTF-8
//   - date in formato YYYY-MM-DD
//   - tipi già verificati da validateCsv()
//
// Nessun magic. Nessun sinonimo. Replicabile.
// =============================================================================

// ----- Helpers ---------------------------------------------------------------

// Retrocompatibilità rinomine v2.0:
// pickCol(row, 'nuovo', 'vecchio') restituisce il valore del primo nome non vuoto
function pickCol(row, ...candidates) {
  for (const c of candidates) {
    const v = row[c];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

// Crea un oggetto "view" del row dove le chiavi vecchie sono mappate ai nuovi nomi.
// Lo usa la maggior parte dei calc per evitare di ripetere pickCol ovunque.
function withAliases(row, aliases) {
  // aliases = { vecchio: 'nuovo', ... }
  const out = { ...row };
  for (const [vecchio, nuovo] of Object.entries(aliases)) {
    if (out[nuovo] == null && out[vecchio] != null) {
      out[nuovo] = out[vecchio];
    }
  }
  return out;
}

function toNum(x) {
  if (x == null || x === '') return null;
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : null;
}
function toInt(x) {
  if (x == null || x === '') return null;
  const n = parseInt(x, 10);
  return Number.isFinite(n) ? n : null;
}
function yearOf(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

function countBy(rows, key, top = 20) {
  const counts = new Map();
  for (const r of rows) {
    const v = r[key];
    if (v == null || v === '') continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([nome, n]) => ({ nome, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, top);
}

function sumBy(rows, key) {
  let total = 0;
  let any = false;
  for (const r of rows) {
    const v = toNum(r[key]);
    if (v != null) { total += v; any = true; }
  }
  return any ? total : null;
}

function groupSum(rows, groupKey, sumKey, top = 20) {
  const map = new Map();
  for (const r of rows) {
    const k = r[groupKey];
    if (k == null || k === '') continue;
    const v = toNum(r[sumKey]);
    if (v == null) continue;
    map.set(k, (map.get(k) || 0) + v);
  }
  return [...map.entries()]
    .map(([nome, valore]) => ({ nome, valore }))
    .sort((a, b) => b.valore - a.valore)
    .slice(0, top);
}

function seriesByYear(rows, yearKey, valueKey) {
  const map = new Map();
  for (const r of rows) {
    const y = typeof r[yearKey] === 'string' && r[yearKey].includes('-')
      ? yearOf(r[yearKey])
      : toInt(r[yearKey]);
    if (y == null || y < 1900 || y > 2050) continue;
    if (valueKey) {
      const v = toNum(r[valueKey]);
      if (v == null) continue;
      map.set(y, (map.get(y) || 0) + v);
    } else {
      map.set(y, (map.get(y) || 0) + 1);
    }
  }
  return [...map.keys()].sort((a, b) => a - b)
    .map(y => ({ anno: y, valore: map.get(y) }));
}

function geoPoints(rows, max = 300) {
  const out = [];
  for (const r of rows) {
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);
    if (lat == null || lon == null) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    const point = { lat, lon };
    if (r.nome) point.nome = String(r.nome).slice(0, 200);
    else if (r.denominazione) point.nome = String(r.denominazione).slice(0, 200);
    else if (r.struttura) point.nome = String(r.struttura).slice(0, 200);
    else if (r.zona) point.nome = String(r.zona).slice(0, 200);
    out.push(point);
    if (out.length >= max) break;
  }
  return out;
}

// ----- 1. Popolazione --------------------------------------------------------
// v2.0: 'totale_residenti' (ex 'residenti'), 'localita' (ex 'quartiere')
export function calc_popolazione(rows) {
  // Comune Ideale: header demo Worker andamento_demografico → ANNO,NATI,DECESSI,IMMIGRATI,EMIGRATI,SALDO_NATURALE,SALDO_MIGRATORIO,TOTALE
  // Bologna/Lecce/Potenza: vecchio formato anno,numero_residenti,localita
  const aliased = rows.map(r => withAliases(r, {
    ANNO: 'anno',
    TOTALE: 'numero_residenti',
    residenti: 'numero_residenti',
    totale_residenti: 'numero_residenti',
    quartiere: 'localita',
  }));
  const serie = seriesByYear(aliased, 'anno', 'numero_residenti');
  const totale = serie.length > 0 ? serie[serie.length - 1].valore : null;
  const ultimoAnno = serie.length > 0 ? serie[serie.length - 1].anno : null;
  let perQuartiere = null;
  if (ultimoAnno !== null) {
    const rowsUltimoAnno = aliased.filter(r => {
      const y = typeof r.anno === 'string' ? parseInt(r.anno, 10) : r.anno;
      return y === ultimoAnno;
    });
    perQuartiere = groupSum(rowsUltimoAnno, 'localita', 'numero_residenti');
    if (!perQuartiere || perQuartiere.length === 0) perQuartiere = null;
  }
  return {
    totale_residenti: totale,
    serie_anni: serie,
    per_quartiere: perQuartiere,
  };
}

// ----- 2. Bilancio -----------------------------------------------------------
// Comune Ideale: header demo Worker peg_bilancio_comunale (29 colonne PDC, sep=;)
// Bologna/Lecce/Potenza: vecchio formato anno,settore_interv_inv,importo,sottosettore_interv_inv,misura
export function calc_bilancio(rows) {
  const aliased = rows.map(r => withAliases(r, {
    importo_euro: 'importo',
    totale_uscite: 'importo',
    'Stanziamento 2025': 'importo',
    'PDC-Descrizione Missione': 'settore_interv_inv',
    missione: 'settore_interv_inv',
    'PDC-Descrizione Programma': 'sottosettore_interv_inv',
    programma: 'sottosettore_interv_inv',
  }));
  // Per il PEG demo Worker filtro solo le righe USCITE; per gli altri formati lascia tutto
  const filtered = aliased.some(r => r.Tipo === 'USCITE' || r.Tipo === 'ENTRATE')
    ? aliased.filter(r => r.Tipo === 'USCITE')
    : aliased;
  const totale = sumBy(filtered, 'importo');
  return {
    totale_uscite: totale,
    per_missione: groupSum(filtered, 'settore_interv_inv', 'importo'),
    top10_programmi: groupSum(filtered, 'sottosettore_interv_inv', 'importo', 10),
  };
}

// ----- 3. Opere pubbliche ----------------------------------------------------
// Comune Ideale: header demo Worker publiccontract → id,cig,cup,oggetto_contratto,importo_aggiudicazione,...
// Bologna/Lecce/Potenza: vecchio formato con codice_stato_cup, fonte_finanziamento, lat, lon
export function calc_opere(rows) {
  const aliased = rows.map(r => withAliases(r, {
    stato: 'codice_stato_cup',
    importo_euro: 'importo_aggiudicazione',
    costo_lavori_previsto: 'importo_aggiudicazione',
    rup: 'nome_completo',
    aggiudicatario: 'nome_completo',  // per CPV:fullName
    modalita_scelta: 'codice_stato_cup',  // surrogato per "stato/modalità"
  }));
  const cup_count = aliased.filter(r => r.cup && String(r.cup).trim().length > 0).length;
  return {
    totale: aliased.length,
    per_stato: countBy(aliased, 'codice_stato_cup'),
    per_fonte: countBy(aliased, 'fonte_finanziamento') || countBy(aliased, 'cpv_codice'),
    cup_count,
    importo_totale: sumBy(aliased, 'importo_aggiudicazione'),
    opere_geo: geoPoints(aliased),
  };
}

// ----- 4. Pratiche edilizie --------------------------------------------------
// Comune Ideale: header demo Worker cpsv → id,nome_servizio,descrizione_servizio,...
// Bologna/Lecce/Potenza: vecchio formato data,tipo,codice_stato_cup,data_scadenza,via,civico
export function calc_pratiche(rows) {
  const aliased = rows.map(r => withAliases(r, {
    esito: 'codice_stato_cup',
    data_chiusura: 'data_scadenza',
    chiusura_data: 'data_scadenza',
    nome_servizio: 'tipo',  // per groupBy 'tipo'
  }));
  const conChiusura = aliased.filter(r => r.data_scadenza && String(r.data_scadenza).trim() !== '').length;
  const tasso_chiusura = aliased.length > 0 ? (conChiusura / aliased.length) * 100 : null;
  return {
    totale: aliased.length,
    per_tipo: countBy(aliased, 'tipo'),
    per_esito: countBy(aliased, 'codice_stato_cup') || countBy(aliased, 'canale_erogazione'),
    tasso_chiusura,
    serie_anni: seriesByYear(aliased, 'data'),
  };
}

// ----- 5. Servizi sociali ----------------------------------------------------
// Comune Ideale: header demo Worker strutture_sociali → codice_struttura,nome_struttura,tipo_struttura,...,posti_letto,accreditata
// Bologna/Lecce/Potenza: vecchio formato anno,categoria,numero,totale_costo,interventi
export function calc_sociali(rows) {
  const aliased = rows.map(r => withAliases(r, {
    utenti: 'numero',
    posti_letto: 'numero',  // per Comune Ideale demo Worker
    spesa_euro: 'importo',
    totale_costo: 'importo',
    tipo_struttura: 'categoria',  // per groupSum
  }));
  return {
    utenti_totali: sumBy(aliased, 'numero'),
    spesa_totale: sumBy(aliased, 'importo'),
    per_categoria: groupSum(aliased, 'categoria', 'numero') || countBy(aliased, 'categoria'),
    spesa_per_categoria: groupSum(aliased, 'categoria', 'importo'),
  };
}

// ----- 6. Istruzione ---------------------------------------------------------
// Comune Ideale: header demo Worker istituti_scolastici → codice_meccanografico,nome_istituto,tipo_istituto,...,numero_alunni,numero_classi
// Bologna/Lecce/Potenza: vecchio formato denominazione,anno,totale_alunni,tipologia,...
export function calc_istruzione(rows) {
  const aliased = rows.map(r => withAliases(r, {
    struttura: 'denominazione',
    denominazione_scuola: 'denominazione',
    nome_istituto: 'denominazione',  // demo Worker
    iscritti: 'totale_alunni',
    numero_alunni: 'totale_alunni',  // demo Worker
    tipo_struttura: 'tipologia',
    tipo_scuola: 'tipologia',
    tipo_istituto: 'tipologia',  // demo Worker
  }));
  const hasIscritti = aliased.some(r => toNum(r.totale_alunni) != null);
  return {
    totale_iscritti: sumBy(aliased, 'totale_alunni'),
    totale_strutture: aliased.length,
    per_struttura: hasIscritti ? groupSum(aliased, 'denominazione', 'totale_alunni') : countBy(aliased, 'denominazione'),
    per_tipo: hasIscritti ? groupSum(aliased, 'tipologia', 'totale_alunni') : countBy(aliased, 'tipologia'),
    per_quartiere: hasIscritti ? groupSum(aliased, 'quartiere', 'totale_alunni') : countBy(aliased, 'quartiere'),
    strutture_geo: geoPoints(aliased),
  };
}

// ----- 7. Incidenti stradali -------------------------------------------------
// Comune Ideale: header demo Worker incidenti_stradali → data,ora,comune,via,lat,lon,tipo_incidente,veicoli_coinvolti,feriti,morti,condizioni_meteo
// Bologna/Lecce/Potenza: vecchio formato data,lat,lon,decessi,feriti,localita,ora
export function calc_incidenti(rows) {
  const aliased = rows.map(r => withAliases(r, {
    morti: 'decessi',
    zona: 'localita',
    via: 'localita',  // demo Worker
    tipo_incidente: 'tipo',  // demo Worker
  }));
  const totale_morti = sumBy(aliased, 'decessi') || 0;
  const totale_feriti = sumBy(aliased, 'feriti') || 0;
  return {
    totale_anno: aliased.length,
    totale_morti,
    totale_feriti,
    per_zona: countBy(aliased, 'localita'),
    per_tipo: countBy(aliased, 'tipo'),
    serie_anni: seriesByYear(aliased, 'data'),
    hot_spots: geoPoints(aliased, 5000),
  };
}

// ----- 8. Rifiuti ------------------------------------------------------------
// v2.0: supporta DUE formati:
// - WIDE (vecchio, Bologna/Lecce): anno,rd_pct,kg_totali,kg_differenziata,kg_indifferenziata,frazione
// - LONG (nuovo Demo, canonico): anno,frazione,valore_assoluto,unita_misura
//   Convenzione: frazione='Totale' + unita='kg' = kg_totali; frazione='Differenziata_pct' + unita='%' = rd_pct
//
// Strategia: rilevo il formato da headers; se long, "esplodo" in pseudo-righe wide; poi calc unico.
export function calc_rifiuti(rows) {
  if (rows.length === 0) {
    return { rd_pct_ultimo_anno: null, trend_pct: null, serie_anni: [], per_frazione: [] };
  }

  // Applico alias per retrocompat: 
  //  - valore_assoluto → valore (Bologna/Lecce/Potenza)
  //  - quantita → valore (Comune Ideale formato superficie_agricola adapted)
  //  - tipo_frazione → frazione (Comune Ideale)
  rows = rows.map(r => withAliases(r, {
    valore_assoluto: 'valore',
    quantita: 'valore',
    tipo_frazione: 'frazione',
  }));

  // Detect formato: long se almeno una riga ha 'valore' E 'frazione' E NON ha rd_pct/kg_totali
  const isLong = rows.some(r =>
    r.valore != null && r.frazione != null &&
    r.rd_pct == null && r.kg_totali == null
  );

  let wideRows;
  if (isLong) {
    // Pivot da long → wide: aggrego per anno
    const byYear = new Map();
    for (const r of rows) {
      const anno = r.anno;
      if (!byYear.has(anno)) byYear.set(anno, { anno, frazioni: {} });
      const y = byYear.get(anno);
      const fraz = String(r.frazione || '').trim();
      const val = toNum(r.valore);
      const unit = String(r.unita_misura || '').trim().toLowerCase();
      if (val == null || !fraz) continue;
      // Mappature canoniche
      if (fraz === 'Totale' && (unit === 'kg' || unit === '')) y.kg_totali = (y.kg_totali || 0) + val;
      else if (fraz === 'Differenziata' && unit === 'kg') y.kg_differenziata = (y.kg_differenziata || 0) + val;
      else if (fraz === 'Indifferenziata' && unit === 'kg') y.kg_indifferenziata = (y.kg_indifferenziata || 0) + val;
      else if (fraz === 'Differenziata_pct' || unit === '%') y.rd_pct = val;
      else {
        // Frazioni merceologiche: accumula in y.frazioni per groupSum
        y.frazioni[fraz] = (y.frazioni[fraz] || 0) + val;
      }
    }
    // Costruisce wideRows: una riga per anno + righe-frazione per groupSum
    wideRows = [];
    for (const y of byYear.values()) {
      wideRows.push({ anno: y.anno, kg_totali: y.kg_totali, rd_pct: y.rd_pct,
                      kg_differenziata: y.kg_differenziata, kg_indifferenziata: y.kg_indifferenziata });
      for (const [fr, val] of Object.entries(y.frazioni)) {
        wideRows.push({ anno: y.anno, frazione: fr, kg_totali: val });
      }
    }
  } else {
    // Wide format già: applica alias quartiere→localita
    wideRows = rows.map(r => withAliases(r, { quartiere: 'localita' }));
  }

  // Caso 1: una riga per anno con rd_pct
  const conRd = wideRows.filter(r => toNum(r.rd_pct) != null);
  if (conRd.length > 0) {
    const serie = seriesByYear(conRd, 'anno', 'rd_pct');
    const ultimo = serie.length > 0 ? serie[serie.length - 1] : null;
    let trend_pct = null;
    if (serie.length >= 2) {
      const primo = serie[0].valore;
      const ultimoVal = serie[serie.length - 1].valore;
      if (primo > 0) trend_pct = ((ultimoVal - primo) / primo) * 100;
    }
    return {
      rd_pct_ultimo_anno: ultimo ? { anno: ultimo.anno, valore: Math.round(ultimo.valore * 10) / 10 } : null,
      trend_pct: trend_pct != null ? Math.round(trend_pct * 10) / 10 : null,
      serie_anni: serie.map(s => ({ anno: s.anno, valore: Math.round(s.valore * 10) / 10 })),
      per_frazione: groupSum(wideRows, 'frazione', 'kg_totali') || countBy(wideRows, 'frazione'),
    };
  }
  // Caso 2: solo kg per frazione/CER
  return {
    rd_pct_ultimo_anno: null,
    serie_anni: [],
    per_frazione: groupSum(wideRows, 'frazione', 'kg_totali') || countBy(wideRows, 'frazione'),
    kg_totali: sumBy(wideRows, 'kg_totali'),
  };
}

// ----- 9. Eventi culturali ---------------------------------------------------
// Comune Ideale: header demo Worker cpev → id,titolo_evento,tipo_evento,data_inizio,data_fine,...
// Bologna/Lecce/Potenza: vecchio formato nome,datainizio,datafine,categoria,...
export function calc_eventi(rows) {
  const aliased = rows.map(r => withAliases(r, {
    data_inizio: 'datainizio',
    data_fine: 'datafine',
    tipo_evento: 'categoria',  // demo Worker
    titolo_evento: 'nome',
  }));
  return {
    totale_anno: aliased.length,
    per_categoria: countBy(aliased, 'categoria'),
    per_quartiere: countBy(aliased, 'quartiere'),
    per_ingresso: countBy(aliased, 'ingresso') || countBy(aliased, 'format_evento'),
    eventi_geo: geoPoints(aliased, 300),
  };
}

// ----- 10. Delibere ----------------------------------------------------------
// Comune Ideale: header demo Worker transparency → id,denominazione,obbligo_trasparenza,categoria_trasparenza,...,anno_pubblicazione
// Bologna/Lecce/Potenza: vecchio formato data_atto,tipo_atto,numero_atto,oggetto,uo_proponente
export function calc_delibere(rows) {
  const aliased = rows.map(r => withAliases(r, {
    data: 'data_atto',
    tipo: 'tipo_atto',
    numero: 'numero_atto',
    ufficio: 'uo_proponente',
    settore: 'uo_proponente',
    categoria_trasparenza: 'tipo_atto',  // demo Worker
    ente: 'uo_proponente',                // demo Worker
    anno_pubblicazione: 'data_atto',      // surrogato per serie temporale
  }));
  return {
    totale_anno: aliased.length,
    per_tipo: countBy(aliased, 'tipo_atto'),
    per_ufficio: countBy(aliased, 'uo_proponente'),
    serie_anni: seriesByYear(aliased, 'data_atto'),
  };
}

// ----- 11. Patrimonio --------------------------------------------------------
// Comune Ideale: header demo Worker culturalheritage → id,codice_bene,denominazione_bene,tipo_bene,tutela,vincolo,...
// Bologna/Lecce/Potenza: vecchio formato denominazione,tipo,indirizzo,lat,lon,rendita,qualita,consistenza
export function calc_patrimonio(rows) {
  const aliased = rows.map(r => withAliases(r, {
    valore_euro: 'valore',
    rendita: 'valore',
    vincolo_culturale: 'vincolo',  // ora demo Worker usa 'vincolo'
    qualita: 'vincolo',
    uso: 'descrizione',
    consistenza: 'descrizione',
    denominazione_bene: 'denominazione',  // demo Worker
    tipo_bene: 'tipo',                    // demo Worker
  }));
  // 'vincolo' indica la qualità del vincolo (es. 'monumentale', 'paesaggistico', 'non vincolato')
  const conVincolo = aliased.filter(r => {
    const v = r.vincolo;
    if (v == null || v === '' || v === false || v === 'false') return false;
    const s = String(v).toLowerCase().trim();
    return s !== '' && s !== 'no' && s !== 'nessuno' && s !== 'none' && s !== 'non vincolato';
  }).length;
  const pct_vincolo = aliased.length > 0 ? Math.round((conVincolo / aliased.length) * 1000) / 10 : null;
  return {
    totale_immobili: aliased.length,
    per_tipo: countBy(aliased, 'tipo'),
    per_destinazione: countBy(aliased, 'descrizione') || countBy(aliased, 'epoca'),
    valore_totale: sumBy(aliased, 'valore'),
    superficie_totale_mq: sumBy(aliased, 'superficie_mq'),
    pct_vincolo,
    immobili_geo: geoPoints(aliased, 300),
  };
}

// ----- 12. Tributi -----------------------------------------------------------
// v2.0: 'tipo_atto' (ex 'tributo'), 'totale_entrate' (ex 'gettito_euro'),
// 'numero' (ex 'n_contribuenti'), 'valore' (ex 'aliquota_base')
export function calc_tributi(rows) {
  const aliased = rows.map(r => withAliases(r, {
    tributo: 'tipo_atto',
    gettito_euro: 'totale_entrate',
    n_contribuenti: 'numero',
    aliquota_base: 'valore',
    denominazione: 'tipo_atto',         // demo Worker indicator
    valore_indicatore: 'totale_entrate', // demo Worker
    fonte_indicatore: 'descrizione',     // demo Worker
  }));
  // Anno più recente disponibile
  const anni = [...new Set(aliased.map(r => parseInt(r.anno) || 0).filter(a => a > 1900))];
  const annoUltimo = anni.length ? Math.max(...anni) : null;
  const ultime = annoUltimo ? aliased.filter(r => parseInt(r.anno) === annoUltimo) : [];

  // Aggregazione gettito per tributo (sommando categorie)
  const perTributoMap = {};
  for (const r of ultime) {
    const t = (r.tipo_atto || 'ALTRO').toString().toUpperCase();
    perTributoMap[t] = (perTributoMap[t] || 0) + (parseFloat(r.totale_entrate) || 0);
  }
  const per_tributo_ultimo_anno = Object.entries(perTributoMap)
    .map(([nome, valore]) => ({ nome, valore }))
    .sort((a, b) => b.valore - a.valore);

  // Aliquote per tributo (utile quando il Comune pubblica solo aliquote
  // senza gettito reale, es. dati MEF Federalismo Fiscale)
  const perAliquotaMap = {};
  const perDescrizioneMap = {};
  for (const r of ultime) {
    const t = (r.tipo_atto || 'ALTRO').toString().toUpperCase();
    const al = parseFloat(r.valore);
    if (!isNaN(al) && al > 0) {
      perAliquotaMap[t] = al; // ultima aliquota vince per categoria
      if (r.descrizione) perDescrizioneMap[t] = r.descrizione;
    }
  }
  const per_tributo_aliquota = Object.entries(perAliquotaMap)
    .map(([nome, aliquota]) => ({ nome, aliquota, descrizione: perDescrizioneMap[nome] || null }))
    .sort((a, b) => b.aliquota - a.aliquota);

  // Serie storica gettito totale per anno
  const perAnnoMap = {};
  for (const r of aliased) {
    const a = parseInt(r.anno);
    if (!a) continue;
    perAnnoMap[a] = (perAnnoMap[a] || 0) + (parseFloat(r.totale_entrate) || 0);
  }
  const serie_anni = Object.entries(perAnnoMap)
    .map(([anno, valore]) => ({ anno: parseInt(anno), valore }))
    .sort((a, b) => a.anno - b.anno);

  const gettito_totale_ultimo_anno = ultime.reduce((s, r) => s + (parseFloat(r.totale_entrate) || 0), 0);
  const has_gettito = gettito_totale_ultimo_anno > 0;

  return {
    gettito_totale_ultimo_anno,
    anno_ultimo: annoUltimo,
    n_tributi_distinti: per_tributo_ultimo_anno.length,
    per_tributo_ultimo_anno,
    per_tributo_aliquota,
    has_gettito,
    serie_anni,
    contribuenti_ultimo_anno: ultime.reduce((s, r) => s + (parseInt(r.numero) || 0), 0) || null,
  };
}

// ----- Registry -------------------------------------------------------------
export const CALCULATORS_V2 = {
  popolazione:        calc_popolazione,
  bilancio:           calc_bilancio,
  opere_pubbliche:    calc_opere,
  pratiche_edilizie:  calc_pratiche,
  servizi_sociali:    calc_sociali,
  istruzione:         calc_istruzione,
  incidenti_stradali: calc_incidenti,
  rifiuti:            calc_rifiuti,
  eventi_culturali:   calc_eventi,
  delibere:           calc_delibere,
  patrimonio:         calc_patrimonio,
  tributi:            calc_tributi,
};
