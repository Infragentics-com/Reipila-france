"""Open-data API clients for PropSignal v2 (all keyless / open).

Replaces CEREMA Tier-2 (key-required) APIs with open data.gouv.fr sources:
  - DVF+ (CEREMA key) -> geo-dvf static files (files.data.gouv.fr) [no key]
  - Open MAJIC owners (key) -> recherche-entreprises.api.gouv.fr (SCI/PM) [no key]
  - Coproprietes (key) -> RNC ANAH open dataset (best-effort)
  - Risques argiles (key) -> Georisques API [no key]
Tier-1 open APIs: BAN, APICarto Cadastre, ADEME DPE, GPU/PLU, Georisques,
BODACC (opendatasoft), geo.api.gouv (communes).

All field names verified empirically against live API responses (POC).
"""
import asyncio
import io
import json
import time
from datetime import datetime

import httpx
import pandas as pd

UA = {"User-Agent": "PropSignal/1.0 (data.gouv open-data client)"}
TIMEOUT = httpx.Timeout(45.0, connect=20.0)
LYON_EPCI = "200046977"

_client = None


def get_client():
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=TIMEOUT, headers=UA, follow_redirects=True)
    return _client


async def close_client():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def fetch_news(query, limit=14):
    """Fetch real-estate news via Google News RSS (keyless) for a given query.
    Returns a list of {title, link, source, published, summary}."""
    import urllib.parse
    import re as _re
    import xml.etree.ElementTree as ET
    url = ("https://news.google.com/rss/search?q="
           + urllib.parse.quote(query)
           + "&hl=fr&gl=FR&ceid=FR:fr")
    out = []
    try:
        c = get_client()
        r = await c.get(url)
        if r.status_code != 200:
            return out
        root = ET.fromstring(r.text)
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub = (item.findtext("pubDate") or "").strip()
            src_el = item.find("source")
            source = (src_el.text if src_el is not None and src_el.text else "").strip()
            desc = item.findtext("description") or ""
            desc = _re.sub("<[^>]+>", "", desc).strip()
            desc = _re.sub("\\s+", " ", desc)[:220]
            if not title or not link:
                continue
            out.append({"title": title, "link": link, "published": pub,
                        "source": source, "summary": desc})
            if len(out) >= limit:
                break
    except Exception:
        pass
    return out



class RateLimiter:
    """Per-host minimum interval between calls (respect documented rate limits)."""
    INTERVALS = {
        "georisques": 0.25,   # ~4 req/s (doc ~5/s, stay safe)
        "apicarto": 0.12,     # ~8 req/s (doc ~10/s)
        "gpu": 0.12,          # ~8 req/s (doc ~30/s, IP ban risk -> conservative)
        "bodacc": 0.12,       # ~8 req/s
        "entreprises": 0.16,  # ~6 req/s (doc ~7/s)
        "ademe": 0.05,        # ~20 req/s
        "ban": 0.04,          # ~25 req/s (doc ~50/s)
        "geoapi": 0.04,
        "dvf_files": 0.10,
    }

    def __init__(self):
        self._locks = {}
        self._last = {}

    async def wait(self, key):
        lock = self._locks.setdefault(key, asyncio.Lock())
        interval = self.INTERVALS.get(key, 0.1)
        async with lock:
            now = time.monotonic()
            delta = now - self._last.get(key, 0.0)
            if delta < interval:
                await asyncio.sleep(interval - delta)
            self._last[key] = time.monotonic()


limiter = RateLimiter()


def _bump(stats, key):
    if stats is not None:
        stats[key] = stats.get(key, 0) + 1
        stats["api_calls"] = stats.get("api_calls", 0) + 1


# ------------------------------------------------------------------ communes
async def get_communes_metropole(stats=None):
    c = get_client()
    await limiter.wait("geoapi")
    r = await c.get(f"https://geo.api.gouv.fr/epcis/{LYON_EPCI}/communes",
                    params={"fields": "nom,code,population,surface,centre,codesPostaux", "format": "json", "geometry": "centre"})
    _bump(stats, "geoapi")
    r.raise_for_status()
    return r.json()


# ------------------------------------------------------------------ BAN
async def geocode(address, stats=None):
    c = get_client()
    await limiter.wait("ban")
    r = await c.get("https://api-adresse.data.gouv.fr/search/", params={"q": address, "limit": 1})
    _bump(stats, "ban")
    if r.status_code != 200:
        return None
    feats = r.json().get("features", [])
    if not feats:
        return None
    f = feats[0]
    lon, lat = f["geometry"]["coordinates"]
    p = f["properties"]
    return {"lon": lon, "lat": lat, "citycode": p.get("citycode"), "label": p.get("label"),
            "postcode": p.get("postcode"), "score": p.get("score"), "city": p.get("city")}


