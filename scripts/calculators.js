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
  // Opendatasoft espone le coordinate come singolo campo geo_point: {lat, lon}
  // (es. Bologna ODS dataset progetto-dae). Cerchiamo geo_point/geo_point_2d/pin_point/coordinate
  const pinCol = fieldMap.geo_point || fieldMap.pin_point || fieldMap.coordinate;
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
  // Caso speciale: bilancio demografico MENSILE (es. Lecce 2019 - 12 righe).
  // Se c'è anche la colonna 'mese', non possiamo sommare i valori per anno
  // (95181 + 95270 + ... = numero falso). Per ogni anno prendiamo l'ULTIMO
  // mese disponibile come "popolazione di fine anno", che è il dato di stock
  // semanticamente corretto.
  let serieAnni;
  const meseCol = fieldMap.mese;
  const annoCol = fieldMap.anno;
  const resCol = fieldMap.residenti;
  if (meseCol && annoCol && resCol) {
    // Mappa anno → {ultimoMese, valore}
    const MESI_ORD = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    const meseOrd = (v) => {
      if (v == null) return -1;
      const s = String(v).toLowerCase().trim();
      const idx = MESI_ORD.indexOf(s);
      if (idx >= 0) return idx;
      const n = parseInt(s, 10);
      if (!isNaN(n) && n >= 1 && n <= 12) return n - 1;
      return -1;
    };
    const map = new Map();
    for (const r of rows) {
      const y = parseYear(r[annoCol]);
      if (y === null) continue;
      const m = meseOrd(r[meseCol]);
      if (m < 0) continue;
      const v = num(r[resCol]);
      if (v === null) continue;
      const cur = map.get(y);
      if (!cur || m > cur.mese) map.set(y, { mese: m, valore: v });
    }
    if (map.size > 0) {
      const years = [...map.keys()].sort((a, b) => a - b);
      serieAnni = years.map(y => ({ anno: y, valore: map.get(y).valore }));
    }
  }
  // Caso normale: una riga per anno, somma per anno (vecchio comportamento)
  if (!serieAnni) {
    serieAnni = seriesByYear(rows, fieldMap, 'anno', 'residenti') || seriesByYear(rows, fieldMap, 'anno');
  }
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

  // Serie temporale: scarto l'ultimo anno se è palesemente parziale.
  // Caso reale Bologna: il dataset è fermo a fine 2025, ma siamo nel 2026 →
  // il 2025 risulta apparentemente "ultimo anno" e crollerebbe il grafico se
  // contasse solo 2093 record vs media ~5000/anno. Scartiamo l'ultimo anno
  // se ha meno della metà della media degli ultimi 3 anni precedenti.
  let serieAnni = seriesByYear(rows, fieldMap, 'data') || seriesByYear(rows, fieldMap, 'anno_prot');
  if (serieAnni && serieAnni.length >= 4) {
    const last = serieAnni[serieAnni.length - 1];
    const prev3 = serieAnni.slice(-4, -1);
    const media = prev3.reduce((s, x) => s + (x.valore || 0), 0) / prev3.length;
    if (media > 0 && last.valore < media * 0.5) {
      // Ultimo anno parziale, lo tronco
      serieAnni = serieAnni.slice(0, -1);
    }
  }

  return {
    totale: rows.length,
    per_tipo: countBy(rows, fieldMap, 'tipo'),
    per_esito: countBy(rows, fieldMap, 'esito'),
    tasso_chiusura: tassoChiusura,
    serie_anni: serieAnni,
  };
}

// ─── CORE 5 — Servizi sociali ─────────────────────────────────────────────────

