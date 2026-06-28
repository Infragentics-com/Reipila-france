"""MongoDB (motor) connection + collections + helpers for PropSignal v2."""
import os
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "propsignal")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users = db.users
communes = db.communes
prix_marche_ref = db.prix_marche_ref
parcelles = db.parcelles
parcelles_geometries = db.parcelles_geometries
signals = db.signals
convergence_logs = db.convergence_logs
pipeline = db.pipeline
pipeline_contacts = db.pipeline_contacts
acquisitions = db.acquisitions
ingestion_runs = db.ingestion_runs


async def ensure_indexes():
    await users.create_index("email", unique=True)
    await communes.create_index("code_insee", unique=True)
    await parcelles.create_index("ref_cadastrale", unique=True)
    await parcelles.create_index("code_insee")
    await parcelles.create_index([("conviction_score", -1)])
    await parcelles.create_index([("location", "2dsphere")])
    await parcelles.create_index([("score_calculated_at", -1)])
    await parcelles_geometries.create_index("ref_cadastrale", unique=True)
    await signals.create_index("ref_cadastrale")
    await signals.create_index([("detected_at", -1)])
    await convergence_logs.create_index("ref_cadastrale")
    await pipeline.create_index([("user_id", 1), ("ref_cadastrale", 1)], unique=True)
    await pipeline.create_index("user_id")
    await ingestion_runs.create_index([("started_at", -1)])


def serialize(doc):
    """Convert a Mongo doc into a JSON-safe dict (drop _id, ISO datetimes)."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        out[k] = _conv(v)
    return out


def _conv(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, dict):
        return {k: _conv(x) for k, x in v.items() if k != "_id"}
    if isinstance(v, list):
        return [_conv(x) for x in v]
    return v