# ------------------------------------------------------------------ Cadastre (APICarto)
async def cadastre_by_point(lon, lat, stats=None):
    c = get_client()
    geom = json.dumps({"type": "Point", "coordinates": [lon, lat]})
    await limiter.wait("apicarto")
    try:
        r = await c.get("https://apicarto.ign.fr/api/cadastre/parcelle",
                        params={"geom": geom, "_limit": 1})
        _bump(stats, "apicarto")
        if r.status_code != 200:
            return None
        feats = r.json().get("features", [])
        if not feats:
            return None
        f = feats[0]
        p = f["properties"]
        return {"idu": p.get("idu"), "section": p.get("section"), "numero": p.get("numero"),
                "contenance": p.get("contenance"), "code_insee": p.get("code_insee"),
                "code_arr": p.get("code_arr"), "code_com": p.get("code_com"),
                "nom_com": p.get("nom_com"), "geometry": f.get("geometry")}
    except Exception:
        return None


# ------------------------------------------------------------------ DPE (ADEME data-fair)
async def dpe_near(lon, lat, radius=90, stats=None):
    c = get_client()
    await limiter.wait("ademe")
    try:
        r = await c.get("https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines",
                        params={"geo_distance": f"{lon},{lat},{radius}", "size": 3, "sort": "-date_etablissement_dpe",
                                "select": "etiquette_dpe,etiquette_ges,date_etablissement_dpe,adresse_ban,type_batiment,annee_construction,_geopoint"})
        _bump(stats, "ademe")
        if r.status_code != 200:
            return None
        rows = r.json().get("results", [])
        if not rows:
            return {"_checked": True}
        # pick worst (most relevant) DPE class among nearby diagnostics
        order = {"G": 7, "F": 6, "E": 5, "D": 4, "C": 3, "B": 2, "A": 1}
        rows = [x for x in rows if x.get("etiquette_dpe")]
        if not rows:
            return {"_checked": True}
        best = max(rows, key=lambda x: order.get((x.get("etiquette_dpe") or "").upper(), 0))
        return {"_checked": True, "dpe_classe": (best.get("etiquette_dpe") or "").upper(),
                "dpe_ges": (best.get("etiquette_ges") or "").upper() or None,
                "dpe_date": best.get("date_etablissement_dpe"),
                "type_batiment": best.get("type_batiment"),
                "annee_construction": _safe_int(best.get("annee_construction"))}
    except Exception:
        return None


# ------------------------------------------------------------------ DVF (geo-dvf files)
async def fetch_dvf_df(dvf_code, years, stats=None):
    c = get_client()
    dept = dvf_code[:2]
    frames = []
    for year in years:
        url = f"https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/communes/{dept}/{dvf_code}.csv"
        await limiter.wait("dvf_files")
        try:
            r = await c.get(url)
            _bump(stats, "dvf_files")
            if r.status_code == 200 and len(r.content) > 50:
                df = pd.read_csv(io.BytesIO(r.content), low_memory=False)
                df["_year"] = int(year)
                frames.append(df)
        except Exception:
            continue
    if not frames:
        return None
    return pd.concat(frames, ignore_index=True)


def market_ref(df, type_local="Appartement"):
    """Return {p25, median, p75, n, variation_pct} for a property type."""
    sub = df[(df["type_local"] == type_local) & (df["valeur_fonciere"].notna()) &
             (df["surface_reelle_bati"] > 8)].copy()
    if len(sub) < 5:
        return None
    sub["prix_m2"] = sub["valeur_fonciere"] / sub["surface_reelle_bati"]
    sub = sub[(sub["prix_m2"] > 400) & (sub["prix_m2"] < 30000)]
    if len(sub) < 5:
        return None
    out = {"p25": round(float(sub["prix_m2"].quantile(0.25)), 2),
           "median": round(float(sub["prix_m2"].median()), 2),
           "p75": round(float(sub["prix_m2"].quantile(0.75)), 2),
           "n": int(len(sub))}
    # variation: latest year vs previous year median
    years = sorted(sub["_year"].unique())
    if len(years) >= 2:
        cur = sub[sub["_year"] == years[-1]]["prix_m2"].median()
        prev = sub[sub["_year"] == years[-2]]["prix_m2"].median()
        if prev and prev > 0:
            out["variation_pct"] = round((cur - prev) / prev * 100, 2)
    return out


# ------------------------------------------------------------------ BODACC
async def bodacc_procedures(dept="69", limit=80, stats=None):
    c = get_client()
    await limiter.wait("bodacc")
    url = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records"
    try:
        r = await c.get(url, params={"where": f"numerodepartement='{dept}' AND familleavis='collective'",
                                     "limit": min(limit, 100), "order_by": "dateparution DESC"})
        _bump(stats, "bodacc")
        if r.status_code != 200:
            return []
        return r.json().get("results", [])
    except Exception:
        return []


