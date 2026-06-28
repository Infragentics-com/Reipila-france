"""PropSignal v2 deterministic Conviction Scoring Engine + Convergence Log.

Ported verbatim from the validated POC (bash v3 spec). NO randomness, fully
deterministic. All weights/recency/bonuses/thresholds are exact.
"""
from datetime import date, datetime

# (poids_brut, categorie)
SIGNAL_DEF = {
    "bodacc_liquidation":       (45, "judiciaire"),
    "bodacc_dissolution":       (40, "judiciaire"),
    "bodacc_redressement":      (35, "judiciaire"),
    "bodacc_radiation":         (35, "judiciaire"),
    "inpi_sci_cessation":       (38, "structure"),
    "dpe_g":                    (35, "reglementaire"),
    "dpe_f":                    (25, "reglementaire"),
    "dpe_e":                    (8,  "reglementaire"),
    "dpe_absent":               (8,  "reglementaire"),
    "dpe_expire":               (8,  "reglementaire"),
    "dvf_achat_au_dessus_p75":  (22, "temporel"),
    "dvf_long_hold_20ans_plus": (15, "temporel"),
    "dvf_long_hold_15_20ans":   (12, "temporel"),
    "dvf_long_hold_10_15ans":   (8,  "temporel"),
    "dvf_achat_recent_3ans":    (-10, "temporel"),
    "copro_procedure_carence":  (30, "structure"),
    "copro_procedure_alerte":   (20, "structure"),
    "copro_charges_elevees":    (10, "structure"),
    "inpi_gerant_senior":       (12, "structure"),
    "plu_zone_dense":           (12, "urbanisme"),
    "plu_division_possible":    (8,  "urbanisme"),
    "geo_inondation":           (10, "risque"),
    "geo_mvt_terrain":          (12, "risque"),
    "geo_retrait_argile_fort":  (0,  "risque"),
    "marche_decote_10pct":      (18, "marche"),
    "marche_decote_20pct":      (30, "marche"),
    "marche_decote_30pct":      (40, "marche"),
    "dfi_grande_parcelle":      (8,  "foncier"),
}

JUDICIAIRE_SLOW = {"bodacc_liquidation", "bodacc_dissolution", "bodacc_redressement",
                   "bodacc_radiation", "inpi_sci_cessation"}

CATEGORY_LABEL = {
    "temporel": "Ownership Analysis", "judiciaire": "Legal Registry Scan",
    "reglementaire": "Energy Performance Data", "marche": "Market Comparison",
    "structure": "Corporate Registry Scan", "urbanisme": "Urban Planning Analysis",
    "risque": "Risk Assessment", "foncier": "Land Division Analysis",
}

CRITICAL_SIGNALS = {"bodacc_liquidation", "bodacc_dissolution", "inpi_sci_cessation"}
HIGH_WEIGHT_SIGNALS = {"dpe_g", "dvf_long_hold_20ans_plus", "dvf_achat_au_dessus_p75",
                       "bodacc_redressement", "bodacc_radiation", "copro_procedure_carence",
                       "marche_decote_30pct", "marche_decote_20pct"}


