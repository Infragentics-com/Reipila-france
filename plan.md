# plan.md

## 1. Objectives
- Prove the **core intelligence workflow** works with **real open-data APIs** (no mocks): parcelle → enrichments → signals → **deterministic conviction scoring** → **convergence log** → (if >=70) **Claude narrative**.
- Replace all CEREMA Tier-2 APIs with **open** data.gouv.fr dataservices (with **Swagger/metadata-verified field mappings**) and capture **rate limits / call budgets** per API.
- Deliver PropSignal v2 MVP with the **reference UI** (3-column, map-first, cadastre tiles, drawers, logs) and **progressive ingestion** for **58 communes Métropole de Lyon**.
- Ensure **workflow rigor** (triangulation order, recency rules, scoring math) with automated tests and audit logs.

## 2. Implementation Steps

### Phase 1 — Core POC (Isolation, must pass before app)
1. **API inventory + swagger capture**
   - For each API (BAN, APICarto Cadastre, GPU/PLU, DPE ADEME, Géorisques, BODACC Opendatasoft, Recherche-Entreprises, GeoAPI INSEE, Tabular API for RNIC + Cartofriches, geo-dvf static files, cquest fallback), store:
     - base URL, endpoints, auth (none), **rate limits**, pagination, and **field names** (swagger/schema dump).
   - Produce `api_registry.json` with canonical field mapping → internal normalized schema.
2. **Build `test_core.py` (real calls, no DB)**
   - Input: a Lyon address + optional INSEE code.
   - Steps: INSEE communes(58) → BAN geocode → Cadastre parcel geometry/ref → DPE lookup → DVF (geo-dvf file for commune/year + fallback cquest) → PLU zone → Géorisques risks → Entreprises (SCI/etat) → BODACC events → RNIC lookup (tabular rid) → Cartofriches (best-effort).
   - Normalize outputs into internal objects: `parcelle`, `enrichments`, `signals[]`.
3. **Implement deterministic scoring + convergence log module (POC)**
   - Encode exact weights, recency rules (incl. exceptions), convergence bonuses, context multipliers, thresholds.
   - Generate convergence steps ordered by `poids_effectif DESC`, with mapped category labels + weight labels.
   - Add unit assertions in script: hand-verified scoring cases (incl. negative signal) to prevent drift.
4. **Claude integration POC (Emergent key)**
   - If computed score >= 70: call Claude (anthropic `claude-sonnet-4-5-20250929`) to produce:
     - `claude_interpretation` in French (strictly grounded in convergence log inputs).
5. **Stability work: rate limiting + retries**
   - Add per-API token-bucket throttles + exponential backoff on 429/5xx.
   - Log actual call counts per run; confirm matches documented budgets.

**Phase 1 user stories**
- As an operator, I can run one script that fetches real data for a Lyon address and returns a parcel + geometry.
- As an operator, I can see all detected signals with raw inputs and effective weights.
- As an operator, I can reproduce the exact conviction score and convergence log deterministically.
- As an operator, I can validate API field mappings from swagger/schema snapshots.
- As an operator, I can generate a French narrative interpretation for high-conviction parcels.

### Phase 2 — V1 App Development (MVP around proven core, no auth yet)
1. **Backend skeleton (FastAPI + MongoDB/motor)**
   - Collections: communes, prix_marche_ref, parcelles, parcelles_geometries, signals, convergence_logs, signals_pipeline, signal_contacts, acquisitions_pipeline, ingestion_runs.
   - Modules: `api_clients/`, `normalizers/`, `scoring/`, `ingestion/`, `routes/`.
2. **Progressive ingestion engine (58 communes)**
   - Endpoint to enqueue ingestion by commune/bbox; worker loop with concurrency caps.
   - Dependency order: INSEE→cadastre→BAN→DVF→DPE→entreprises/BODACC→PLU→géorisques→copro/friches(best-effort)→signals→scoring→convergence_logs→pipeline assignment.
   - Persist `ingestion_runs` with per-API call counts and failures.