def classify_bodacc(rec):
    """Map a BODACC record to a signal type + value, or None."""
    jug = rec.get("jugement")
    if isinstance(jug, str):
        try:
            jug = json.loads(jug)
        except Exception:
            jug = {}
    nature = ((jug or {}).get("nature") or "").lower()
    famille_lib = (rec.get("familleavis_lib") or "").lower()
    if "liquidation" in nature:
        return ("bodacc_liquidation", "Liquidation judiciaire")
    if "redressement" in nature:
        return ("bodacc_redressement", "Redressement judiciaire")
    if "dissolution" in nature or "dissolution" in famille_lib:
        return ("bodacc_dissolution", "Dissolution")
    if "radiation" in famille_lib or "radiation" in nature:
        return ("bodacc_radiation", "Radiation RCS")
    if "sauvegarde" in nature or "ouverture" in nature:
        return ("bodacc_redressement", "Proc\u00e9dure collective (ouverture)")
    return None


# ------------------------------------------------------------------ Recherche Entreprises
async def entreprises_by_siren(siren, stats=None):
    c = get_client()
    await limiter.wait("entreprises")
    try:
        r = await c.get("https://recherche-entreprises.api.gouv.fr/search", params={"q": siren, "per_page": 1})
        _bump(stats, "entreprises")
        if r.status_code != 200:
            return None
        recs = r.json().get("results", [])
        return recs[0] if recs else None
    except Exception:
        return None


async def entreprises_sci(code_postal, per_page=25, stats=None):
    """SCI (nature juridique 6540) in a postal code."""
    c = get_client()
    await limiter.wait("entreprises")
    try:
        r = await c.get("https://recherche-entreprises.api.gouv.fr/search",
                        params={"nature_juridique": "6540", "code_postal": code_postal,
                                "per_page": per_page, "page": 1})
        _bump(stats, "entreprises")
        if r.status_code != 200:
            return []
        return r.json().get("results", [])
    except Exception:
        return []


def siege_lonlat(rec):
    s = (rec or {}).get("siege") or {}
    lon, lat = s.get("longitude"), s.get("latitude")
    try:
        return (float(lon), float(lat)) if lon and lat else None
    except Exception:
        return None


def senior_dirigeant(rec):
    """True if any personne-physique dirigeant is likely > 65 yo."""
    yr_now = datetime.utcnow().year
    for d in (rec or {}).get("dirigeants", []) or []:
        an = d.get("annee_de_naissance") or (str(d.get("date_de_naissance") or "")[:4])
        try:
            if an and (yr_now - int(an)) >= 65:
                return True
        except Exception:
            continue
    return False


# ------------------------------------------------------------------ GPU / PLU
async def plu_zone(lon, lat, stats=None):
    c = get_client()
    geom = json.dumps({"type": "Point", "coordinates": [lon, lat]})
    await limiter.wait("gpu")
    try:
        r = await c.get("https://apicarto.ign.fr/api/gpu/zone-urba", params={"geom": geom})
        _bump(stats, "gpu")
        if r.status_code != 200:
            return None
        feats = r.json().get("features", [])
        if not feats:
            return None
        p = feats[0]["properties"]
        return {"typezone": p.get("typezone"), "libelle": p.get("libelle"), "libelong": p.get("libelong")}
    except Exception:
        return None


# ------------------------------------------------------------------ Georisques
async def georisques_point(lon, lat, stats=None):
    c = get_client()
    out = {}
    await limiter.wait("georisques")
    try:
        r = await c.get("https://www.georisques.gouv.fr/api/v1/rga", params={"latlon": f"{lon},{lat}"})
        _bump(stats, "georisques")
        if r.status_code == 200:
            d = r.json()
            d = d.get("data", d) if isinstance(d, dict) else d
            expo = (d or {}).get("exposition", "") if isinstance(d, dict) else ""
            code = str((d or {}).get("codeExposition", "")) if isinstance(d, dict) else ""
            if code in ("3", "4") or "fort" in expo.lower():
                out["geo_retrait_argile"] = "fort"
            elif code == "2" or "moyen" in expo.lower():
                out["geo_retrait_argile"] = "moyen"
    except Exception:
        pass
    await limiter.wait("georisques")
    try:
        r = await c.get("https://www.georisques.gouv.fr/api/v1/mvt", params={"latlon": f"{lon},{lat}", "rayon": 500})
        _bump(stats, "georisques")
        if r.status_code == 200:
            d = r.json()
            data = d.get("data") if isinstance(d, dict) else d
            if data:
                out["geo_mvt_terrain"] = True
    except Exception:
        pass
    return out


async def georisques_commune(code_insee, stats=None):
    """Commune-level GASPAR risks (inondation flag)."""
    c = get_client()
    await limiter.wait("georisques")
    try:
        r = await c.get("https://www.georisques.gouv.fr/api/v1/gaspar/risques",
                        params={"code_insee": code_insee, "page": 1, "page_size": 30})
        _bump(stats, "georisques")
        if r.status_code != 200:
            return {}
        d = r.json()
        items = d.get("data") or d.get("results") or []
        text = json.dumps(items).lower()
        return {"inondation": "inondation" in text}
    except Exception:
        return {}


def _safe_int(v):
    try:
        return int(float(v))
    except Exception:
        return None
