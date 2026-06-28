# plan.md (reipila)

## 1. Objectives
- Valider et livrer **reipila** (ex-PropSignal v2) comme **SaaS d’intelligence immobilière map-first** pour la Métropole de Lyon, avec **données réelles** (zéro mock) : parcelle → enrichissements → signaux → **scoring déterministe** → **convergence log** → (si >=70) **interprétation Claude 4.5**.
- Finaliser un **frontend MVP fonctionnel** (priorité P0) conforme à `/app/design_guidelines.md` : **shell 3 colonnes**, carte MapLibre + cadastre, feed signaux, drawer d’intelligence, actions pipeline/IA.
- Assurer la **cohérence logique du workflow** (triangulation / scoring / logs) et la **traçabilité** (audit dans convergence log + ingestion_runs).
- Préparer la **mise en production** (hardening progressif) : performance carto, idempotence ingestion, tests E2E.

## 2. Implementation Steps

### Phase 1 — Core POC (Isolation, must pass before app)
**Statut : DONE** (réalisé et validé sur données réelles)
1. **API inventory + swagger capture**
   - CEREMA remplacé par APIs open data autonomes (data.gouv.fr / ADEME / Opendatasoft / IGN/GeoPF / GPU / Géorisques).
2. **Build `test_core.py` / POC réel**
   - POC exécuté avec succès, intégrations réelles, sans mocks.
3. **Scoring déterministe + convergence log**
   - `scoring_engine.py` implémenté (poids, recency, bonus convergence, context multipliers, classification).
4. **Claude 4.5 via Emergent**
   - `ai_service.py` opérationnel (interpret/pitch/memo), sorties en français ancrées dans le log.
5. **Stabilité (retry / budgets)**
   - Concurrence et caps implémentés côté ingestion (bornage appels API, enrich concurrency, deep risk cap).

**Phase 1 user stories (validées)**
- Script/ingestion récupère des données réelles Métropole de Lyon, produit parcelles + géométries.
- Score de conviction reproductible + log de convergence lisible.
- Interprétation Claude possible et stockable.

---

### Phase 2 — V1 App Development (MVP autour du core)
**Statut : Backend DONE / Frontend IN PROGRESS (P0)**

1. **Backend skeleton (FastAPI + MongoDB/motor)**
   - ✅ Déjà en place : `server.py`, `database.py`, `ingestion.py`, `open_data.py`, `scoring_engine.py`, `ai_service.py`.
   - ✅ Collections : users, communes, parcelles, parcelles_geometries, signals, convergence_logs, pipeline, pipeline_contacts, acquisitions, ingestion_runs.
   - ✅ Endpoints clés opérationnels :
     - Auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
     - Map: `/api/map/parcelles`
     - Feed: `/api/feed`
     - Parcelle: `/api/parcelles/{ref}`
     - Signals: `/api/signals`
     - Opportunities: `/api/opportunities`
     - Market: `/api/market`
     - Pipeline: `/api/pipeline` (+ patch/delete/contacts)
     - AI: `/api/ai/interpret`, `/api/ai/pitch`, `/api/ai/memo`
     - Ingestion: `/api/ingest`, `/api/ingest/runs`, `/api/ingest/status`
   - ✅ Données réelles confirmées : 185 parcelles, 754 signaux, 67 communes (incl. arrondissements Lyon), cadastre geometries ok.

2. **Progressive ingestion engine (58 communes Métropole de Lyon)**
   - ✅ En place et bornée : DVF → SCI → BODACC → enrichment (cadastre/DPE/PLU/risques) → scoring → persist.
   - 🔜 Ajustements futurs (P1/P2) : ingestion full 58 communes + scheduling + idempotence renforcée.