3. **Core read APIs**
   - `GET /communes` (with market stats placeholders if needed)
   - `GET /parcelles?bbox=` (GeoJSON for map)
   - `GET /signals/feed` (Home live feed)
   - `GET /parcelles/{ref}` (detail: overview, raw inputs, convergence log)
   - `POST /pipeline/add` + `PATCH /pipeline/status`
4. **Frontend V1 (reference UI)**
   - Layout: left nav + market feed, center MapLibre, right intelligence drawer.
   - Map: cadastre vector tiles + light basemap + clustering + heatmap overlay + layer toggles + filters.
   - Drawer: tabs (Overview/Signals/Analysis/Comparables/Notes), raw inputs, convergence log, actions.
5. **1st end-to-end test pass**
   - Run ingestion for 1–2 communes → verify map shows parcels/signals and drawer data.

**Phase 2 user stories**
- As a user, I can open the Map and see cadastre parcels with a conviction heatmap.
- As a user, I can filter signals (Seller Signals, Conviction 70%+) and see markers update.
- As a user, I can click a parcel and read raw signal inputs + convergence log steps.
- As a user, I can add a high-conviction parcel to the Execution Flow.
- As a user, I can monitor ingestion runs and see how many API calls were made.

### Phase 3 — Auth + AI features + Opportunities
1. **Auth (email+password, JWT)**
   - Signup/login, password hashing, protected endpoints.
2. **Claude features in-app (streaming)**
   - `POST /ai/interpret` (score>=70) and store in `convergence_logs`.
   - `POST /ai/pitch` for pipeline item.
   - `POST /ai/memo` for acquisitions.
3. **Opportunities/Acquisitions MVP**
   - Create `acquisitions_pipeline` entries from detected market discount / DPE renovation / land division heuristics.
4. **Pipeline UX**
   - Execution Flow board/list, contact logging, next action scheduling.
5. **2nd end-to-end test pass**
   - Full flow with auth: login → map → drawer → AI interpret → add to pipeline → contact log.

**Phase 3 user stories**
- As a user, I can sign up and my data is isolated to my account.
- As a user, I can request an AI interpretation that is grounded in the convergence log.
- As a user, I can generate an approach pitch for contacting an owner.
- As a user, I can track my execution stages and log outreach attempts.
- As a user, I can review Alpha Opportunities and generate an investment memo.

### Phase 4 — Hardening (production readiness)
1. **Workflow correctness suite**
   - Golden tests for scoring thresholds/bonuses/recency + regression fixtures from real parcels.
2. **API governance**
   - Centralized throttling, caching (per parcelle + per day), circuit breakers.
3. **Data quality + observability**
   - Structured logs, ingestion run dashboards, alerting on API schema drift.
4. **Performance**
   - Mongo 2dsphere indexes, bbox queries, payload shaping for map.
5. **Final testing**
   - Full Metro Lyon ingestion over time; verify UI remains responsive.

**Phase 4 user stories**
- As an admin/operator, I can detect API schema changes before they break workflows.
- As a user, I can load the map quickly even with large data volumes.
- As a user, I can trust the conviction score because it matches documented rules.
- As a user, I can see when signals were detected and what changed since last run.
- As an operator, I can re-run ingestion safely without duplications.

## 3. Next Actions
1. Build `api_registry.json` and collect swagger/schema snapshots for each selected open API.
2. Implement `test_core.py` and iterate until **all** integrations succeed reliably.
3. Lock scoring engine + convergence log with golden tests.
4. Start Phase 2 app build (backend+frontend) using the proven modules.

## 4. Success Criteria
- Phase 1: `test_core.py` succeeds 5x consecutively (different inputs) with real APIs; prints call counts and respects rate limits; conviction score matches expected unit cases.
- Phase 2: Map loads with cadastre tiles + parcels/signals; clicking a parcel shows raw inputs + convergence log; ingestion runs recorded.
- Phase 3: Auth works; Claude streaming works; AI outputs stored and visible; pipeline and acquisitions flows usable.
- Phase 4: Regression suite passes; ingestion is idempotent; performance acceptable with growing dataset.