export function calc_sociali(rows, fieldMap) {
  const spesaTot = sumBy(rows, fieldMap, 'contributo');

  // CASO welfare aggregato server-side: il dataset ha SNAPSHOT periodici
  // (es. "2019 dicembre", "2024 marzo") — sommare tutti i periodi gonfia
  // il dato. Prendiamo SOLO l'ultimo snapshot disponibile.
  let workRows = rows;
  if (fieldMap.utenti && fieldMap.anno_periodo) {
    const annoCol = fieldMap.anno_periodo;
    // Estraggo l'anno (4 cifre) dalla stringa periodo
    const periodOfRow = (r) => {
      const v = String(r[annoCol] || '');
      const m = v.match(/(\d{4})/);
      return m ? parseInt(m[1], 10) * 100 + (
        // mese da nome italiano
        ({ gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12 })[
          v.toLowerCase().split(/\s+/).find(w => /^[a-z]+$/.test(w)) || ''
        ] || 99
      ) : 0;
    };
    const periods = rows.map(r => periodOfRow(r));
    const maxP = Math.max(...periods);
    if (maxP > 0) {
      workRows = rows.filter((r, i) => periods[i] === maxP);
    }
  }

  // utenti_totali: se aggregato (campo utenti presente), somma; altrimenti count distinct
  let utentiTotali;
  if (fieldMap.utenti) {
    utentiTotali = sumBy(workRows, fieldMap, 'utenti') || workRows.length;
  } else if (fieldMap.identificativo) {
    const ids = new Set();
    for (const r of workRows) {
      const id = r[fieldMap.identificativo];
      if (id) ids.add(String(id));
    }
    utentiTotali = ids.size > 0 ? ids.size : workRows.length;
  } else {
    utentiTotali = workRows.length;
  }

  // per_categoria
  let perCategoria;
  if (fieldMap.categoria && fieldMap.utenti) {
    perCategoria = groupSum(workRows, fieldMap, 'categoria', 'utenti');
  } else {
    perCategoria = countBy(workRows, fieldMap, 'categoria');
  }

  return {
    utenti_totali: utentiTotali,
    per_target: countBy(workRows, fieldMap, 'target'),
    per_categoria: perCategoria,
    spesa_totale: spesaTot,
    spesa_media: spesaTot !== null && workRows.length > 0 ? spesaTot / workRows.length : null,
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
    hot_spots: geoPoints(rows, fieldMap, null, 5000),
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

// ─── CORE 12 — Tributi ────────────────────────────────────────────────────────

export function calc_tributi(rows, fieldMap) {
  // Estraggo anno di ogni riga
  const annoCol = fieldMap.anno;
  const tributoCol = fieldMap.tributo;
  const gettitoCol = fieldMap.gettito_euro;
  const contribCol = fieldMap.n_contribuenti;

  const num = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[€\s]/g, '').replace(',', '.');
    const f = parseFloat(s);
    return isNaN(f) ? 0 : f;
  };

  const anni = [...new Set(rows.map(r => parseInt(annoCol ? r[annoCol] : 0) || 0).filter(a => a > 1900))];
  const annoUltimo = anni.length ? Math.max(...anni) : null;
  const ultime = annoUltimo && annoCol ? rows.filter(r => parseInt(r[annoCol]) === annoUltimo) : [];

  // Aggregazione per tributo
  const perTributoMap = {};
  for (const r of ultime) {
    const t = ((tributoCol ? r[tributoCol] : 'ALTRO') || 'ALTRO').toString().toUpperCase();
    perTributoMap[t] = (perTributoMap[t] || 0) + (gettitoCol ? num(r[gettitoCol]) : 0);
  }
  const per_tributo_ultimo_anno = Object.entries(perTributoMap)
    .map(([nome, valore]) => ({ nome, valore }))
    .sort((a, b) => b.valore - a.valore);

  // Serie storica
  const perAnnoMap = {};
  for (const r of rows) {
    if (!annoCol) continue;
    const a = parseInt(r[annoCol]);
    if (!a) continue;
    perAnnoMap[a] = (perAnnoMap[a] || 0) + (gettitoCol ? num(r[gettitoCol]) : 0);
  }
  const serie_anni = Object.entries(perAnnoMap)
    .map(([anno, valore]) => ({ anno: parseInt(anno), valore }))
    .sort((a, b) => a.anno - b.anno);

  return {
    gettito_totale_ultimo_anno: ultime.reduce((s, r) => s + (gettitoCol ? num(r[gettitoCol]) : 0), 0),
    anno_ultimo: annoUltimo,
    n_tributi_distinti: per_tributo_ultimo_anno.length,
    per_tributo_ultimo_anno,
    serie_anni,
    contribuenti_ultimo_anno: ultime.reduce((s, r) => s + (contribCol ? (parseInt(r[contribCol]) || 0) : 0), 0) || null,
  };
}

