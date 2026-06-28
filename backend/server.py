"""PropSignal v2 — FastAPI backend (real-estate intelligence OS, Métropole de Lyon)."""
import os
import time
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, BackgroundTasks, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from dotenv import load_dotenv

import database as dbm
import ingestion as ing
import open_data as od
import ai_service as ai

load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET", "propsignal-dev-secret")
JWT_ALGO = "HS256"
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="reipila API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
api = APIRouter(prefix="/api")

_running = set()  # communes currently ingesting

def _now():
    return datetime.now(timezone.utc)


# ============================================================ Auth
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = "Analyste"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def make_token(user):
    payload = {"sub": user["id"], "email": user["email"],
               "exp": datetime.utcnow() + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(authorization: str = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await dbm.users.find_one({"id": payload.get("sub")})
    if not user:
        raise HTTPException(401, "User not found")
    return user


@api.post("/auth/signup")
async def signup(body: SignupIn):
    existing = await dbm.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email déjà utilisé")
    user = {"id": str(uuid.uuid4()), "email": body.email.lower(), "name": body.name,
            "password_hash": pwd.hash(body.password), "plan": "Pro Plan", "created_at": _now()}
    await dbm.users.insert_one(user)
    return {"token": make_token(user),
            "user": {"id": user["id"], "email": user["email"], "name": user["name"], "plan": user["plan"]}}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await dbm.users.find_one({"email": body.email.lower()})
    if not user or not pwd.verify(body.password, user["password_hash"]):
        raise HTTPException(401, "Identifiants invalides")
    return {"token": make_token(user),
            "user": {"id": user["id"], "email": user["email"], "name": user["name"], "plan": user.get("plan", "Pro Plan")}}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "plan": user.get("plan", "Pro Plan")}


# ============================================================ Communes
@api.get("/communes")
async def list_communes(user=Depends(current_user)):
    out = []
    cur = dbm.communes.find({}).sort("nom", 1)
    async for c in cur:
        out.append({
            "code_insee": c["code_insee"], "nom": c["nom"],
            "population": c.get("population"), "parent_insee": c.get("parent_insee"),
            "centroide_lon": c.get("centroide_lon"), "centroide_lat": c.get("centroide_lat"),
            "nb_parcelles": c.get("nb_parcelles", 0), "nb_signals_actifs": c.get("nb_signals_actifs", 0),
            "prix_m2_median_actuel": c.get("prix_m2_median_actuel"),
            "prix_m2_variation_6m": c.get("prix_m2_variation_6m"),
        })
    return {"communes": out}


# ============================================================ Ingestion
class IngestIn(BaseModel):
    code_insee: str


async def _ingest_task(code_insee):
    try:
        await ing.run_ingestion(code_insee)
    finally:
        _running.discard(code_insee)


@api.post("/ingest")
async def ingest(body: IngestIn, bg: BackgroundTasks, user=Depends(current_user)):
    code = body.code_insee
    c = await dbm.communes.find_one({"code_insee": code})
    if not c:
        raise HTTPException(404, "Commune inconnue")
    if code in _running:
        return {"status": "already_running", "code_insee": code}
    _running.add(code)
    bg.add_task(_ingest_task, code)
    return {"status": "started", "code_insee": code, "commune": c.get("nom")}


@api.get("/ingest/runs")
async def ingest_runs(user=Depends(current_user)):
    out = []
    cur = dbm.ingestion_runs.find({}).sort("started_at", -1).limit(20)
    async for r in cur:
        out.append(dbm.serialize(r))
    return {"runs": out, "running": list(_running)}


@api.get("/ingest/status")
async def ingest_status(user=Depends(current_user)):
    total_parcelles = await dbm.parcelles.count_documents({})
    ingested = await dbm.communes.count_documents({"nb_parcelles": {"$gt": 0}})
    return {"running": list(_running), "total_parcelles": total_parcelles, "communes_ingested": ingested}


# ============================================================ Map parcelles (GeoJSON)
def _severity(p):
    score = p.get("conviction_score", 0)
    dom = p.get("signal_dominant") or ""
    cats = p.get("signaux_types_actifs") or []
    if score >= 70:
        return "high_conviction"
    if dom.startswith("marche_decote"):
        return "market_anomaly"
    if len(set(cats)) >= 3:
        return "convergence_event"
    return "new_signal"


@api.get("/map/parcelles")
async def map_parcelles(
    bbox: str = Query(None, description="minLon,minLat,maxLon,maxLat"),
    min_conviction: int = 0,
    types: str = None,
    limit: int = 600,
    user=Depends(current_user),
):
    q = {"conviction_score": {"$gte": min_conviction}, "location": {"$ne": None}}
    if bbox:
        try:
            mnx, mny, mxx, mxy = [float(x) for x in bbox.split(",")]
            q["location"] = {"$geoWithin": {"$box": [[mnx, mny], [mxx, mxy]]}}
        except Exception:
            pass
    if types:
        wanted = [t.strip() for t in types.split(",") if t.strip()]
        if wanted:
            q["signaux_types_actifs"] = {"$in": wanted}
    docs = []
    refs = []
    cur = dbm.parcelles.find(q).sort("conviction_score", -1).limit(min(limit, 1500))
    async for p in cur:
        docs.append(p)
        refs.append(p["ref_cadastrale"])
    geoms = {}
    if refs:
        gcur = dbm.parcelles_geometries.find({"ref_cadastrale": {"$in": refs}})
        async for g in gcur:
            geoms[g["ref_cadastrale"]] = g.get("geom")
    feats = []
    for p in docs:
        ref = p["ref_cadastrale"]
        props = {
            "ref_cadastrale": ref, "conviction_score": p.get("conviction_score", 0),
            "conviction_level": p.get("conviction_level"), "commune_nom": p.get("commune_nom"),
            "signal_dominant": p.get("signal_dominant"), "severity": _severity(p),
            "nb_signaux_actifs": p.get("nb_signaux_actifs", 0),
            "longitude": p.get("longitude"), "latitude": p.get("latitude"),
        }
        geom = geoms.get(ref)
        if geom:
            feats.append({"type": "Feature", "geometry": geom, "properties": props})
        elif p.get("longitude") and p.get("latitude"):
            feats.append({"type": "Feature",
                          "geometry": {"type": "Point", "coordinates": [p["longitude"], p["latitude"]]},
                          "properties": props})
    return {"type": "FeatureCollection", "features": feats}


def _percentile(sorted_vals, pct):
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    k = (len(sorted_vals) - 1) * (pct / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


# ============================================================ Parcelle detail
@api.get("/parcelles/{ref}")
async def parcelle_detail(ref: str, user=Depends(current_user)):
    p = await dbm.parcelles.find_one({"ref_cadastrale": ref})
    if not p:
        raise HTTPException(404, "Parcelle inconnue")
    sigs = []
    cur = dbm.signals.find({"ref_cadastrale": ref}).sort("poids_effectif", -1)
    async for s in cur:
        sigs.append(dbm.serialize(s))
    log = await dbm.convergence_logs.find_one({"ref_cadastrale": ref})
    geom = await dbm.parcelles_geometries.find_one({"ref_cadastrale": ref})
    # --- Robust comparables: same commune + same property type, surface +/-40%,
    #     IQR outlier removal -> robust pre-estimation + decote vs comparables ---
    raw = []
    ccur = dbm.parcelles.find({
        "code_insee": p.get("code_insee"), "type_bien": p.get("type_bien"),
        "dvf_prix_m2": {"$ne": None}, "ref_cadastrale": {"$ne": ref}}).limit(120)
    async for c in ccur:
        pm = c.get("dvf_prix_m2")
        if pm and pm > 0:
            raw.append(c)
    surf = p.get("surface_bati_m2")
    pool = raw
    if surf:
        lo_s, hi_s = surf * 0.6, surf * 1.4
        sf = [c for c in raw if c.get("surface_bati_m2") and lo_s <= c["surface_bati_m2"] <= hi_s]
        if len(sf) >= 4:
            pool = sf
    comps_stats = None
    kept = pool
    prices = sorted(c["dvf_prix_m2"] for c in pool)
    if len(prices) >= 4:
        q1 = _percentile(prices, 25)
        q3 = _percentile(prices, 75)
        iqr = q3 - q1
        lo_b, hi_b = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        kept = [c for c in pool if lo_b <= c["dvf_prix_m2"] <= hi_b] or pool
        kp = sorted(c["dvf_prix_m2"] for c in kept)
        med_c = _percentile(kp, 50)
        p25_c = _percentile(kp, 25)
        p75_c = _percentile(kp, 75)
        cur_pm = p.get("dvf_prix_m2")
        decote_c = round((1 - cur_pm / med_c) * 100, 1) if (cur_pm and med_c) else None
        comps_stats = {
            "n_total": len(pool), "n_retenus": len(kept), "n_aberrants": len(pool) - len(kept),
            "prix_m2_median": round(med_c), "prix_m2_p25": round(p25_c), "prix_m2_p75": round(p75_c),
            "pre_estimation_basse": round(p25_c * surf) if surf else None,
            "pre_estimation_median": round(med_c * surf) if surf else None,
            "pre_estimation_haute": round(p75_c * surf) if surf else None,
            "decote_vs_comparables_pct": decote_c,
        }
    comps = [{"ref_cadastrale": c["ref_cadastrale"], "dvf_prix_m2": c.get("dvf_prix_m2"),
              "dvf_date_derniere_mutation": c.get("dvf_date_derniere_mutation"),
              "surface_bati_m2": c.get("surface_bati_m2"), "conviction_score": c.get("conviction_score")}
             for c in sorted(kept, key=lambda x: x["dvf_prix_m2"])[:8]]
    acq = await dbm.acquisitions.find_one({"ref_cadastrale": ref})
    return {
        "parcelle": dbm.serialize(p),
        "signals": sigs,
        "convergence_log": dbm.serialize(log),
        "geometry": geom.get("geom") if geom else None,
        "comparables": comps,
        "comparables_stats": comps_stats,
        "acquisition": dbm.serialize(acq),
        "severity": _severity(p),
    }


# ============================================================ Neighborhood news (RSS)
_NEWS_CACHE = {}  # key -> (timestamp, items)
_NEWS_TTL = 900   # 15 min


@api.get("/news")
async def news(commune: str = "", q: str = "", user=Depends(current_user)):
    """Real-estate news for a neighborhood/commune via Google News RSS (keyless)."""
    key = f"{commune}|{q}"
    now = time.time()
    cached = _NEWS_CACHE.get(key)
    if cached and now - cached[0] < _NEWS_TTL:
        return {"items": cached[1], "query": cached[2], "cached": True}
    if q:
        query = q
    elif commune:
        query = f"immobilier {commune}"
    else:
        query = "marché immobilier Lyon"
    items = await od.fetch_news(query)
    if not items:
        # fallback to a broader query
        items = await od.fetch_news("marché immobilier prix " + (commune or "Lyon"))
    _NEWS_CACHE[key] = (now, items, query)
    return {"items": items, "query": query, "cached": False}


# ============================================================ Live feed
def _feed_title(sev):
    return {"high_conviction": "Signal vendeur fort détecté",
            "convergence_event": "Convergence de signaux dans la zone",
            "new_signal": "Vendeur potentiel identifié",
            "market_anomaly": "Anomalie de prix détectée"}.get(sev, "Signal détecté")


def _chip_label(t):
    m = {
        "bodacc_liquidation": "Liquidation", "bodacc_dissolution": "SCI dissolution",
        "bodacc_redressement": "Redressement", "bodacc_radiation": "Radiation",
        "inpi_sci_cessation": "SCI cessée", "inpi_gerant_senior": "Gérant senior",
        "dpe_g": "DPE G", "dpe_f": "DPE F", "dpe_e": "DPE E", "dpe_expire": "DPE expiré", "dpe_absent": "DPE absent",
        "dvf_long_hold_20ans_plus": "Détention >20a", "dvf_long_hold_15_20ans": "Détention 15-20a",
        "dvf_long_hold_10_15ans": "Détention 10-15a", "dvf_achat_recent_3ans": "Achat récent",
        "dvf_achat_au_dessus_p75": "Acheté cher",
        "marche_decote_10pct": "Décote -10%", "marche_decote_20pct": "Décote -20%", "marche_decote_30pct": "Décote -30%",
        "plu_zone_dense": "Zone dense", "plu_division_possible": "Division possible",
        "geo_inondation": "Inondation", "geo_mvt_terrain": "Mvt terrain", "geo_retrait_argile_fort": "Argiles fort",
        "dfi_grande_parcelle": "Grande parcelle",
    }
    return m.get(t, t)


@api.get("/feed")
async def feed(limit: int = 25, event: str = None, user=Depends(current_user)):
    q = {"conviction_score": {"$gte": 40}}
    out = []
    cur = dbm.parcelles.find(q).sort("score_calculated_at", -1).limit(200)
    async for p in cur:
        sev = _severity(p)
        if event and event != "all" and sev != event:
            continue
        chips = [_chip_label(t) for t in (p.get("signaux_types_actifs") or [])[:3]]
        out.append({
            "ref_cadastrale": p["ref_cadastrale"], "severity": sev,
            "title": _feed_title(sev), "commune_nom": p.get("commune_nom"),
            "conviction_score": p.get("conviction_score"), "conviction_level": p.get("conviction_level"),
            "chips": chips, "signal_dominant": p.get("signal_dominant"),
            "detected_at": (p.get("score_calculated_at").isoformat() if p.get("score_calculated_at") else None),
            "adresse_ban": p.get("adresse_ban"),
            "longitude": p.get("longitude"), "latitude": p.get("latitude"),
        })
        if len(out) >= limit:
            break
    return {"feed": out}


# ============================================================ Stats overview
@api.get("/stats/overview")
async def stats_overview(user=Depends(current_user)):
    since24 = _now() - timedelta(hours=24)
    new_24 = await dbm.parcelles.count_documents({"score_calculated_at": {"$gte": since24}, "conviction_score": {"$gte": 40}})
    high = await dbm.parcelles.count_documents({"conviction_score": {"$gte": 70}})
    total = await dbm.parcelles.count_documents({})
    conv = 0
    async for _ in dbm.parcelles.aggregate([
        {"$project": {"conviction_score": 1,
                      "n": {"$size": {"$setUnion": [{"$ifNull": ["$signaux_types_actifs", []]}, []]}}}},
        {"$match": {"n": {"$gte": 3}, "conviction_score": {"$gte": 55}}}, {"$count": "c"}]):
        conv = _["c"]
    return {"new_signals_24h": new_24, "high_conviction": high, "convergence_events": conv, "total_parcelles": total}


# ============================================================ Signals list
@api.get("/signals")
async def signals_list(min_conviction: int = 0, level: str = None, limit: int = 60, user=Depends(current_user)):
    q = {"conviction_score": {"$gte": min_conviction}, "nb_signaux_actifs": {"$gte": 1}}
    if level:
        q["conviction_level"] = level
    out = []
    cur = dbm.parcelles.find(q).sort("conviction_score", -1).limit(limit)
    async for p in cur:
        out.append({
            "ref_cadastrale": p["ref_cadastrale"], "commune_nom": p.get("commune_nom"),
            "conviction_score": p.get("conviction_score"), "conviction_level": p.get("conviction_level"),
            "classification": p.get("classification"), "severity": _severity(p),
            "chips": [_chip_label(t) for t in (p.get("signaux_types_actifs") or [])[:4]],
            "signal_dominant": p.get("signal_dominant"), "nb_signaux_actifs": p.get("nb_signaux_actifs"),
            "adresse_ban": p.get("adresse_ban"), "type_bien": p.get("type_bien"),
            "dvf_prix_m2": p.get("dvf_prix_m2"), "longitude": p.get("longitude"), "latitude": p.get("latitude"),
        })
    return {"signals": out}


# ============================================================ Opportunities / Acquisitions
@api.get("/opportunities")
async def opportunities(type_opp: str = None, limit: int = 60, user=Depends(current_user)):
    q = {}
    if type_opp:
        q["types_opportunite"] = type_opp
    out = []
    cur = dbm.acquisitions.find(q).sort("score_acquisition", -1).limit(limit)
    async for a in cur:
        out.append(dbm.serialize(a))
    return {"opportunities": out}


# ============================================================ Market analytics
@api.get("/market")
async def market(user=Depends(current_user)):
    communes = []
    cur = dbm.communes.find({"nb_parcelles": {"$gt": 0}}).sort("nb_signals_actifs", -1)
    async for c in cur:
        communes.append({
            "code_insee": c["code_insee"], "nom": c["nom"],
            "prix_m2_median_actuel": c.get("prix_m2_median_actuel"),
            "prix_m2_variation_6m": c.get("prix_m2_variation_6m"),
            "nb_parcelles": c.get("nb_parcelles", 0), "nb_signals_actifs": c.get("nb_signals_actifs", 0),
        })
    levels = {}
    for lv in ["monitoring", "low", "medium", "high", "critical"]:
        levels[lv] = await dbm.parcelles.count_documents({"conviction_level": lv})
    breakdown = []
    async for row in dbm.parcelles.aggregate([
            {"$unwind": "$signaux_types_actifs"},
            {"$group": {"_id": "$signaux_types_actifs", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 12}]):
        breakdown.append({"type": row["_id"], "label": _chip_label(row["_id"]), "count": row["count"]})
    return {"communes": communes, "conviction_levels": levels, "signal_breakdown": breakdown}


# ============================================================ Pipeline (Execution Flow) — per user
class PipelineAddIn(BaseModel):
    ref_cadastrale: str


class PipelineUpdateIn(BaseModel):
    status: str = None
    notes: str = None
    next_action_type: str = None
    next_action_date: str = None


class ContactIn(BaseModel):
    canal: str
    resultat: str
    notes: str = None


@api.get("/pipeline")
async def pipeline_list(user=Depends(current_user)):
    out = []
    cur = dbm.pipeline.find({"user_id": user["id"]}).sort("updated_at", -1)
    async for item in cur:
        p = await dbm.parcelles.find_one({"ref_cadastrale": item["ref_cadastrale"]})
        out.append({**dbm.serialize(item),
                    "parcelle": {"commune_nom": (p or {}).get("commune_nom"),
                                 "conviction_score": (p or {}).get("conviction_score"),
                                 "conviction_level": (p or {}).get("conviction_level"),
                                 "adresse_ban": (p or {}).get("adresse_ban"),
                                 "signal_dominant": (p or {}).get("signal_dominant")}})
    return {"pipeline": out}


@api.post("/pipeline")
async def pipeline_add(body: PipelineAddIn, user=Depends(current_user)):
    p = await dbm.parcelles.find_one({"ref_cadastrale": body.ref_cadastrale})
    if not p:
        raise HTTPException(404, "Parcelle inconnue")
    existing = await dbm.pipeline.find_one({"user_id": user["id"], "ref_cadastrale": body.ref_cadastrale})
    if existing:
        return {"status": "exists", "id": existing["id"]}
    item = {"id": str(uuid.uuid4()), "user_id": user["id"], "ref_cadastrale": body.ref_cadastrale,
            "status": "sourced", "conviction_at_creation": p.get("conviction_score"),
            "notes": "", "created_at": _now(), "updated_at": _now()}
    await dbm.pipeline.insert_one(item)
    return {"status": "added", "id": item["id"]}


@api.patch("/pipeline/{item_id}")
async def pipeline_update(item_id: str, body: PipelineUpdateIn, user=Depends(current_user)):
    upd = {k: v for k, v in body.dict().items() if v is not None}
    upd["updated_at"] = _now()
    res = await dbm.pipeline.update_one({"id": item_id, "user_id": user["id"]}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Item inconnu")
    return {"status": "updated"}


@api.delete("/pipeline/{item_id}")
async def pipeline_delete(item_id: str, user=Depends(current_user)):
    await dbm.pipeline.delete_one({"id": item_id, "user_id": user["id"]})
    await dbm.pipeline_contacts.delete_many({"pipeline_id": item_id})
    return {"status": "deleted"}


@api.post("/pipeline/{item_id}/contact")
async def pipeline_contact(item_id: str, body: ContactIn, user=Depends(current_user)):
    item = await dbm.pipeline.find_one({"id": item_id, "user_id": user["id"]})
    if not item:
        raise HTTPException(404, "Item inconnu")
    c = {"id": str(uuid.uuid4()), "pipeline_id": item_id, "canal": body.canal,
         "resultat": body.resultat, "notes": body.notes, "contact_at": _now()}
    await dbm.pipeline_contacts.insert_one(c)
    await dbm.pipeline.update_one({"id": item_id}, {"$set": {"last_action_at": _now(), "last_action_type": body.canal, "updated_at": _now()}})
    return {"status": "logged"}


@api.get("/pipeline/{item_id}/contacts")
async def pipeline_contacts_list(item_id: str, user=Depends(current_user)):
    out = []
    cur = dbm.pipeline_contacts.find({"pipeline_id": item_id}).sort("contact_at", -1)
    async for c in cur:
        out.append(dbm.serialize(c))
    return {"contacts": out}


# ============================================================ AI (Claude via Emergent)
class AIIn(BaseModel):
    ref_cadastrale: str


async def _load_for_ai(ref):
    p = await dbm.parcelles.find_one({"ref_cadastrale": ref})
    if not p:
        raise HTTPException(404, "Parcelle inconnue")
    log = await dbm.convergence_logs.find_one({"ref_cadastrale": ref})
    return dbm.serialize(p), dbm.serialize(log) or {}


@api.post("/ai/interpret")
async def ai_interpret(body: AIIn, user=Depends(current_user)):
    p, log = await _load_for_ai(body.ref_cadastrale)
    conv = {"conviction_score": log.get("conviction_score_final"), "classification": log.get("classification"),
            "recommended_action": log.get("recommended_action"), "steps": log.get("steps", [])}
    acq = await dbm.acquisitions.find_one({"ref_cadastrale": body.ref_cadastrale})
    try:
        text = await ai.interpret(p, conv, dbm.serialize(acq) or {})
    except Exception as e:
        raise HTTPException(502, f"IA indisponible: {str(e)[:160]}")
    await dbm.convergence_logs.update_one({"ref_cadastrale": body.ref_cadastrale},
                                          {"$set": {"claude_interpretation": text, "claude_called_at": _now()}})
    return {"interpretation": text}


@api.post("/ai/pitch")
async def ai_pitch(body: AIIn, user=Depends(current_user)):
    p, log = await _load_for_ai(body.ref_cadastrale)
    conv = {"conviction_score": log.get("conviction_score_final"), "steps": log.get("steps", [])}
    try:
        text = await ai.pitch(p, conv)
    except Exception as e:
        raise HTTPException(502, f"IA indisponible: {str(e)[:160]}")
    return {"pitch": text}


@api.post("/ai/memo")
async def ai_memo(body: AIIn, user=Depends(current_user)):
    p, log = await _load_for_ai(body.ref_cadastrale)
    acq = await dbm.acquisitions.find_one({"ref_cadastrale": body.ref_cadastrale})
    conv = {"conviction_score": log.get("conviction_score_final"), "steps": log.get("steps", [])}
    try:
        text = await ai.memo(p, conv, dbm.serialize(acq) or {})
    except Exception as e:
        raise HTTPException(502, f"IA indisponible: {str(e)[:160]}")
    if acq:
        await dbm.acquisitions.update_one({"ref_cadastrale": body.ref_cadastrale},
                                          {"$set": {"memo_apport": text, "memo_generated_at": _now()}})
    return {"memo": text}


# ============================================================ Search
def _search_item(p):
    return {"type": "parcelle", "ref_cadastrale": p["ref_cadastrale"], "commune_nom": p.get("commune_nom"),
            "conviction_score": p.get("conviction_score"), "adresse_ban": p.get("adresse_ban"),
            "longitude": p.get("longitude"), "latitude": p.get("latitude")}


@api.get("/search")
async def search(q: str, user=Depends(current_user)):
    q = (q or "").strip()
    if not q:
        return {"results": []}
    direct = await dbm.parcelles.find_one({"ref_cadastrale": q})
    if direct:
        return {"results": [_search_item(direct)]}
    res = []
    cur = dbm.parcelles.find({"$or": [
        {"adresse_ban": {"$regex": q, "$options": "i"}},
        {"commune_nom": {"$regex": q, "$options": "i"}},
        {"raison_sociale": {"$regex": q, "$options": "i"}},
    ]}).sort("conviction_score", -1).limit(10)
    async for p in cur:
        res.append(_search_item(p))
    geo = None
    if not res:
        try:
            g = await od.geocode(q)
            if g:
                geo = {"type": "geocode", "label": g["label"], "longitude": g["lon"], "latitude": g["lat"]}
        except Exception:
            pass
    return {"results": res, "geocode": geo}


@api.get("/health")
async def health():
    return {"status": "ok", "service": "propsignal", "time": _now().isoformat()}


app.include_router(api)


# ============================================================ Startup
@app.on_event("startup")
async def startup():
    await dbm.ensure_indexes()
    if not await dbm.users.find_one({"email": "demo@reipila.com"}):
        await dbm.users.insert_one({"id": str(uuid.uuid4()), "email": "demo@reipila.com",
                                    "name": "Bryan P.", "password_hash": pwd.hash("demo1234"),
                                    "plan": "Pro Plan", "created_at": _now()})

    async def _bootstrap():
        try:
            n = await dbm.communes.count_documents({})
            if n < 50:
                await ing.seed_communes()
            if await dbm.parcelles.count_documents({}) == 0:
                for code in ["69386", "69387"]:
                    _running.add(code)
                    try:
                        await ing.run_ingestion(code)
                    finally:
                        _running.discard(code)
        except Exception as e:
            print("bootstrap error:", e)

    asyncio.create_task(_bootstrap())


@app.on_event("shutdown")
async def shutdown():
    await od.close_client()