3. **Frontend V1 (référence UI map-first)**
   **Statut : Fondations DONE, compilation cassée (pages manquantes)**
   - ✅ Déjà en place : AuthContext, WorkspaceContext, API client (axios + bearer), AppShell, Sidebar, Topbar (search `/api/search`), PropMap (MapLibre + heatmap + clustering + calques raster cadastre IGN), IntelligenceDrawer (tabs + pipeline + IA), Login.
   - ❌ Bloquant actuel : `App.js` importe 7 pages inexistantes → webpack compile errors.

   **Travaux P0 à réaliser (Frontend MVP complet)**
   3.1 **Rebranding PropSignal → reipila**
   - Mettre à jour : libellés Topbar/Login, `index.html` title/description, éventuels noms dans UI.
   - Compte démo : passer de `demo@propsignal.app` à `demo@reipila.com` (et aligner backend startup seed).
   - Harmoniser storage token key si nécessaire (actuel `ps_token` — option : migrer vers `rp_token`, sinon conserver par compatibilité).

   3.2 **Créer les 7 pages manquantes (câblées aux endpoints réels)**
   - `Home` : vue principale **3 colonnes** (Left panel feed + Map + Right drawer). Utilise `/api/stats/overview`, `/api/feed`, `/api/map/parcelles`.
   - `MapPage` : carte plein écran + drawer persistante, filtres map.
   - `SignalsPage` : liste dense (tri par conviction) via `/api/signals` + sélection ouvre drawer (Sheet sur petits écrans).
   - `OpportunitiesPage` : liste via `/api/opportunities`, action “Générer mémo” (IA memo) + accès parcelle.
   - `PipelinePage` : “Execution Flow” (kanban) via `/api/pipeline`, update status via `PATCH /api/pipeline/{id}`, contacts.
   - `MarketPage` : analytics via `/api/market` + sparklines (Recharts) conformes guidelines.
   - `SettingsPage` : profil + **panneau ingestion** (déclencher `/api/ingest`, afficher `/api/ingest/runs` + `/api/ingest/status`).

   3.3 **Composants partagés / responsive**
   - Ajouter `useMediaQuery` (ou hook équivalent) pour gérer drawer en mode Sheet sur <lg.
   - Créer composants UI “denses” conformes aux guidelines :
     - `StatTiles` (3 tuiles en haut du panneau gauche)
     - `LiveFeed` (intelligence blocks, severity tags, chips)
     - `IntelligencePanel` wrapper : Drawer desktop + Sheet mobile.

   3.4 **Adapter `IntelligenceDrawer`**
   - Ajouter props (ex: `hideClose`, `embedded`, `onClose`) pour usage en panneau persistant vs Sheet.
   - Aligner champs “Signals” tab avec structure réelle backend (ex: `type_signal`, `categorie_signal`, `poids_effectif`).

   3.5 **Vérification compilation + UX smoke test**
   - Corriger imports `@/pages/*`.
   - Démarrer le frontend et vérifier absence d’erreurs console.
   - Vérifier : login démo → home → sélection parcelle sur map → drawer (overview/signals/log) → add pipeline → IA interpret.

4. **1st end-to-end test pass**
   - Exécuter une ingestion sur 1–2 communes supplémentaires via Settings.
   - Vérifier map (tuiles CARTO + cadastre IGN) + GeoJSON parcelles + sélection + drawer.
   - Appeler `testing_agent_v3` (frontend + backend E2E) après UI complète.

**Phase 2 user stories (cible MVP)**
- L’utilisateur se connecte (compte démo reipila) et accède à Home map-first.
- La carte affiche heatmap + clusters + cadastre, et les parcelles issues du backend réel.
- Un clic sur une parcelle ouvre le drawer avec raw inputs + convergence log.
- L’utilisateur peut ajouter une parcelle au Pipeline et générer une interprétation/pitch/mémo.
- L’utilisateur peut déclencher l’ingestion d’une commune depuis Settings et suivre les runs.

---

### Phase 3 — Auth + IA + Opportunités (extension)
**Statut : majoritairement DONE côté backend, à “productiser” côté UI**
1. **Auth (email+password, JWT)**
   - ✅ Déjà en place.
   - 🔜 (P1) Ajuster warning bcrypt/passlib si nécessaire (monitoring), durcir config prod.
2. **Claude features in-app**
   - ✅ Endpoints existants.
   - 🔜 (P1) UX : états de chargement, garde-fous (score>=70 si souhaité), persistance/affichage memo.
3. **Opportunities/Acquisitions MVP**
   - ✅ `acquisitions` déjà alimenté par ingestion.
   - 🔜 (P1) UI Opportunities + drill-down vers parcelle.
4. **Pipeline UX**
   - ✅ Endpoints existants.
   - 🔜 (P1) UI kanban + contacts timeline.
5. **2nd end-to-end test pass**
   - Login → map → drawer → IA → pipeline → contact log.

---

### Phase 4 — Hardening (production readiness)
1. **Workflow correctness suite**
   - Golden tests scoring + fixtures réelles (régression) + tests ingestion idempotence.
2. **API governance**
   - Caching (par parcelle/jour), circuit breakers, budgets par API, backoff.
3. **Data quality + observability**
   - Dash ingestion_runs, alerting schema drift, logs structurés.
4. **Performance carto**
   - Optimiser requêtes bbox + payload shaping; limiter features; options vector tiles future.
5. **Final testing**
   - Ingestion progressive des 58 communes + validation UI perf.

## 3. Next Actions
1. **P0** Créer les 7 pages manquantes + câbler Home/Map/Signals aux endpoints réels (corriger build).
2. **P0** Rebranding en **reipila** + compte démo `demo@reipila.com` (backend seed + UI par défaut).
3. **P0** Settings : panneau ingestion + runs/status.
4. **P0** Smoke test manuel complet (login → map → drawer → pipeline).
5. **P0** Lancer `testing_agent_v3` pour tests E2E (frontend + backend).
6. **P1** MarketPage + Pipeline kanban + Opportunities UI approfondie.
7. **P1/P2** Hardening : cache/rate limits, idempotence, perf carto, suite de régression.

## 4. Success Criteria
- Phase 1: ✅ POC et ingestion réelles validées (aucun mock), scoring déterministe, Claude OK.
- Phase 2: Frontend compile; Home/Map/Signals fonctionnels; cadastre + heatmap + clusters; drawer complet; ingestion pilotable; pipeline utilisable.
- Phase 3: IA intégrée proprement (UX + persistance), opportunités et pipeline opérationnels avec actions.
- Phase 4: Suite de régression passe; ingestion idempotente; perf map acceptable à l’échelle Métropole de Lyon; observabilité ingestion stable.
