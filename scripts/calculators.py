"""
ComuneMetrics — Calcolatori di metriche per Dataset CORE.

Ogni funzione `calc_<dataset>` riceve:
  - df: pandas.DataFrame del CSV reale (colonne = nomi originali del CSV)
  - field_map: dict {canonical_name: nome_colonna_nel_csv | None}
               Pre-calcolato dal builder applicando expected_fields a df.columns.

Ogni funzione restituisce un dict di metriche. I valori `None` indicano
"campo non presente nel CSV" e nella dashboard renderizzano una card vuota
con disclaimer.

Convenzione: le funzioni NON devono mai sollevare eccezioni; in caso di
errore loggano warning e ritornano metric=None.

NB: questo file in Commit A è SKELETON (tutti i calcolatori ritornano
stub vuoti). La logica vera viene in Commit B (Bologna prima) e Commit C
(estensione altri Comuni).
"""
from __future__ import annotations
import logging
from typing import Optional

import pandas as pd

log = logging.getLogger(__name__)


def _safe_get_col(df: pd.DataFrame, field_map: dict, key: str) -> Optional[pd.Series]:
    """Ritorna la Series del campo canonico key, o None se non mappato."""
    col = field_map.get(key)
    if col is None or col not in df.columns:
        return None
    return df[col]


# ===================== CORE 1 — Popolazione =====================

def calc_popolazione(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale_residenti": None,
        "serie_anni": None,
        "serie_residenti": None,
        "pop_0_14": None,
        "pop_65plus": None,
        "per_quartiere": None,
        "nati": None,
        "morti": None,
        "iscritti": None,
        "cancellati": None,
    }


# ===================== CORE 2 — Bilancio =====================

def calc_bilancio(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale_uscite": None,
        "per_missione": None,
        "top10_programmi": None,
        "serie_anni": None,
    }


# ===================== CORE 3 — Opere pubbliche =====================

def calc_opere(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale": None,
        "per_stato": None,
        "opere_geo": None,
        "cup": None,
        "importo_totale": None,
        "sal_medio": None,
        "per_fonte": None,
    }


# ===================== CORE 4 — Pratiche edilizie =====================

def calc_pratiche(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale": None,
        "per_tipo": None,
        "per_esito": None,
        "tasso_chiusura": None,
        "tempo_medio_scia": None,
        "tempo_medio_pdc": None,
        "pct_nei_termini": None,
    }


# ===================== CORE 5 — Servizi sociali =====================

def calc_sociali(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "utenti_totali": None,
        "per_target": None,
        "per_categoria": None,
        "spesa_totale": None,
        "spesa_media": None,
        "pct_accolte": None,
    }


# ===================== CORE 6 — Istruzione =====================

def calc_istruzione(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale_iscritti": None,
        "per_struttura": None,
        "per_quartiere": None,
        "plessi_geo": None,
        "posti_totali": None,
        "lista_attesa": None,
        "tasso_copertura": None,
    }


# ===================== CORE 7 — Incidenti stradali =====================

def calc_incidenti(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale_anno": None,
        "n_morti": None,
        "n_feriti": None,
        "serie_mensile": None,
        "per_zona": None,
        "hot_spots": None,
        "indice_mortalita": None,
        "pct_pedoni_ciclisti": None,
    }


# ===================== CORE 8 — Rifiuti =====================

def calc_rifiuti(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "rd_pct": None,
        "serie_anni": None,
        "per_zona": None,
        "composizione": None,
        "pro_capite_kg": None,
        "serie_mensile": None,
    }


# ===================== CORE 9 — Eventi culturali =====================

def calc_eventi(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale_anno": None,
        "per_categoria": None,
        "eventi_geo": None,
        "pct_gratuiti": None,
        "spesa_patrocinati": None,
    }


# ===================== CORE 10 — Delibere =====================

def calc_delibere(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale_anno": None,
        "per_tipo": None,
        "tempo_medio_pubblicazione": None,
        "pct_nei_termini": None,
    }


# ===================== CORE 11 — Patrimonio =====================

def calc_patrimonio(df: pd.DataFrame, field_map: dict) -> dict:
    return {
        "totale_immobili": None,
        "per_categoria": None,
        "immobili_geo": None,
        "pct_vincolo_culturale": None,
        "valore_totale": None,
        "pct_inutilizzati": None,
    }


# Lookup table usata dal builder
CALCULATORS = {
    "calc_popolazione": calc_popolazione,
    "calc_bilancio":    calc_bilancio,
    "calc_opere":       calc_opere,
    "calc_pratiche":    calc_pratiche,
    "calc_sociali":     calc_sociali,
    "calc_istruzione":  calc_istruzione,
    "calc_incidenti":   calc_incidenti,
    "calc_rifiuti":     calc_rifiuti,
    "calc_eventi":      calc_eventi,
    "calc_delibere":    calc_delibere,
    "calc_patrimonio":  calc_patrimonio,
}