// ─── CORE 13 — Defibrillatori (DAE) ─────────────────────────────────────────
// Bologna ODS progetto-dae (5060 record, filtra per citta=BOLOGNA)
// Lecce Google Sheets fixture (113 record)
export function calc_defibrillatori(rows, fieldMap) {
  // Filtro Bologna: tieni solo i DAE nel territorio comunale
  // Il dataset Bologna è regionale e include "FUORI BOLOGNA"
  const comuneCol = fieldMap.comune;
  let filteredRows = rows;
  if (comuneCol) {
    const hasFuori = rows.some(r => {
      const c = r[comuneCol];
      return c && String(c).toUpperCase().trim() === 'BOLOGNA';
    });
    if (hasFuori) {
      filteredRows = rows.filter(r => {
        const c = r[comuneCol];
        return c && String(c).toUpperCase().trim() === 'BOLOGNA';
      });
    }
  }

  const h24Col = fieldMap.accessibile_h24;
  let h24Count = 0;
  if (h24Col) {
    h24Count = filteredRows.filter(r => {
      const v = r[h24Col];
      if (!v) return false;
      const s = String(v).toLowerCase().trim();
      // Caso 1: flag esplicito (Comune Ideale, Lecce nelle colonne dedicate)
      if (s === 'si' || s === 'sì' || s === 'true' || s === '1' ||
          s.includes('h24') || s.includes('24/24') || s.includes('24 ore')) {
        return true;
      }
      // Caso 2: stringa orari Bologna ODS (es. "{'LUNEDI':'00:00-23:59',...}")
      // Se TUTTI i giorni della settimana hanno orario completo 00:00-23:59
      if (s.includes('00:00-23:59') || s.includes('00.00-23.59')) {
        // Conta i giorni con range 24h
        const matches = s.match(/00:00-23:59|00\.00-23\.59/g);
        if (matches && matches.length >= 7) return true;
      }
      return false;
    }).length;
  }

  return {
    totale: filteredRows.length,
    h24_count: h24Count,
    h24_pct: filteredRows.length > 0 ? Math.round((h24Count / filteredRows.length) * 1000) / 10 : null,
    dae_geo: geoPoints(filteredRows, fieldMap, 'nome', 500),
    per_quartiere: countBy(filteredRows, fieldMap, 'quartiere'),
  };
}

// ─── CORE 14 — Parcheggi pubblici ────────────────────────────────────────────
// Bologna ODS parcheggi-strutture (44 record)
// Lecce: GeoJSON HTTP geo-fenced, presente: false
export function calc_parcheggi(rows, fieldMap) {
  const stalliCol = fieldMap.stalli;
  const disabiliCol = fieldMap.posti_disabili;
  const tariffaCol = fieldMap.tariffa_oraria;

  const num = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[€\s]/g, '').replace(',', '.');
    const f = parseFloat(s);
    return isNaN(f) ? 0 : f;
  };

  const totaleStalli = stalliCol ? rows.reduce((s, r) => s + num(r[stalliCol]), 0) : 0;
  const totaleDisabili = disabiliCol ? rows.reduce((s, r) => s + num(r[disabiliCol]), 0) : 0;

  // Tariffa: per Bologna è una stringa "abbonamento"/"pagamento"/"libero", non un numero.
  // Per Comune Ideale è numerica. Tento parse, se fallisce calcolo % gratuiti per testo.
  let tariffaMedia = null;
  let pctGratuiti = null;
  if (tariffaCol) {
    const numericTariffe = rows
      .map(r => num(r[tariffaCol]))
      .filter(v => v > 0);
    if (numericTariffe.length > 0) {
      tariffaMedia = Math.round((numericTariffe.reduce((a, b) => a + b, 0) / numericTariffe.length) * 100) / 100;
    }
    // % gratuiti: 0 numerico OPPURE testo che contiene "libero"/"gratuito"/"free"
    const gratuiti = rows.filter(r => {
      const v = r[tariffaCol];
      if (v == null || v === '') return false;
      const numV = num(v);
      if (numV === 0 && String(v).trim() !== '0') {
        const s = String(v).toLowerCase();
        return s.includes('libero') || s.includes('gratuit') || s.includes('free');
      }
      return numV === 0;
    }).length;
    pctGratuiti = rows.length > 0 ? Math.round((gratuiti / rows.length) * 1000) / 10 : null;
  }

  return {
    totale: rows.length,
    totale_stalli: totaleStalli,
    totale_disabili: totaleDisabili,
    tariffa_media: tariffaMedia,
    pct_gratuiti: pctGratuiti,
    per_tipo: countBy(rows, fieldMap, 'tipo_parcheggio'),
    per_quartiere: countBy(rows, fieldMap, 'quartiere'),
    parcheggi_geo: geoPoints(rows, fieldMap, 'nome', 500),
  };
}

// ─── CORE 15 — Strutture ricettive ────────────────────────────────────────────

/**
 * Normalizza il valore "tipologia" verso un set canonico stabile, indipendente
 * da come ciascun Comune scrive la categoria nei suoi dati grezzi (Bologna usa
 * "Strutture alberghiere"/"Altre tipologie ricettive"/"Agriturismi", Lecce usa
 * "ALBERGO"/"CASE E APPARTAMENTI PER VACANZA"/"B&B" o stringhe miste).
 * Se non riconosce il valore lo restituisce in lowercase grezzo (verrà
 * mostrato così com'è nel grafico per tipologia).
 */
