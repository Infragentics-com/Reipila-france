"""PropSignal v2 ingestion / triangulation engine.

Progressive, per-commune ingestion against REAL open data (no mock):
  1. DVF (geo-dvf) seeds parcels (temporal + market signals) + market reference.
  2. recherche-entreprises seeds SCI owner-linked structure signals.
  3. BODACC seeds judicial owner-linked signals (SIREN -> siege -> parcelle).
  4. Enrichment: cadastre geometry, DPE, PLU zoning, Georisques.
  5. Deterministic scoring + convergence log -> persisted.
Dependency-ordered, rate-limited, fully logged in ingestion_runs.
"""
import asyncio
import math
import uuid
from datetime import datetime, date, timezone

import open_data as od
import scoring_engine as se
import database as dbm

# Caps to keep a single run bounded + respectful of API rate limits
MAX_STORE = 130          # max parcels stored per run
MAX_DVF_CANDIDATES = 85
MAX_SCI = 25
MAX_BODACC = 25
MAX_DEEP_RISK = 60       # parcels getting per-point Georisques (rga/mvt)
ENRICH_CONCURRENCY = 6

LYON_ARR = {
    "69381": "Lyon 1er", "69382": "Lyon 2e", "69383": "Lyon 3e", "69384": "Lyon 4e",
    "69385": "Lyon 5e", "69386": "Lyon 6e", "69387": "Lyon 7e", "69388": "Lyon 8e",
    "69389": "Lyon 9e",
}
ARR_CP = {
    "69381": "69001", "69382": "69002", "69383": "69003", "69384": "69004",
    "69385": "69005", "69386": "69006", "69387": "69007", "69388": "69008", "69389": "69009",
}

_now = lambda: datetime.now(timezone.utc)


def _in_lyon(ref, lon, lat):
    """Validate a parcel truly belongs to Metropole de Lyon (dept 69) AND its
    coordinates fall inside the Lyon bbox. Prevents off-69 parcels (e.g. a company
    siege geocoded in Paris/Nice) from polluting the map and analytics."""
    if not (ref and str(ref).startswith("69")):
        return False
    if lon is None or lat is None:
        return False
    return 4.55 < float(lon) < 5.25 and 45.55 < float(lat) < 45.95


def _travaux_rate(dpe):
    """Estimated energy-renovation cost (EUR/m2) by DPE class (FR market 2025,
    full retrofit to a sellable class). Sources: architecteo, lesclesdelabanque."""
    return {"G": 800, "F": 550, "E": 350, "D": 200}.get(dpe, 150)


def dvf_codes_for(code_insee):
    if code_insee == "69123":
        return list(LYON_ARR.keys())
    return [code_insee]


def commune_label(code_insee, fallback=None):
    return LYON_ARR.get(code_insee) or fallback or code_insee


async def get_commune(code_insee):
    return await dbm.communes.find_one({"code_insee": code_insee})


