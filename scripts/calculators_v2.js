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
export function calc_popolazione(rows) {
  // Calcola serie per anno; "totale_residenti" = ULTIMO anno (non somma)
  const serie = seriesByYear(rows, 'anno', 'residenti');
  const totale = serie.length > 0 ? serie[serie.length - 1].valore : null;
  // Per quartiere: solo l'ultimo anno (altrimenti somma 15 anni di residenti)
  const ultimoAnno = serie.length > 0 ? serie[serie.length - 1].anno : null;
  let perQuartiere = null;
  if (ultimoAnno !== null) {
    const rowsUltimoAnno = rows.filter(r => {
      const y = typeof r.anno === 'string' ? parseInt(r.anno, 10) : r.anno;
      return y === ultimoAnno;
    });
    perQuartiere = groupSum(rowsUltimoAnno, 'quartiere', 'residenti');
    if (!perQuartiere || perQuartiere.length === 0) perQuartiere = null;
  }
  return {
    totale_residenti: totale,
    serie_anni: serie,
    per_quartiere: perQuartiere,
  };
}

// ----- 2. Bilancio -----------------------------------------------------------
export function calc_bilancio(rows) {
  const totale = sumBy(rows, 'importo_euro');
  return {
    totale_uscite: totale,
    per_missione: groupSum(rows, 'missione', 'importo_euro'),
    top10_programmi: groupSum(rows, 'programma', 'importo_euro', 10),
  };
}

// ----- 3. Opere pubbliche ----------------------------------------------------
export function calc_opere(rows) {
  const cup_count = rows.filter(r => r.cup && String(r.cup).trim().length > 0).length;
  return {
    totale: rows.length,
    per_stato: countBy(rows, 'stato'),
    per_fonte: countBy(rows, 'fonte_finanziamento'),
    cup_count,
    importo_totale: sumBy(rows, 'importo_euro'),
    opere_geo: geoPoints(rows),
  };
}

// ----- 4. Pratiche edilizie --------------------------------------------------
export function calc_pratiche(rows) {
  const conChiusura = rows.filter(r => r.chiusura_data && String(r.chiusura_data).trim() !== '').length;
  const tasso_chiusura = rows.length > 0 ? (conChiusura / rows.length) * 100 : null;
  return {
    totale: rows.length,
    per_tipo: countBy(rows, 'tipo'),
    per_esito: countBy(rows, 'esito'),
    tasso_chiusura,
    serie_anni: seriesByYear(rows, 'data'),
  };
}

// ----- 5. Servizi sociali ----------------------------------------------------
export function calc_sociali(rows) {
  return {
    utenti_totali: sumBy(rows, 'utenti'),
    spesa_totale: sumBy(rows, 'spesa_euro'),
    per_categoria: groupSum(rows, 'categoria', 'utenti') || countBy(rows, 'categoria'),
    spesa_per_categoria: groupSum(rows, 'categoria', 'spesa_euro'),
  };
}

// ----- 6. Istruzione ---------------------------------------------------------
export function calc_istruzione(rows) {
  return {
    totale_iscritti: sumBy(rows, 'iscritti'),
    totale_strutture: rows.length,
    per_struttura: groupSum(rows, 'struttura', 'iscritti'),
    per_tipo: groupSum(rows, 'tipo_struttura', 'iscritti'),
    per_quartiere: groupSum(rows, 'quartiere', 'iscritti'),
    strutture_geo: geoPoints(rows),
  };
}

// ----- 7. Incidenti stradali -------------------------------------------------
export function calc_incidenti(rows) {
  const totale_morti = sumBy(rows, 'morti') || 0;
  const totale_feriti = sumBy(rows, 'feriti') || 0;
  return {
    totale_anno: rows.length,
    totale_morti,
    totale_feriti,
    per_zona: countBy(rows, 'zona'),
    per_tipo: countBy(rows, 'tipo'),
    serie_anni: seriesByYear(rows, 'data'),
    hot_spots: geoPoints(rows, 5000),
  };
}

// ----- 8. Rifiuti ------------------------------------------------------------
export function calc_rifiuti(rows) {
  // Caso 1: una riga per anno con rd_pct
  const conRd = rows.filter(r => toNum(r.rd_pct) != null);
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
      per_frazione: groupSum(rows, 'frazione', 'kg_totali') || countBy(rows, 'frazione'),
    };
  }
  // Caso 2: solo kg per frazione/CER
  return {
    rd_pct_ultimo_anno: null,
    serie_anni: [],
    per_frazione: groupSum(rows, 'frazione', 'kg_totali') || countBy(rows, 'frazione'),
    kg_totali: sumBy(rows, 'kg_totali'),
  };
}

// ----- 9. Eventi culturali ---------------------------------------------------
export function calc_eventi(rows) {
  return {
    totale_anno: rows.length,
    per_categoria: countBy(rows, 'categoria'),
    per_quartiere: countBy(rows, 'quartiere'),
    per_ingresso: countBy(rows, 'ingresso'),
    eventi_geo: geoPoints(rows, 300),
  };
}

// ----- 10. Delibere ----------------------------------------------------------
export function calc_delibere(rows) {
  return {
    totale_anno: rows.length,
    per_tipo: countBy(rows, 'tipo'),
    per_ufficio: countBy(rows, 'ufficio'),
    serie_anni: seriesByYear(rows, 'data'),
  };
}

// ----- 11. Patrimonio --------------------------------------------------------
export function calc_patrimonio(rows) {
  const conVincolo = rows.filter(r => r.vincolo_culturale === true || r.vincolo_culturale === 'true' || r.vincolo_culturale === 'Sì' || r.vincolo_culturale === 'si' || r.vincolo_culturale === 'Si').length;
  const pct_vincolo = rows.length > 0 ? Math.round((conVincolo / rows.length) * 1000) / 10 : null;
  return {
    totale_immobili: rows.length,
    per_tipo: countBy(rows, 'tipo'),
    per_destinazione: countBy(rows, 'destinazione_uso'),
    valore_totale: sumBy(rows, 'valore_euro'),
    superficie_totale_mq: sumBy(rows, 'superficie_mq'),
    pct_vincolo,
    immobili_geo: geoPoints(rows, 300),
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
};
