// ComuneMetrics — Calculators (Node.js, logica reale)
// Ogni calc_<dataset> legge le colonne effettive del CSV/JSON e produce
// metriche concrete. I valori null = "campo non disponibile nel CSV reale".

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(x) {
  if (x === null || x === undefined || x === '') return null;
  if (typeof x === 'number') return x;
  let s = String(x).trim();
  if (!s) return null;
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  // Casi:
  //  "40.37924"   → 1 punto, 0 virgole → decimale puro (puntoeng)
  //  "1,234.56"   → 1 punto, 1+ virgole → punto decimale, virgola migliaia
  //  "1.234,56"   → 1 virgola, 1+ punti → virgola decimale, punto migliaia
  //  "40,37924"   → 1 virgola, 0 punti → decimale italiano
  //  "1.234.567"  → 2+ punti, 0 virgole → migliaia eu
  //  "12,345"     → 1 virgola, 0 punti → ambiguo: decimale italiano (preferiamo)
  if (dots > 0 && commas === 0) {
    // Punti only: se >1 punti => migliaia; se 1 punto => decimale
    if (dots > 1) s = s.replace(/\./g, '');
    // else: lascia il punto come decimale
  } else if (commas > 0 && dots === 0) {
    // Virgole only: 1 virgola = decimale; >1 virgole = migliaia (raro)
    if (commas === 1) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (dots > 0 && commas > 0) {
    // Entrambi: l'ultimo che appare è il decimale
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot > lastComma) {
      // Punto è decimale (formato US)
      s = s.replace(/,/g, '');
    } else {
      // Virgola è decimale (formato EU)
      s = s.replace(/\./g, '').replace(',', '.');
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function get(row, fieldMap, key) {
  const col = fieldMap[key];
  if (!col) return undefined;
  return row[col];
}

function countBy(rows, fieldMap, key, top = 20) {
  const col = fieldMap[key];
  if (!col) return null;
  const counts = new Map();
  for (const r of rows) {
    const val = r[col];
    if (val === null || val === undefined || val === '') continue;
    const k = String(val).trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([nome, n]) => ({ nome, n }));
}

function sumBy(rows, fieldMap, key) {
  const col = fieldMap[key];
  if (!col) return null;
  let tot = 0, found = false;
  for (const r of rows) {
    const n = num(r[col]);
    if (n !== null) { tot += n; found = true; }
  }
  return found ? tot : null;
}

function groupSum(rows, fieldMap, groupKey, valueKey, top = 20) {
  const groupCol = fieldMap[groupKey];
  const valCol = fieldMap[valueKey];
  if (!groupCol || !valCol) return null;
  const sums = new Map();
  for (const r of rows) {
    const g = r[groupCol];
    const v = num(r[valCol]);
    if (g === null || g === undefined || g === '' || v === null) continue;
    const k = String(g).trim();
    sums.set(k, (sums.get(k) || 0) + v);
  }
  if (sums.size === 0) return null;
  return [...sums.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([nome, valore]) => ({ nome, valore }));
}

// Estrai lat/lon da diverse rappresentazioni: lat/lon separati, oggetto
// {lat, lon} o {lat, lng}, array [lat, lon], stringa "lat,lon"
function extractLatLon(row, fieldMap) {
  const latCol = fieldMap.lat;
  const lonCol = fieldMap.lon;
  if (latCol && lonCol) {
    const lat = num(row[latCol]);
    const lon = num(row[lonCol]);
    if (lat !== null && lon !== null) return { lat, lon };
  }
  const pinCol = fieldMap.pin_point || fieldMap.coordinate;
  if (pinCol && row[pinCol]) {
    const v = row[pinCol];
    if (typeof v === 'object' && v !== null) {
      if (typeof v.lat === 'number' && typeof v.lon === 'number') return { lat: v.lat, lon: v.lon };
      if (typeof v.lat === 'number' && typeof v.lng === 'number') return { lat: v.lat, lon: v.lng };
      if (Array.isArray(v) && v.length === 2) return { lat: v[0], lon: v[1] };
    }
    if (typeof v === 'string' && v.includes(',')) {
      const [a, b] = v.split(',').map(s => num(s.trim()));
      if (a !== null && b !== null) return { lat: a, lon: b };
    }
  }
  return null;
}

function geoPoints(rows, fieldMap, nameKey = null, max = 200) {
  const out = [];
  for (const r of rows) {
    const ll = extractLatLon(r, fieldMap);
    if (!ll) continue;
    const point = { lat: ll.lat, lon: ll.lon };
    if (nameKey) {
      const nameCol = fieldMap[nameKey];
      if (nameCol && r[nameCol]) point.nome = String(r[nameCol]).slice(0, 80);
    }
    out.push(point);
    if (out.length >= max) break;
  }
  return out.length ? out : null;
}

function parseYear(x) {
  if (x === null || x === undefined || x === '') return null;
  let y = null;
  if (typeof x === 'number') {
    // Caso speciale: epoch ms (es. Opendatasoft API ritorna anno come timestamp)
    // 31536000000 ms = ~1 anno; un epoch >1e10 è quasi certamente ms timestamp
    if (x > 1e10) {
      const d = new Date(x);
      if (!isNaN(d)) y = d.getUTCFullYear();
    } else {
      y = Math.floor(x);
    }
  } else {
    const s = String(x).trim();
    // YYYY-MM-DD
    const ymd = s.match(/^(\d{4})-\d{2}-\d{2}/);
    if (ymd) y = parseInt(ymd[1], 10);
    // DD/MM/YYYY
    else {
      const dmy = s.match(/^\d{1,2}\/\d{1,2}\/(\d{4})/);
      if (dmy) y = parseInt(dmy[1], 10);
      // YYYY
      else {
        const yy = s.match(/^(\d{4})$/);
        if (yy) y = parseInt(yy[1], 10);
      }
    }
  }
  if (y === null) return null;
  // Filtra anni fuori range plausibile (es. progressivi 1017 in pratiche Lecce)
  if (y < 1900 || y > 2050) return null;
  return y;
}

function seriesByYear(rows, fieldMap, yearKey, valueKey = null) {
  const yearCol = fieldMap[yearKey];
  if (!yearCol) return null;
  const valCol = valueKey ? fieldMap[valueKey] : null;
  const map = new Map();
  for (const r of rows) {
    const y = parseYear(r[yearCol]);
    if (y === null) continue;
    if (valCol) {
      const v = num(r[valCol]);
      if (v === null) continue;
      map.set(y, (map.get(y) || 0) + v);
    } else {
      map.set(y, (map.get(y) || 0) + 1);
    }
  }
  if (map.size === 0) return null;
  const years = [...map.keys()].sort((a, b) => a - b);
  return years.map(y => ({ anno: y, valore: map.get(y) }));
}

// ─── CORE 1 — Popolazione ─────────────────────────────────────────────────────

export function calc_popolazione(rows, fieldMap) {
  const serieAnni = seriesByYear(rows, fieldMap, 'anno', 'residenti') || seriesByYear(rows, fieldMap, 'anno');
  // totale_residenti = popolazione dell'ultimo anno (non somma di tutti gli anni)
  let totaleResidenti = null;
  if (serieAnni && serieAnni.length > 0) {
    totaleResidenti = serieAnni[serieAnni.length - 1].valore;
  } else {
    // Fallback per dataset senza serie temporale (es. anagrafica per persona)
    totaleResidenti = sumBy(rows, fieldMap, 'residenti') || rows.length;
  }
  return {
    totale_residenti: totaleResidenti,
    serie_anni: serieAnni,
    serie_residenti: null,
    per_quartiere: groupSum(rows, fieldMap, 'quartiere', 'residenti') || countBy(rows, fieldMap, 'quartiere'),
  };
}

// ─── CORE 2 — Bilancio ────────────────────────────────────────────────────────

export function calc_bilancio(rows, fieldMap) {
  const totaleUscite = sumBy(rows, fieldMap, 'importo');
  return {
    totale_uscite: totaleUscite,
    per_missione: groupSum(rows, fieldMap, 'missione', 'importo') || countBy(rows, fieldMap, 'missione'),
    top10_programmi: groupSum(rows, fieldMap, 'programma', 'importo', 10) || countBy(rows, fieldMap, 'programma', 10),
  };
}

// ─── CORE 3 — Opere pubbliche ─────────────────────────────────────────────────

export function calc_opere(rows, fieldMap) {
  const cupCount = fieldMap.cup
    ? rows.filter(r => r[fieldMap.cup] && String(r[fieldMap.cup]).trim()).length
    : null;
  return {
    totale: rows.length,
    per_stato: countBy(rows, fieldMap, 'stato'),
    opere_geo: geoPoints(rows, fieldMap, 'nome', 200),
    cup_count: cupCount,
    importo_totale: sumBy(rows, fieldMap, 'importo'),
    per_fonte: countBy(rows, fieldMap, 'fonte'),
  };
}

// ─── CORE 4 — Pratiche edilizie ───────────────────────────────────────────────

export function calc_pratiche(rows, fieldMap) {
  // Tasso di chiusura: pratiche con chiusura_pratica_data / pratiche con data
  let tassoChiusura = null;
  if (fieldMap.data && fieldMap.chiusura) {
    const conData = rows.filter(r => r[fieldMap.data]).length;
    const conChiusura = rows.filter(r => r[fieldMap.chiusura]).length;
    if (conData > 0) tassoChiusura = (conChiusura / conData) * 100;
  }
  return {
    totale: rows.length,
    per_tipo: countBy(rows, fieldMap, 'tipo'),
    per_esito: countBy(rows, fieldMap, 'esito'),
    tasso_chiusura: tassoChiusura,
    serie_anni: seriesByYear(rows, fieldMap, 'data') || seriesByYear(rows, fieldMap, 'anno_prot'),
  };
}

// ─── CORE 5 — Servizi sociali ─────────────────────────────────────────────────

export function calc_sociali(rows, fieldMap) {
  const spesaTot = sumBy(rows, fieldMap, 'contributo');
  // Utenti unici se disponibile identificativo, altrimenti righe
  let utentiTotali = rows.length;
  if (fieldMap.identificativo) {
    const ids = new Set();
    for (const r of rows) {
      const id = r[fieldMap.identificativo];
      if (id) ids.add(String(id));
    }
    if (ids.size > 0) utentiTotali = ids.size;
  }
  return {
    utenti_totali: utentiTotali,
    per_target: countBy(rows, fieldMap, 'target'),
    per_categoria: countBy(rows, fieldMap, 'categoria'),
    spesa_totale: spesaTot,
    spesa_media: spesaTot !== null && rows.length > 0 ? spesaTot / rows.length : null,
  };
}

// ─── CORE 6 — Istruzione ──────────────────────────────────────────────────────

export function calc_istruzione(rows, fieldMap) {
  const tot = sumBy(rows, fieldMap, 'iscritti');
  return {
    totale_iscritti: tot,
    per_struttura: groupSum(rows, fieldMap, 'struttura', 'iscritti', 30) || countBy(rows, fieldMap, 'struttura', 30),
    per_quartiere: groupSum(rows, fieldMap, 'quartiere', 'iscritti') || countBy(rows, fieldMap, 'quartiere'),
    serie_anni: seriesByYear(rows, fieldMap, 'anno', 'iscritti') || seriesByYear(rows, fieldMap, 'anno'),
  };
}

// ─── CORE 7 — Incidenti stradali ──────────────────────────────────────────────

export function calc_incidenti(rows, fieldMap) {
  const totMorti = sumBy(rows, fieldMap, 'n_morti');
  const totFeriti = sumBy(rows, fieldMap, 'n_feriti');
  const totIncidenti = sumBy(rows, fieldMap, 'n_incidenti');

  // Vittime vulnerabili: pedoni + ciclisti (M + F) se le colonne ci sono
  let vittimeVulnerabili = null;
  const cols = ['n_pedoni_m', 'n_pedoni_f', 'n_cicl_m', 'n_cicl_f'];
  const sums = cols.map(c => sumBy(rows, fieldMap, c)).filter(v => v !== null);
  if (sums.length > 0) vittimeVulnerabili = sums.reduce((a, b) => a + b, 0);

  return {
    totale_anno: totIncidenti !== null ? totIncidenti : rows.length,
    totale_morti: totMorti,
    totale_feriti: totFeriti,
    per_zona: groupSum(rows, fieldMap, 'zona', 'n_incidenti') || countBy(rows, fieldMap, 'zona'),
    hot_spots: geoPoints(rows, fieldMap, null, 500),
    vittime_vulnerabili: vittimeVulnerabili,
  };
}

// ─── CORE 8 — Rifiuti ─────────────────────────────────────────────────────────

export function calc_rifiuti(rows, fieldMap) {
  // RD% ultimo anno: prendo la riga con anno massimo
  let rdUltimo = null;
  let annoUltimo = null;
  if (fieldMap.anno && fieldMap.rd_pct) {
    let maxYear = -Infinity;
    let maxValue = null;
    for (const r of rows) {
      const y = parseYear(r[fieldMap.anno]);
      const v = num(r[fieldMap.rd_pct]);
      if (y !== null && v !== null && y > maxYear) {
        maxYear = y;
        maxValue = v;
      }
    }
    if (maxValue !== null) {
      rdUltimo = maxValue;
      annoUltimo = maxYear;
    }
  }
  // Serie temporale RD% per anno
  let serieAnni = null;
  if (fieldMap.anno && fieldMap.rd_pct) {
    const tmp = [];
    for (const r of rows) {
      const y = parseYear(r[fieldMap.anno]);
      const v = num(r[fieldMap.rd_pct]);
      if (y !== null && v !== null) tmp.push({ anno: y, valore: v });
    }
    if (tmp.length > 0) {
      tmp.sort((a, b) => a.anno - b.anno);
      serieAnni = tmp;
    }
  }
  // Per quartiere: media degli ultimi 3 anni se ci sono colonne rd_centro, rd_savena ecc
  let perQuartiere = null;
  const quartCols = ['rd_centro', 'rd_savena', 'rd_navile', 'rd_borgo', 'rd_porto', 'rd_santo', 'rd_sandonato'];
  const quartLabels = ['Centro Storico', 'Savena', 'Navile', 'Borgo Panigale-Reno', 'Porto-Saragozza', 'Santo Stefano', 'San Donato-San Vitale'];
  const quartData = [];
  for (let i = 0; i < quartCols.length; i++) {
    if (fieldMap[quartCols[i]]) {
      // Prendi valore dell'ultimo anno disponibile
      let bestYear = -Infinity, bestVal = null;
      for (const r of rows) {
        const y = parseYear(r[fieldMap.anno]);
        const v = num(r[fieldMap[quartCols[i]]]);
        if (y !== null && v !== null && y > bestYear) {
          bestYear = y;
          bestVal = v;
        }
      }
      if (bestVal !== null) quartData.push({ nome: quartLabels[i], valore: bestVal });
    }
  }
  if (quartData.length > 0) perQuartiere = quartData;

  // Trend % (variazione tra primo e ultimo anno)
  let trendPct = null;
  if (serieAnni && serieAnni.length >= 2) {
    const first = serieAnni[0].valore;
    const last = serieAnni[serieAnni.length - 1].valore;
    if (first > 0) trendPct = ((last - first) / first) * 100;
  }

  return {
    rd_pct_ultimo_anno: rdUltimo !== null ? { anno: annoUltimo, valore: rdUltimo } : null,
    serie_anni: serieAnni,
    per_quartiere: perQuartiere,
    trend_pct: trendPct,
  };
}

// ─── CORE 9 — Eventi culturali ────────────────────────────────────────────────

export function calc_eventi(rows, fieldMap) {
  // Per categoria: countBy su categoria principale
  const perCat = countBy(rows, fieldMap, 'categoria', 15);

  // % online
  let pctOnline = null;
  if (fieldMap.online) {
    const tot = rows.length;
    const onlineCount = rows.filter(r => {
      const v = r[fieldMap.online];
      return v === true || String(v).toLowerCase() === 'true' || v === 1 || v === '1';
    }).length;
    if (tot > 0) pctOnline = (onlineCount / tot) * 100;
  }

  return {
    totale_anno: rows.length,
    per_categoria: perCat,
    per_quartiere: countBy(rows, fieldMap, 'quartiere'),
    eventi_geo: geoPoints(rows, fieldMap, 'titolo', 300),
    pct_online: pctOnline,
  };
}

// ─── CORE 10 — Delibere ───────────────────────────────────────────────────────

export function calc_delibere(rows, fieldMap) {
  return {
    totale_anno: rows.length,
    per_tipo: countBy(rows, fieldMap, 'tipo'),
    serie_anni: seriesByYear(rows, fieldMap, 'data'),
  };
}

// ─── CORE 11 — Patrimonio ─────────────────────────────────────────────────────

export function calc_patrimonio(rows, fieldMap) {
  let pctVincolo = null;
  if (fieldMap.vincolo) {
    const tot = rows.length;
    const conVincolo = rows.filter(r => {
      const v = r[fieldMap.vincolo];
      return v === true || String(v).toLowerCase() === 'true' || (v && String(v).trim() && String(v).toLowerCase() !== 'no');
    }).length;
    if (tot > 0) pctVincolo = (conVincolo / tot) * 100;
  }
  return {
    totale_immobili: rows.length,
    per_tipo: countBy(rows, fieldMap, 'tipo'),
    immobili_geo: geoPoints(rows, fieldMap, null, 500),
    pct_vincolo: pctVincolo,
  };
}

// Lookup table esposta al builder
export const CALCULATORS = {
  calc_popolazione, calc_bilancio, calc_opere, calc_pratiche,
  calc_sociali, calc_istruzione, calc_incidenti, calc_rifiuti,
  calc_eventi, calc_delibere, calc_patrimonio,
};
