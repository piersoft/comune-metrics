#!/usr/bin/env python3
"""
ComuneMetrics — Build orchestrator.

Legge config/comuni.yml + config/metrics.yml.
Per ogni Comune × Dataset CORE cablato:
  1. Recupera metadata via dati.gov.it CKAN API (package_show)
  2. Risolve URL della miglior risorsa (preferenza: JSON > CSV > altre)
  3. Scarica il file con timeout
  4. Lo parsifica in pandas DataFrame
  5. Mappa colonne CSV → canonical names usando expected_fields (sinonimi)
  6. Chiama il calculator corrispondente
  7. Salva tutto in data/dashboard.json + data/comuni/<key>.json

Robustezza:
  - Ogni dataset è indipendente: errore in uno non blocca gli altri
  - In caso di fetch fallito, il dataset risulta "fetch_error" nel JSON
  - In caso di parsing fallito, "parse_error"
  - Gracefully gestisce CSV con separatori diversi (auto-detect via pandas)

Uscita: data/dashboard.json (un file unico, ~50-200 KB stimati).
"""
from __future__ import annotations
import io
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

import pandas as pd
import requests
import yaml

# Path assoluti (script eseguito dalla root del repo)
ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT / "config"
DATA_DIR = ROOT / "data"
COMUNI_DIR = DATA_DIR / "comuni"
SCRIPTS_DIR = ROOT / "scripts"

sys.path.insert(0, str(SCRIPTS_DIR))
from calculators import CALCULATORS  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("build")

USER_AGENT = "ComuneMetrics-Builder/0.1 (+https://github.com/piersoft/comune-metrics)"
HTTP_TIMEOUT = 30  # secondi
MAX_BYTES = 50 * 1024 * 1024  # 50 MB max per CSV (sicurezza)

# Proxy fallback per superare blocchi WAF su IP cloud (Azure/GitHub Actions).
# Ordine di preferenza: tentativo diretto, poi proxy pubblico come fallback.
# allorigins.win è verificato funzionante per dati.gov.it.
# (corsproxy.io testato ma anch'esso bloccato dal WAF di dati.gov.it.)
PROXY_CHAIN = [
    None,  # Diretto, prima scelta
    "https://api.allorigins.win/raw?url={url}",
]

# User-Agent rotation: alcuni WAF preferiscono UA diversi
USER_AGENTS = [
    "ComuneMetrics-Builder/0.1 (+https://github.com/piersoft/comune-metrics)",
    "Mozilla/5.0 (compatible; ComuneMetricsBot/0.1; +https://github.com/piersoft/comune-metrics)",
    "ckanapi/4.7",
    "curl/7.88.1",
]


# =================== HTTP helpers ===================

def http_get(url: str, accept: str = "*/*") -> Optional[bytes]:
    """
    GET con timeout, size cap, retry chain di proxy e UA rotation.

    Strategia: prova prima il fetch diretto con UA principale, poi rotazione UA,
    poi proxy pubblici come ultima risorsa. Stop al primo 200 OK.

    NB: il WAF di dati.gov.it (awselb/2.0) si comporta in modo curioso:
    rifiuta UA "Mozilla/...Chrome..." da IP cloud ma accetta UA identificativi
    di crawler/script. Headers Accept-Encoding presenti sembrano aiutare.
    """
    from urllib.parse import quote

    # Header base per tutti i tentativi
    base_headers = {
        "Accept": accept,
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    }

    last_error = None
    for proxy_template in PROXY_CHAIN:
        for ua in USER_AGENTS:
            try:
                headers = {**base_headers, "User-Agent": ua}
                if proxy_template is None:
                    fetch_url = url
                    log_label = "direct"
                else:
                    fetch_url = proxy_template.format(url=quote(url, safe=""))
                    log_label = proxy_template.split("/")[2]
                log.info(f"  GET [{log_label}|{ua.split('/')[0][:20]}] {url[:80]}...")
                with requests.get(
                    fetch_url,
                    headers=headers,
                    timeout=HTTP_TIMEOUT,
                    stream=True,
                ) as r:
                    if r.status_code in (403, 429):
                        last_error = f"{r.status_code} ({log_label}|{ua[:30]})"
                        continue  # prova prossimo UA / proxy
                    r.raise_for_status()
                    content = b""
                    for chunk in r.iter_content(chunk_size=64 * 1024):
                        content += chunk
                        if len(content) > MAX_BYTES:
                            log.warning(f"  ⚠ Truncated at {MAX_BYTES} bytes")
                            break
                    return content
            except requests.exceptions.RequestException as e:
                last_error = str(e)[:100]
                continue

    log.warning(f"  ✗ HTTP error (tutti i fallback falliti): {last_error}")
    return None