def _to_date(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v)[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None


def recency_factor(signal_type, category, days):
    if category == "temporel":
        return 1.0  # ownership age IS the signal — no decay
    if signal_type in JUDICIAIRE_SLOW:
        if days <= 90:
            return 1.0
        if days <= 180:
            return 0.85
        return 0.60
    if days <= 30:
        return 1.0
    if days <= 60:
        return 0.95
    if days <= 120:
        return 0.85
    if days <= 180:
        return 0.70
    if days <= 365:
        return 0.55
    if days <= 730:
        return 0.40
    if days <= 1825:
        return 0.20
    return 0.08


def convergence_bonus(active):
    cats = [s["category"] for s in active]
    distinct = set(cats)
    bonus = 0.0
    if cats.count("judiciaire") >= 2:
        bonus += 0.10
    if len(distinct & {"judiciaire", "reglementaire", "temporel"}) >= 2:
        bonus += 0.08
    if len(distinct) >= 3:
        bonus += 0.15
    return round(bonus, 2)


def context_multiplier(marche_variation_6m_pct):
    if marche_variation_6m_pct is None:
        return 1.00
    if marche_variation_6m_pct > 5:
        return 1.10
    if marche_variation_6m_pct < -5:
        return 1.12
    return 1.00


def classify(score):
    if score >= 85:
        return ("critical", "CRITICAL \u2014 CONTACT TODAY", "Contact imm\u00e9diat + Due Diligence prioritaire")
    if score >= 70:
        return ("high", "HIGH PROBABILITY SELLER", "Contact Strategy + Due Diligence")
    if score >= 55:
        return ("medium", "MEDIUM PROBABILITY SELLER", "Pr\u00e9parer l'approche, surveiller l'\u00e9volution")
    if score >= 40:
        return ("low", "LOW PROBABILITY SELLER", "Monitoring actif")
    return ("monitoring", "WATCH LIST", "Surveillance passive")


def weight_label(signal_type, days):
    if signal_type in CRITICAL_SIGNALS:
        return "CRITICAL SIGNAL"
    if days is not None and days <= 30:
        return "RECENCY BOOST"
    if signal_type in HIGH_WEIGHT_SIGNALS:
        return "HIGH WEIGHT"
    return "STANDARD"


def compute_conviction(raw_signals, marche_variation_6m_pct=None, today=None):
    """raw_signals: list of {type, signal_date, value, finding, source_api?}.
    Returns full scoring result incl. convergence log steps and enriched signals.
    """
    today = today or date.today()
    active = []
    for s in raw_signals:
        st = s["type"]
        if st not in SIGNAL_DEF:
            continue
        poids_brut, category = SIGNAL_DEF[st]
        sd = _to_date(s.get("signal_date"))
        days = (today - sd).days if sd else 9999
        if days < 0:
            days = 0
        rf = recency_factor(st, category, days)
        pe = round(poids_brut * rf, 2)
        active.append({
            "type": st, "category": category, "poids_brut": poids_brut,
            "signal_date": sd.isoformat() if sd else None,
            "recency_days": days, "recency_factor": rf, "poids_effectif": pe,
            "value": s.get("value", ""), "finding": s.get("finding", st),
            "source_api": s.get("source_api", ""),
        })
    score_brut = sum(s["poids_effectif"] for s in active)
    bonus = convergence_bonus(active)
    mult = context_multiplier(marche_variation_6m_pct)
    score_apres = score_brut * (1 + bonus)
    conviction = max(0, min(100, round(score_apres * mult)))
    level, classification, action = classify(conviction)

    active_sorted = sorted(active, key=lambda x: x["poids_effectif"], reverse=True)
    steps = []
    for i, s in enumerate(active_sorted, 1):
        steps.append({
            "step_number": i,
            "category": CATEGORY_LABEL[s["category"]],
            "finding": s["finding"],
            "weight_label": weight_label(s["type"], s["recency_days"]),
            "signal_type": s["type"],
            "value": str(s["value"]),
            "points_contributed": round(s["poids_effectif"]),
        })

    dominant = active_sorted[0]["type"] if active_sorted else None
    return {
        "conviction_score": conviction,
        "conviction_level": level,
        "classification": classification,
        "recommended_action": action,
        "score_brut_avant_bonus": round(score_brut),
        "bonus_convergence_pct": round(bonus * 100, 1),
        "context_multiplier": mult,
        "nb_signaux_actifs": len(active),
        "signal_dominant": dominant,
        "signaux_types_actifs": [s["type"] for s in active_sorted],
        "steps": steps,
        "signals": active_sorted,
    }


def _mk(t, d, value, finding, source):
    return {"type": t, "signal_date": d, "value": value, "finding": finding, "source_api": source}


def build_signals(p, today=None):
    """Derive raw signals from a consolidated parcelle enrichment dict `p`.
    Owner-linked signals (BODACC/INPI/copro) are passed via p['_owner_signals'].
    """
    today = today or date.today()
    sigs = []

    # --- DPE (reglementaire) ---
    dpe = p.get("dpe_classe")
    dpe_date = _to_date(p.get("dpe_date"))
    if dpe == "G":
        sigs.append(_mk("dpe_g", dpe_date or today, "G", "DPE classe G \u2014 passoire (interdit \u00e0 la location)", "ademe_dpe"))
    elif dpe == "F":
        sigs.append(_mk("dpe_f", dpe_date or today, "F", "DPE classe F \u2014 \u00e9ch\u00e9ance 2028", "ademe_dpe"))
    elif dpe == "E":
        sigs.append(_mk("dpe_e", dpe_date or today, "E", "DPE classe E \u2014 signal anticipatoire", "ademe_dpe"))
    if dpe_date and (today - dpe_date).days > 3650:
        sigs.append(_mk("dpe_expire", dpe_date, "> 10 ans", "DPE expir\u00e9 (propri\u00e9taire non actif)", "ademe_dpe"))
    if not dpe and p.get("_dpe_checked") and (p.get("annee_construction") or 0) and p["annee_construction"] < 2010:
        sigs.append(_mk("dpe_absent", today, "absent", "Aucun DPE r\u00e9cent (b\u00e2ti ancien)", "ademe_dpe"))

    # --- DVF temporel ---
    anc = p.get("dvf_anciennete_ans")
    mut_date = _to_date(p.get("dvf_date_derniere_mutation"))
    if anc is not None:
        if anc > 20:
            sigs.append(_mk("dvf_long_hold_20ans_plus", mut_date, f"{anc} ans", "D\u00e9tention longue dur\u00e9e > 20 ans", "dvf"))
        elif anc >= 15:
            sigs.append(_mk("dvf_long_hold_15_20ans", mut_date, f"{anc} ans", "D\u00e9tention 15-20 ans", "dvf"))
        elif anc >= 10:
            sigs.append(_mk("dvf_long_hold_10_15ans", mut_date, f"{anc} ans", "D\u00e9tention 10-15 ans (signal \u00e9mergent)", "dvf"))
        elif anc <= 3:
            sigs.append(_mk("dvf_achat_recent_3ans", mut_date, f"{anc} ans", "Achat r\u00e9cent \u2014 signal n\u00e9gatif", "dvf"))

    # --- Market deviation (marche) : only meaningful for recent sales ---
    prix = p.get("dvf_prix_m2")
    med = p.get("marche_prix_m2_median")
    p75 = p.get("marche_prix_m2_p75")
    if prix and med and anc is not None and anc <= 2:
        ratio = prix / med * 100
        if ratio < 70:
            sigs.append(_mk("marche_decote_30pct", mut_date, f"-{round(100-ratio)}% vs m\u00e9diane", "D\u00e9cote majeure \u2014 distress clair", "dvf"))
        elif ratio < 80:
            sigs.append(_mk("marche_decote_20pct", mut_date, f"-{round(100-ratio)}% vs m\u00e9diane", "Forte d\u00e9cote \u2014 vendeur sous pression", "dvf"))
        elif ratio < 90:
            sigs.append(_mk("marche_decote_10pct", mut_date, f"-{round(100-ratio)}% vs m\u00e9diane", "Prix sous la m\u00e9diane sectorielle", "dvf"))
    if prix and p75 and prix > p75 and anc is not None and anc >= 4:
        sigs.append(_mk("dvf_achat_au_dessus_p75", mut_date, f"{round(prix)} \u20ac/m\u00b2", "Acquis au-dessus du P75 (pi\u00e8ge potentiel)", "dvf"))

    # --- PLU (urbanisme) ---
    if p.get("plu_zone_dense"):
        sigs.append(_mk("plu_zone_dense", today, p.get("plu_zone") or "U", "Zone urbaine dense (terrain valorisable)", "gpu_plu"))
    if p.get("plu_division_possible"):
        sigs.append(_mk("plu_division_possible", today, "oui", "Potentiel de division parcellaire", "gpu_plu"))

    # --- Risk (risque) ---
    if p.get("geo_inondation"):
        sigs.append(_mk("geo_inondation", today, "oui", "Zone \u00e0 risque inondation", "georisques"))
    if p.get("geo_mvt_terrain"):
        sigs.append(_mk("geo_mvt_terrain", today, "oui", "Risque mouvement de terrain", "georisques"))
    if p.get("geo_retrait_argile") == "fort":
        sigs.append(_mk("geo_retrait_argile_fort", today, "fort", "Retrait-gonflement argiles (fort)", "georisques"))

    # --- Foncier ---
    surf = p.get("surface_parcelle_m2")
    if surf and surf > 1000:
        sigs.append(_mk("dfi_grande_parcelle", today, f"{round(surf)} m\u00b2", "Grande parcelle (valeur cach\u00e9e / division)", "cadastre"))

    # --- Owner-linked (BODACC / INPI / copro) ---
    for s in p.get("_owner_signals", []) or []:
        sigs.append(s)

    return sigs