async def seed_communes():
    """Upsert the 58 communes of Metropole de Lyon (+ Lyon arrondissements)."""
    try:
        data = await od.get_communes_metropole()
    except Exception:
        return 0
    n = 0
    for c in data:
        centre = (c.get("centre") or {}).get("coordinates") or [None, None]
        doc = {
            "code_insee": c["code"], "nom": c["nom"], "population": c.get("population"),
            "surface_km2": (c.get("surface") or 0) / 100.0 if c.get("surface") else None,
            "codes_postaux": c.get("codesPostaux") or [],
            "centroide_lon": centre[0], "centroide_lat": centre[1],
        }
        await dbm.communes.update_one({"code_insee": c["code"]}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        n += 1
    # Lyon arrondissements as navigable communes (parcels live here)
    lyon = next((c for c in data if c["code"] == "69123"), None)
    base = (lyon.get("centre") or {}).get("coordinates") if lyon else [4.835, 45.758]
    for code, nom in LYON_ARR.items():
        await dbm.communes.update_one({"code_insee": code}, {"$set": {
            "code_insee": code, "nom": nom, "parent_insee": "69123",
            "codes_postaux": [ARR_CP[code]],
            "centroide_lon": base[0] if base else 4.835, "centroide_lat": base[1] if base else 45.758,
        }, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        n += 1
    return n


async def run_ingestion(code_insee, run_id=None):
    run_id = run_id or str(uuid.uuid4())
    stats = {"api_calls": 0}
    t0 = datetime.utcnow()
    commune = await get_commune(code_insee)
    commune_nom = commune_label(code_insee, commune.get("nom") if commune else None)
    await dbm.ingestion_runs.update_one(
        {"id": run_id},
        {"$set": {"id": run_id, "code_insee": code_insee, "commune_nom": commune_nom,
                  "source": "multi", "status": "running", "started_at": _now()}}, upsert=True)

    pmap = {}        # ref_cadastrale -> parcelle record (under construction)
    market = None
    market_variation = None

    try:
        # ---------- 1. DVF seeds + market reference ----------
        dcodes = dvf_codes_for(code_insee)
        df = None
        for dc in dcodes:
            sub = await od.fetch_dvf_df(dc, ["2024", "2023"], stats)
            if sub is not None:
                sub["_dvf_code"] = dc
                df = sub if df is None else _concat(df, sub)
        if df is not None and len(df):
            market = od.market_ref(df, "Appartement") or od.market_ref(df, "Maison")
            if market:
                market_variation = market.get("variation_pct")
            _seed_from_dvf(df, code_insee, commune_nom, market, pmap)

        # ---------- 2. SCI owner-linked seeds ----------
        cps = (commune.get("codes_postaux") if commune else None) or [ARR_CP.get(code_insee)]
        cp = next((x for x in cps if x), None)
        if cp:
            scis = await od.entreprises_sci(cp, per_page=MAX_SCI, stats=stats)
            await _seed_from_sci(scis, code_insee, commune_nom, pmap, stats)

        # ---------- 3. BODACC judicial seeds ----------
        annonces = await od.bodacc_procedures("69", limit=80, stats=stats)
        await _seed_from_bodacc(annonces, code_insee, commune_nom, cps, pmap, stats)

        # ---------- cap stored set ----------
        items = list(pmap.values())
        items.sort(key=lambda p: p.get("_prelim", 0), reverse=True)
        items = items[:MAX_STORE]

        # ---------- 4. Enrichment (geometry, DPE, PLU, risk) ----------
        gaspar = await od.georisques_commune(code_insee if code_insee != "69123" else "69123", stats)
        commune_inond = bool(gaspar.get("inondation"))
        sem = asyncio.Semaphore(ENRICH_CONCURRENCY)

        async def enrich(idx, p):
            async with sem:
                lon, lat = p.get("longitude"), p.get("latitude")
                if lon and lat and not p.get("_geom"):
                    cad = await od.cadastre_by_point(lon, lat, stats)
                    if cad:
                        p["_geom"] = cad.get("geometry")
                        p["section"] = p.get("section") or cad.get("section")
                        p["numero"] = p.get("numero") or cad.get("numero")
                        if cad.get("contenance") and not p.get("surface_parcelle_m2"):
                            p["surface_parcelle_m2"] = float(cad["contenance"])
                if lon and lat:
                    dpe = await od.dpe_near(lon, lat, 90, stats)
                    if dpe:
                        p["_dpe_checked"] = True
                        for k in ("dpe_classe", "dpe_ges", "dpe_date", "type_batiment"):
                            if dpe.get(k):
                                p[k] = dpe[k]
                        if dpe.get("annee_construction") and not p.get("annee_construction"):
                            p["annee_construction"] = dpe["annee_construction"]
                    plu = await od.plu_zone(lon, lat, stats)
                    if plu:
                        tz = (plu.get("typezone") or "")
                        p["plu_zone"] = plu.get("libelle")
                        p["plu_libelle"] = plu.get("libelong")
                        p["plu_zone_dense"] = tz.upper().startswith("U")
                        p["plu_division_possible"] = bool(p["plu_zone_dense"] and (p.get("surface_parcelle_m2") or 0) > 500)
                    if commune_inond:
                        p["geo_inondation"] = True
                    if idx < MAX_DEEP_RISK and lon and lat:
                        geo = await od.georisques_point(lon, lat, stats)
                        p.update({k: v for k, v in geo.items()})

        await asyncio.gather(*[enrich(i, p) for i, p in enumerate(items)])

        # ---------- 5. Score + persist ----------
        created, sig_total, acq_total = 0, 0, 0
        for p in items:
            sigs = se.build_signals(p)
            if not sigs:
                continue
            conv = se.compute_conviction(sigs, marche_variation_6m_pct=market_variation)
            await _persist(p, conv, code_insee, commune_nom, market, market_variation)
            created += 1
            sig_total += conv["nb_signaux_actifs"]
            if conv["conviction_score"] >= 40:
                await _persist_acquisition(p, conv, market)
                acq_total += 1

        # commune stats
        await _update_commune_stats(code_insee, market, market_variation)

        dur = int((datetime.utcnow() - t0).total_seconds() * 1000)
        await dbm.ingestion_runs.update_one({"id": run_id}, {"$set": {
            "status": "success", "ended_at": _now(), "duree_ms": dur,
            "api_calls_made": stats.get("api_calls", 0), "api_calls_detail": {k: v for k, v in stats.items() if k != "api_calls"},
            "parcelles_created": created, "signals_created": sig_total, "acquisitions_created": acq_total,
            "records_fetched": len(pmap),
        }})
        return {"run_id": run_id, "parcelles": created, "signals": sig_total,
                "acquisitions": acq_total, "api_calls": stats.get("api_calls", 0)}
    except Exception as e:
        await dbm.ingestion_runs.update_one({"id": run_id}, {"$set": {
            "status": "error", "ended_at": _now(), "erreurs": str(e)[:500],
            "api_calls_made": stats.get("api_calls", 0)}})
        raise


def _concat(a, b):
    import pandas as pd
    return pd.concat([a, b], ignore_index=True)


def _seed_from_dvf(df, code_insee, commune_nom, market, pmap):
    today = date.today()
    d = df[df["id_parcelle"].notna() & df["date_mutation"].notna()].copy()
    d = d[d["nature_mutation"].astype(str).str.contains("Vente", case=False, na=False)]
    # latest mutation per parcelle
    d["_dt"] = d["date_mutation"].astype(str)
    d = d.sort_values("_dt").drop_duplicates("id_parcelle", keep="last")
    for _, row in d.iterrows():
        ref = str(row["id_parcelle"]).strip()
        if not ref or len(ref) < 10:
            continue
        try:
            lon = float(row["longitude"]); lat = float(row["latitude"])
        except Exception:
            continue
        if math.isnan(lon) or math.isnan(lat):
            continue
        mut_date = str(row["date_mutation"])[:10]
        anc = today.year - int(mut_date[:4])
        surface = row.get("surface_reelle_bati")
        valeur = row.get("valeur_fonciere")
        prix_m2 = None
        try:
            if surface and float(surface) > 8 and valeur and float(valeur) > 0:
                prix_m2 = round(float(valeur) / float(surface), 2)
        except Exception:
            prix_m2 = None
        type_local = str(row.get("type_local") or "").lower()
        type_bien = ("appartement" if "appart" in type_local else "maison" if "maison" in type_local
                     else "local_commercial" if "local" in type_local else "autre")
        arr = ref[:5]
        nom = LYON_ARR.get(arr, commune_nom)
        p = pmap.get(ref) or {"ref_cadastrale": ref}
        p.update({
            "longitude": lon, "latitude": lat,
            "code_insee": arr, "commune_nom": nom, "parent_insee": code_insee if code_insee == "69123" else None,
            "type_bien": type_bien,
            "surface_bati_m2": _f(surface),
            "surface_parcelle_m2": _f(row.get("surface_terrain")) or p.get("surface_parcelle_m2"),
            "nb_pieces": _i(row.get("nombre_pieces_principales")),
            "dvf_date_derniere_mutation": mut_date,
            "dvf_prix_vente": _i(valeur), "dvf_prix_m2": prix_m2,
            "dvf_anciennete_ans": anc, "dvf_nature_mutation": str(row.get("nature_mutation")),
            "adresse_raw": _addr(row),
        })
        if market:
            p["marche_prix_m2_p25"] = market.get("p25")
            p["marche_prix_m2_median"] = market.get("median")
            p["marche_prix_m2_p75"] = market.get("p75")
        # preliminary interest (rank candidates before heavy enrichment)
        prelim = 0
        if anc > 20: prelim += 15
        elif anc >= 15: prelim += 12
        elif anc >= 10: prelim += 8
        if prix_m2 and market and market.get("median") and anc <= 2:
            ratio = prix_m2 / market["median"] * 100
            if ratio < 70: prelim += 40
            elif ratio < 80: prelim += 30
            elif ratio < 90: prelim += 18
        p["_prelim"] = max(p.get("_prelim", 0), prelim)
        pmap[ref] = p
    # keep top DVF candidates by prelim to bound enrichment
    dvf_refs = [r for r, p in pmap.items() if "_prelim" in p]
    dvf_refs.sort(key=lambda r: pmap[r].get("_prelim", 0), reverse=True)
    for r in dvf_refs[MAX_DVF_CANDIDATES:]:
        if not pmap[r].get("_owner_signals"):
            pmap.pop(r, None)


async def _seed_from_sci(scis, code_insee, commune_nom, pmap, stats):
    today = date.today()
    count = 0
    for rec in (scis or [])[:MAX_SCI]:
        ll = od.siege_lonlat(rec)
        if not ll:
            continue
        etat = rec.get("etat_administratif") or (rec.get("siege") or {}).get("etat_administratif")
        owner_sigs = []
        if etat == "C":
            d = rec.get("date_fermeture") or rec.get("date_mise_a_jour")
            owner_sigs.append({"type": "inpi_sci_cessation", "signal_date": (str(d)[:10] if d else today),
                               "value": rec.get("nom_complet"), "finding": "SCI cess\u00e9e au registre (INSEE/RNE)", "source_api": "recherche-entreprises"})
        if od.senior_dirigeant(rec):
            owner_sigs.append({"type": "inpi_gerant_senior", "signal_date": today,
                               "value": "g\u00e9rant > 65 ans", "finding": "G\u00e9rant senior (succession probable)", "source_api": "recherche-entreprises"})
        if not owner_sigs:
            continue
        cad = await od.cadastre_by_point(ll[0], ll[1], stats)
        if not cad or not cad.get("idu"):
            continue
        ref = cad["idu"]
        arr = ref[:5]
        if not _in_lyon(ref, ll[0], ll[1]):
            continue
        p = pmap.get(ref) or {"ref_cadastrale": ref, "longitude": ll[0], "latitude": ll[1],
                              "code_insee": arr, "commune_nom": LYON_ARR.get(arr, commune_nom)}
        p["_geom"] = cad.get("geometry")
        if cad.get("contenance"):
            p["surface_parcelle_m2"] = float(cad["contenance"])
        p["siren_proprio"] = rec.get("siren")
        p["raison_sociale"] = rec.get("nom_complet")
        p["type_proprio"] = "sci"
        p["_owner_signals"] = (p.get("_owner_signals") or []) + owner_sigs
        p["_prelim"] = p.get("_prelim", 0) + 38
        pmap[ref] = p
        count += 1
    return count


async def _seed_from_bodacc(annonces, code_insee, commune_nom, cps, pmap, stats):
    cps = set(x for x in (cps or []) if x)
    target_villes = {LYON_ARR.get(code_insee, "").lower(), (commune_nom or "").lower()}
    if code_insee == "69123":
        target_villes.add("lyon")
    seeded = 0
    for rec in (annonces or []):
        if seeded >= MAX_BODACC:
            break
        ville = (rec.get("ville") or "").lower()
        cp = str(rec.get("cp") or "")
        in_commune = (cp in cps) or any(v and v in ville for v in target_villes if v)
        if not in_commune:
            continue
        cls = od.classify_bodacc(rec)
        if not cls:
            continue
        registre = rec.get("registre") or []
        siren = registre[0] if registre else None
        if not siren:
            continue
        ent = await od.entreprises_by_siren(siren, stats)
        ll = od.siege_lonlat(ent) if ent else None
        if not ll:
            continue
        cad = await od.cadastre_by_point(ll[0], ll[1], stats)
        if not cad or not cad.get("idu"):
            continue
        ref = cad["idu"]
        arr = ref[:5]
        if not _in_lyon(ref, ll[0], ll[1]):
            continue
        p = pmap.get(ref) or {"ref_cadastrale": ref, "longitude": ll[0], "latitude": ll[1],
                              "code_insee": arr, "commune_nom": LYON_ARR.get(arr, commune_nom)}
        p["_geom"] = cad.get("geometry")
        if cad.get("contenance"):
            p["surface_parcelle_m2"] = float(cad["contenance"])
        p["siren_proprio"] = siren
        p["raison_sociale"] = rec.get("commercant")
        p["type_proprio"] = "sci" if (ent and "6540" in str(ent.get("nature_juridique"))) else "entreprise"
        sig = {"type": cls[0], "signal_date": str(rec.get("dateparution"))[:10],
               "value": cls[1], "finding": f"BODACC : {cls[1]} ({rec.get('commercant')})", "source_api": "bodacc"}
        p["_owner_signals"] = (p.get("_owner_signals") or []) + [sig]
        p["_prelim"] = p.get("_prelim", 0) + se.SIGNAL_DEF.get(cls[0], (30, ""))[0]
        pmap[ref] = p
        seeded += 1
    return seeded


async def _persist(p, conv, code_insee, commune_nom, market, market_variation):
    ref = p["ref_cadastrale"]
    lon, lat = p.get("longitude"), p.get("latitude")
    doc = {
        "ref_cadastrale": ref, "code_insee": p.get("code_insee"), "commune_nom": p.get("commune_nom") or commune_nom,
        "parent_insee": "69123" if (p.get("code_insee") in LYON_ARR) else p.get("code_insee"),
        "section": p.get("section"), "numero": p.get("numero"),
        "longitude": lon, "latitude": lat,
        "location": {"type": "Point", "coordinates": [lon, lat]} if lon and lat else None,
        "adresse_ban": p.get("adresse_ban") or p.get("adresse_raw"),
        "type_bien": p.get("type_bien"), "surface_bati_m2": p.get("surface_bati_m2"),
        "surface_parcelle_m2": p.get("surface_parcelle_m2"), "nb_pieces": p.get("nb_pieces"),
        "annee_construction": p.get("annee_construction"),
        "type_proprio": p.get("type_proprio", "inconnu"), "siren_proprio": p.get("siren_proprio"),
        "raison_sociale": p.get("raison_sociale"),
        "dpe_classe": p.get("dpe_classe"), "dpe_ges": p.get("dpe_ges"), "dpe_date": p.get("dpe_date"),
        "dvf_date_derniere_mutation": p.get("dvf_date_derniere_mutation"),
        "dvf_prix_vente": p.get("dvf_prix_vente"), "dvf_prix_m2": p.get("dvf_prix_m2"),
        "dvf_anciennete_ans": p.get("dvf_anciennete_ans"),
        "plu_zone": p.get("plu_zone"), "plu_libelle": p.get("plu_libelle"),
        "plu_zone_dense": p.get("plu_zone_dense"), "plu_division_possible": p.get("plu_division_possible"),
        "geo_inondation": p.get("geo_inondation", False), "geo_mvt_terrain": p.get("geo_mvt_terrain", False),
        "geo_retrait_argile": p.get("geo_retrait_argile"),
        "marche_prix_m2_p25": p.get("marche_prix_m2_p25"), "marche_prix_m2_median": p.get("marche_prix_m2_median"),
        "marche_prix_m2_p75": p.get("marche_prix_m2_p75"), "marche_variation_6m_pct": market_variation,
        "conviction_score": conv["conviction_score"], "conviction_level": conv["conviction_level"],
        "classification": conv["classification"], "recommended_action": conv["recommended_action"],
        "nb_signaux_actifs": conv["nb_signaux_actifs"], "signaux_types_actifs": conv["signaux_types_actifs"],
        "signal_dominant": conv["signal_dominant"],
        "score_calculated_at": _now(), "updated_at": _now(),
    }
    await dbm.parcelles.update_one({"ref_cadastrale": ref}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    if p.get("_geom"):
        await dbm.parcelles_geometries.update_one({"ref_cadastrale": ref},
            {"$set": {"ref_cadastrale": ref, "geom": p["_geom"], "updated_at": _now()}}, upsert=True)
    # signals
    await dbm.signals.delete_many({"ref_cadastrale": ref})
    sig_docs = []
    for s in conv["signals"]:
        sig_docs.append({"id": str(uuid.uuid4()), "ref_cadastrale": ref, "type_signal": s["type"],
                         "categorie_signal": s["category"], "source_api": s.get("source_api"),
                         "signal_date": s.get("signal_date"), "detected_at": _now(), "actif": True,
                         "poids_brut": s["poids_brut"], "recency_days": s["recency_days"],
                         "recency_factor": s["recency_factor"], "poids_effectif": s["poids_effectif"],
                         "convergence_label": s["finding"], "convergence_detail": str(s["value"]) })
    if sig_docs:
        await dbm.signals.insert_many(sig_docs)
    # convergence log
    await dbm.convergence_logs.update_one({"ref_cadastrale": ref}, {"$set": {
        "ref_cadastrale": ref, "conviction_score_final": conv["conviction_score"],
        "classification": conv["classification"], "recommended_action": conv["recommended_action"],
        "steps": conv["steps"], "bonus_convergence_pct": conv["bonus_convergence_pct"],
        "context_multiplier": conv["context_multiplier"], "score_brut_avant_bonus": conv["score_brut_avant_bonus"],
        "calculated_at": _now()}}, upsert=True)


def _opportunity_types(p, conv):
    types = []
    types_set = set(conv["signaux_types_actifs"])
    if any(t.startswith("marche_decote") for t in types_set):
        types.append("market_discount")
    if {"dpe_g", "dpe_f"} & types_set:
        types.append("dpe_renovation")
    if {"dfi_grande_parcelle", "plu_division_possible"} & types_set:
        types.append("land_division")
    if any(t.startswith("bodacc") for t in types_set):
        types.append("distressed_seller")
    if "inpi_sci_cessation" in types_set:
        types.append("pm_liquidation")
    return types


async def _persist_acquisition(p, conv, market):
    ref = p["ref_cadastrale"]
    types = _opportunity_types(p, conv)
    if not types:
        return
    surf = p.get("surface_bati_m2") or 0
    med = (market or {}).get("median")
    p25 = (market or {}).get("p25")
    p75 = (market or {}).get("p75")
    val_basse = round(p25 * surf) if (p25 and surf) else None
    val_haute = round(p75 * surf) if (p75 and surf) else None
    val_med = round(med * surf) if (med and surf) else None
    prix_m2 = p.get("dvf_prix_m2")
    decote = round((1 - prix_m2 / med) * 100, 1) if (prix_m2 and med) else None
    # --- Investor logic: works, after-works value, potential capital gain ---
    dpe = p.get("dpe_classe")
    travaux_m2 = _travaux_rate(dpe) if (dpe in {"E", "F", "G"} or "dpe_renovation" in types) else (
        _travaux_rate("D") if (p.get("annee_construction") or 9999) < 1990 else 120)
    cout_travaux = round(travaux_m2 * surf) if surf else None
    # After full renovation, the asset can be repositioned toward the upper quartile
    valeur_apres_travaux = round(p75 * surf) if (p75 and surf) else val_haute
    prix_acquisition_estime = val_med  # realistic current value (median) as acquisition basis
    plus_value = None
    marge_pct = None
    if valeur_apres_travaux and prix_acquisition_estime:
        cout = prix_acquisition_estime + (cout_travaux or 0)
        plus_value = round(valeur_apres_travaux - cout)
        marge_pct = round(plus_value / cout * 100, 1) if cout else None
    doc = {
        "ref_cadastrale": ref, "code_insee": p.get("code_insee"), "commune_nom": p.get("commune_nom"),
        "types_opportunite": types, "prix_m2_marche_median": med, "prix_m2_marche_p25": p25,
        "prix_m2_marche_p75": p75,
        "decote_vs_median_pct": decote, "valeur_estimee_basse": val_basse, "valeur_estimee_haute": val_haute,
        "valeur_estimee_median": val_med, "surface_bati_m2": surf,
        "dpe_classe": dpe, "travaux_eur_m2": travaux_m2, "cout_travaux_estime": cout_travaux,
        "valeur_apres_travaux": valeur_apres_travaux, "prix_acquisition_estime": prix_acquisition_estime,
        "plus_value_potentielle": plus_value, "marge_pct": marge_pct,
        "score_acquisition": conv["conviction_score"], "conviction_score": conv["conviction_score"],
        "conviction_level": conv["conviction_level"], "longitude": p.get("longitude"), "latitude": p.get("latitude"),
        "type_bien": p.get("type_bien"), "status": "detected", "updated_at": _now(),
    }
    await dbm.acquisitions.update_one({"ref_cadastrale": ref}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)


async def _update_commune_stats(code_insee, market, market_variation):
    refs_filter = {"code_insee": code_insee} if code_insee != "69123" else {"parent_insee": "69123"}
    nb = await dbm.parcelles.count_documents(refs_filter)
    nb_sig = await dbm.parcelles.count_documents({**refs_filter, "nb_signaux_actifs": {"$gte": 1}})
    upd = {"nb_parcelles": nb, "nb_signals_actifs": nb_sig, "updated_at": _now()}
    if market:
        upd["prix_m2_median_actuel"] = market.get("median")
    if market_variation is not None:
        upd["prix_m2_variation_6m"] = market_variation
    await dbm.communes.update_one({"code_insee": code_insee}, {"$set": upd}, upsert=True)


def _f(v):
    try:
        f = float(v)
        return f if not math.isnan(f) else None
    except Exception:
        return None


def _i(v):
    f = _f(v)
    return int(f) if f is not None else None


def _addr(row):
    parts = [str(row.get("adresse_numero") or "").replace(".0", ""), str(row.get("adresse_nom_voie") or ""),
             str(row.get("code_postal") or "").replace(".0", ""), str(row.get("nom_commune") or "")]
    return " ".join(x for x in parts if x and x != "nan").strip() or None