def fetch_package(ckan_server: str, slug: str) -> Optional[dict]:
    """Recupera metadata pacchetto via CKAN API."""
    url = f"{ckan_server}/api/3/action/package_show?id={slug}"
    raw = http_get(url, accept="application/json")
    if not raw:
        return None
    try:
        body = json.loads(raw)
        if not body.get("success"):
            log.warning(f"  ✗ CKAN response success=false")
            return None
        return body["result"]
    except (json.JSONDecodeError, KeyError) as e:
        log.warning(f"  ✗ JSON parse error: {e}")
        return None


def pick_best_resource(resources: list[dict]) -> Optional[dict]:
    """Sceglie la miglior risorsa. Priorità: JSON > CSV > XLS."""
    if not resources:
        return None
    priority = {"JSON": 1, "CSV": 2, "XLS": 3, "XLSX": 3}
    sorted_res = sorted(
        resources,
        key=lambda r: priority.get((r.get("format") or "").upper(), 99),
    )
    return sorted_res[0] if sorted_res else None


# =================== Parsing ===================

def parse_data(content: bytes, fmt: str) -> Optional[pd.DataFrame]:
    """Parsifica bytes in DataFrame. fmt: 'JSON' | 'CSV' | 'XLS' | ..."""
    fmt = (fmt or "").upper()
    try:
        if fmt == "JSON":
            try:
                obj = json.loads(content)
            except json.JSONDecodeError:
                # JSONL: una riga per record
                return pd.read_json(io.BytesIO(content), lines=True)
            if isinstance(obj, list):
                return pd.DataFrame(obj)
            if isinstance(obj, dict):
                # Struttura tipo {records: [...]} o {result: {records: [...]}}
                for key in ("records", "results", "data"):
                    if key in obj and isinstance(obj[key], list):
                        return pd.DataFrame(obj[key])
                return pd.DataFrame([obj])
            return None
        elif fmt == "CSV":
            # Auto-detect separator (Bologna ;, Lecce ,, Firenze misto)
            text = content.decode("utf-8", errors="replace")
            for sep in [";", ",", "\t", "|"]:
                try:
                    df = pd.read_csv(io.StringIO(text), sep=sep, low_memory=False)
                    if df.shape[1] > 1:  # almeno 2 colonne = sep giusto
                        return df
                except Exception:
                    continue
            return pd.read_csv(io.StringIO(text), sep=None, engine="python")
        elif fmt in ("XLS", "XLSX"):
            return pd.read_excel(io.BytesIO(content))
        else:
            log.warning(f"  ✗ Unsupported format: {fmt}")
            return None
    except Exception as e:
        log.warning(f"  ✗ Parse error ({fmt}): {e}")
        return None


# =================== Field mapping ===================

def map_fields(df_columns: list[str], expected_fields: dict) -> dict:
    """
    Per ogni canonical name in expected_fields, trova il nome di colonna
    corrispondente nel df. Match case-insensitive e whitespace-tolerant.
    """
    norm_cols = {c.strip().lower(): c for c in df_columns}
    field_map = {}
    for canonical, synonyms in expected_fields.items():
        found = None
        for syn in synonyms:
            if syn.strip().lower() in norm_cols:
                found = norm_cols[syn.strip().lower()]
                break
        field_map[canonical] = found
    return field_map


# =================== Freshness ===================

def freshness_label(modified_iso: Optional[str]) -> dict:
    """Calcola livello (fresh|aged|stale) e mesi di anzianità."""
    if not modified_iso:
        return {"level": "unknown", "months": None, "iso": None}
    try:
        # Strip eventuale timezone Z
        modified = datetime.fromisoformat(modified_iso.replace("Z", "+00:00"))
        if modified.tzinfo is None:
            modified = modified.replace(tzinfo=timezone.utc)
    except ValueError:
        return {"level": "unknown", "months": None, "iso": modified_iso}
    now = datetime.now(timezone.utc)
    months = (now.year - modified.year) * 12 + (now.month - modified.month)
    if months <= 12:
        level = "fresh"
    elif months <= 36:
        level = "aged"
    else:
        level = "stale"
    return {"level": level, "months": months, "iso": modified_iso}


# =================== Main loop ===================

