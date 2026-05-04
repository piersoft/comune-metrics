// ComuneMetrics — Calculators (Node.js)
// Ogni funzione calc_<dataset> riceve:
//   rows:       array di oggetti (record CSV/JSON parsed)
//   fieldMap:   { canonical_name: nome_colonna_csv | null }
// Ritorna un oggetto di metriche. null = "campo non presente nel CSV".

// Helper: estrae valore canonical da una row, applicando il field map
function v(row, fieldMap, key) {
  const col = fieldMap[key];
  if (!col) return undefined;
  return row[col];
}

// Helper: parse numero tollerante (gestisce virgola decimale italiana)
function num(x) {
  if (x === null || x === undefined || x === '') return null;
  if (typeof x === 'number') return x;
  const s = String(x).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Helper: group-by con counts
function countBy(rows, fieldMap, key, top = 20) {
  const col = fieldMap[key];
  if (!col) return null;
  const counts = new Map();
  for (const r of rows) {
    const val = r[col];
    if (val === null || val === undefined || val === '') continue;
    const k = String(val).trim();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([nome, n]) => ({ nome, n }));
}

// =================== CORE 1 — Popolazione ===================
export function calc_popolazione(rows, fieldMap) {
  return {
    totale_residenti: null,
    serie_anni: null,
    serie_residenti: null,
    pop_0_14: null,
    pop_65plus: null,
    per_quartiere: countBy(rows, fieldMap, 'quartiere'),
    nati: null, morti: null, iscritti: null, cancellati: null,
  };
}

// =================== CORE 2 — Bilancio ===================
export function calc_bilancio(rows, fieldMap) {
  const importoCol = fieldMap.importo;
  let totale = null;
  if (importoCol) {
    totale = 0;
    for (const r of rows) {
      const n = num(r[importoCol]);
      if (n !== null) totale += n;
    }
  }
  return {
    totale_uscite: totale,
    per_missione: countBy(rows, fieldMap, 'missione'),
    top10_programmi: countBy(rows, fieldMap, 'programma', 10),
    serie_anni: null,
  };
}

// =================== CORE 3 — Opere pubbliche ===================
export function calc_opere(rows, fieldMap) {
  return {
    totale: rows.length,
    per_stato: countBy(rows, fieldMap, 'stato'),
    opere_geo: null,           // verrà implementato in Commit B
    cup: fieldMap.cup ? rows.length : null,
    importo_totale: null,      // se importo presente
    sal_medio: null,
    per_fonte: countBy(rows, fieldMap, 'fonte'),
  };
}

// =================== CORE 4 — Pratiche edilizie ===================
export function calc_pratiche(rows, fieldMap) {
  return {
    totale: rows.length,
    per_tipo: countBy(rows, fieldMap, 'tipo'),
    per_esito: countBy(rows, fieldMap, 'esito'),
    tasso_chiusura: null,
    tempo_medio_scia: null,
    tempo_medio_pdc: null,
    pct_nei_termini: null,
  };
}

// =================== CORE 5 — Servizi sociali ===================
export function calc_sociali(rows, fieldMap) {
  let spesaTot = null;
  if (fieldMap.contributo) {
    spesaTot = 0;
    for (const r of rows) {
      const n = num(r[fieldMap.contributo]);
      if (n !== null) spesaTot += n;
    }
  }
  return {
    utenti_totali: rows.length,
    per_target: countBy(rows, fieldMap, 'target'),
    per_categoria: countBy(rows, fieldMap, 'categoria'),
    spesa_totale: spesaTot,
    spesa_media: spesaTot !== null && rows.length > 0 ? spesaTot / rows.length : null,
    pct_accolte: null,
  };
}

// =================== CORE 6 — Istruzione ===================
export function calc_istruzione(rows, fieldMap) {
  let totIscritti = null;
  if (fieldMap.iscritti) {
    totIscritti = 0;
    for (const r of rows) {
      const n = num(r[fieldMap.iscritti]);
      if (n !== null) totIscritti += n;
    }
  }
  return {
    totale_iscritti: totIscritti,
    per_struttura: countBy(rows, fieldMap, 'struttura', 50),
    per_quartiere: countBy(rows, fieldMap, 'quartiere'),
    plessi_geo: null,
    posti_totali: null,
    lista_attesa: null,
    tasso_copertura: null,
  };
}

// =================== CORE 7 — Incidenti ===================
export function calc_incidenti(rows, fieldMap) {
  return {
    totale_anno: rows.length,
    n_morti: null,
    n_feriti: null,
    serie_mensile: null,
    per_zona: countBy(rows, fieldMap, 'zona'),
    hot_spots: null,
    indice_mortalita: null,
    pct_pedoni_ciclisti: null,
  };
}

// =================== CORE 8 — Rifiuti ===================
export function calc_rifiuti(rows, fieldMap) {
  return {
    rd_pct: null,
    serie_anni: null,
    per_zona: countBy(rows, fieldMap, 'zona'),
    composizione: null,
    pro_capite_kg: null,
    serie_mensile: null,
  };
}

// =================== CORE 9 — Eventi culturali ===================
export function calc_eventi(rows, fieldMap) {
  return {
    totale_anno: rows.length,
    per_categoria: countBy(rows, fieldMap, 'categoria'),
    eventi_geo: null,
    pct_gratuiti: null,
    spesa_patrocinati: null,
  };
}

// =================== CORE 10 — Delibere ===================
export function calc_delibere(rows, fieldMap) {
  return {
    totale_anno: rows.length,
    per_tipo: countBy(rows, fieldMap, 'tipo'),
    tempo_medio_pubblicazione: null,
    pct_nei_termini: null,
  };
}

// =================== CORE 11 — Patrimonio ===================
export function calc_patrimonio(rows, fieldMap) {
  return {
    totale_immobili: rows.length,
    per_categoria: countBy(rows, fieldMap, 'tipo'),
    immobili_geo: null,
    pct_vincolo_culturale: fieldMap.vincolo ? 0 : null,
    valore_totale: null,
    pct_inutilizzati: null,
  };
}

// Lookup table
export const CALCULATORS = {
  calc_popolazione, calc_bilancio, calc_opere, calc_pratiche,
  calc_sociali, calc_istruzione, calc_incidenti, calc_rifiuti,
  calc_eventi, calc_delibere, calc_patrimonio,
};