function normalizeTipologiaRicettiva(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim();
  if (!s) return null;
  // B&B, Bed and Breakfast, Bed-Breakfast
  if (s.includes('b&b') || s.includes('b & b') || (s.includes('bed') && s.includes('breakfast'))) return 'bed_and_breakfast';
  // Albergo / Hotel / Strutture alberghiere
  if (s.includes('alberg') || s.includes('hotel')) return 'albergo';
  // Casa vacanza / Case appartamenti per vacanza / Locazione turistica
  if (s.includes('casa vacanz') || s.includes('case vacanz') || s.includes('appartament') || s.includes('locazion')) return 'casa_vacanza';
  // Affittacamere
  if (s.includes('affittacamer')) return 'affittacamere';
  // Agriturismo / Fattoria didattica
  if (s.includes('agritur') || s.includes('fattoria')) return 'agriturismo';
  // Ostello
  if (s.includes('ostell')) return 'ostello';
  // Residence / Residenza turistica
  if (s.includes('residenc') || s.includes('residenz')) return 'residence';
  // Campeggio
  if (s.includes('campegg') || s.includes('campsit') || s.includes('camping')) return 'campeggio';
  return s;
}

export function calc_strutture_ricettive(rows, fieldMap) {
  const stato = fieldMap.stato;
  const tipologia = fieldMap.tipologia;
  const postiCol = fieldMap.posti_letto;
  const tariffaMinCol = fieldMap.tariffa_min;

  const numLocal = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/[€\s]/g, '').replace(',', '.');
    const f = parseFloat(s);
    return isNaN(f) ? 0 : f;
  };

  // Una struttura è "attiva" se manca lo stato (default: assumiamo attiva)
  // o se lo stato è esplicitamente ATTIVO/ACTIVE/AVVIO (esito SUAP positivo).
  // Esclusi: CESSATO, REVOCATO, CHIUSO, IRRICEVIBILE, RIFIUTATO.
  const isAttiva = (r) => {
    if (!stato) return true;
    const v = r[stato];
    if (v == null || v === '') return true;
    const s = String(v).toLowerCase().trim();
    if (s.includes('cessat') || s.includes('revocat') || s.includes('chiuso')
        || s.includes('chiusa') || s.includes('irricevibil') || s.includes('rifiut')
        || s.includes('annull') || s.includes('negativa')) return false;
    return true;
  };

  const totale = rows.length;
  const attive = rows.filter(isAttiva);
  const totaleAttive = attive.length;

  // Posti letto: somma sulle sole strutture attive
  const totalePostiLetto = postiCol
    ? attive.reduce((s, r) => s + numLocal(r[postiCol]), 0)
    : 0;

  // Tariffa media min sulle strutture attive che hanno tariffa > 0
  let tariffaMediaMin = null;
  if (tariffaMinCol) {
    const tariffe = attive
      .map(r => numLocal(r[tariffaMinCol]))
      .filter(v => v > 0);
    if (tariffe.length > 0) {
      tariffaMediaMin = Math.round((tariffe.reduce((a, b) => a + b, 0) / tariffe.length) * 100) / 100;
    }
  }

  // Aggregazione per tipologia normalizzata (solo strutture attive)
  let perTipologia = null;
  if (tipologia) {
    const counts = new Map();
    for (const r of attive) {
      const norm = normalizeTipologiaRicettiva(r[tipologia]);
      if (!norm) continue;
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
    perTipologia = [...counts.entries()]
      .map(([nome, n]) => ({ nome, n }))
      .sort((a, b) => b.n - a.n);
  }

  return {
    totale,
    totale_attive: totaleAttive,
    totale_posti_letto: totalePostiLetto,
    tariffa_media_min: tariffaMediaMin,
    per_tipologia: perTipologia,
    per_quartiere: countBy(attive, fieldMap, 'quartiere'),
    ricettive_geo: geoPoints(attive, fieldMap, 'denominazione', 500),
  };
}

// Lookup table esposta al builder
export const CALCULATORS = {
  calc_popolazione, calc_bilancio, calc_opere, calc_pratiche,
  calc_sociali, calc_istruzione, calc_incidenti, calc_rifiuti,
  calc_eventi, calc_delibere, calc_patrimonio, calc_tributi,
  calc_defibrillatori, calc_parcheggi, calc_strutture_ricettive,
};