def process_dataset(
    comune_key: str,
    ds_key: str,
    slug: str,
    metric_cfg: dict,
    ckan_server: str,
) -> dict:
    """Processa un singolo dataset di un Comune."""
    log.info(f"[{comune_key}] {ds_key} → {slug}")
    out = {
        "dataset_key": ds_key,
        "slug": slug,
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "status": "ok",
        "modified": None,
        "freshness": {"level": "unknown", "months": None, "iso": None},
        "n_rows": None,
        "fields_expected": list(metric_cfg.get("expected_fields", {}).keys()),
        "fields_present": None,
        "fields_missing": None,
        "metrics": None,
        "resource_url": None,
        "resource_format": None,
        "error": None,
    }

    pkg = fetch_package(ckan_server, slug)
    if not pkg:
        out["status"] = "fetch_error"
        out["error"] = "package_show failed"
        return out

    out["modified"] = pkg.get("modified") or pkg.get("metadata_modified")
    out["freshness"] = freshness_label(out["modified"])

    res = pick_best_resource(pkg.get("resources", []))
    if not res:
        out["status"] = "no_resources"
        out["error"] = "Pacchetto senza risorse scaricabili"
        return out

    out["resource_url"] = res.get("url")
    out["resource_format"] = res.get("format")

    raw = http_get(res["url"])
    if raw is None:
        out["status"] = "fetch_error"
        out["error"] = f"Download fallito ({res['format']})"
        # Riempio comunque con stub null per i KPI attesi
        calc_name = metric_cfg.get("calculator")
        out["metrics"] = {k: None for k in metric_cfg.get("kpi", [])}
        return out

    df = parse_data(raw, res.get("format", ""))
    if df is None or df.empty:
        out["status"] = "parse_error"
        out["error"] = "Dataset vuoto o non parsabile"
        out["metrics"] = {k: None for k in metric_cfg.get("kpi", [])}
        return out

    out["n_rows"] = int(len(df))

    # Mappa colonne CSV → canonical
    field_map = map_fields(list(df.columns), metric_cfg.get("expected_fields", {}))
    out["fields_present"] = [k for k, v in field_map.items() if v is not None]
    out["fields_missing"] = [k for k, v in field_map.items() if v is None]

    # Chiama il calculator
    calc_name = metric_cfg.get("calculator")
    calc_fn = CALCULATORS.get(calc_name)
    if calc_fn is None:
        out["status"] = "no_calculator"
        out["error"] = f"Calculator '{calc_name}' non trovato"
        return out

    try:
        out["metrics"] = calc_fn(df, field_map)
    except Exception as e:
        log.warning(f"  ✗ Calculator error: {e}")
        out["status"] = "calc_error"
        out["error"] = str(e)
        out["metrics"] = {k: None for k in metric_cfg.get("kpi", [])}

    log.info(f"  ✓ rows={out['n_rows']} fresh={out['freshness']['level']} "
             f"present={len(out['fields_present'])} missing={len(out['fields_missing'])}")
    return out


def main():
    log.info("=== ComuneMetrics builder start ===")

    # Carica config
    with (CONFIG_DIR / "comuni.yml").open() as f:
        comuni_cfg = yaml.safe_load(f)
    with (CONFIG_DIR / "metrics.yml").open() as f:
        metrics_cfg = yaml.safe_load(f)

    ckan_server = comuni_cfg.get("ckan_server", "https://www.dati.gov.it/opendata")
    log.info(f"CKAN server: {ckan_server}")

    DATA_DIR.mkdir(exist_ok=True)
    COMUNI_DIR.mkdir(exist_ok=True)

    dashboard = {
        "version": "0.2.0-alpha",
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ckan_server": ckan_server,
        "comuni": {},
    }

    for comune_key, comune in comuni_cfg.get("comuni", {}).items():
        log.info(f"\n=== Comune: {comune_key} ({comune.get('nome')}) ===")
        comune_out = {
            "key": comune_key,
            "nome": comune.get("nome"),
            "ipa": comune.get("ipa"),
            "istat": comune.get("istat"),
            "popolazione_attesa": comune.get("popolazione_attesa"),
            "mandato": comune.get("mandato"),
            "sindaco": comune.get("sindaco"),
            "mappa_center": comune.get("mappa_center"),
            "mappa_zoom": comune.get("mappa_zoom"),
            "datasets": {},
        }

        for ds_key, slug in comune.get("datasets", {}).items():
            metric_cfg = metrics_cfg.get("datasets", {}).get(ds_key, {})
            if not slug:
                comune_out["datasets"][ds_key] = {
                    "dataset_key": ds_key,
                    "slug": None,
                    "status": "not_published",
                    "fields_expected": list(metric_cfg.get("expected_fields", {}).keys()),
                    "metrics": {k: None for k in metric_cfg.get("kpi", [])},
                }
                continue
            comune_out["datasets"][ds_key] = process_dataset(
                comune_key, ds_key, slug, metric_cfg, ckan_server
            )

        # Scrivo file per Comune (per non gonfiare dashboard.json)
        out_path = COMUNI_DIR / f"{comune_key}.json"
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(comune_out, f, ensure_ascii=False, indent=2)
        log.info(f"→ {out_path.relative_to(ROOT)}")

        # Nel dashboard.json metto solo summary del Comune (per liste/header)
        dashboard["comuni"][comune_key] = {
            "key": comune_key,
            "nome": comune_out["nome"],
            "ipa": comune_out["ipa"],
            "n_datasets_pubblicati": sum(
                1 for d in comune_out["datasets"].values()
                if d.get("status") not in ("not_published", None)
            ),
            "n_datasets_totali": len(comune_out["datasets"]),
        }

    # Scrivo dashboard.json di indice
    out_path = DATA_DIR / "dashboard.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)
    log.info(f"\n=== ✓ Build completata → {out_path.relative_to(ROOT)} ===")


if __name__ == "__main__":
    main()
