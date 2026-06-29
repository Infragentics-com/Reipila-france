<div align="center">

```
██████╗ ███████╗██╗██████╗ ██╗██╗      █████╗
██╔══██╗██╔════╝██║██╔══██╗██║██║     ██╔══██╗
██████╔╝█████╗  ██║██████╔╝██║██║     ███████║
██╔══██╗██╔══╝  ██║██╔═══╝ ██║██║     ██╔══██║
██║  ██║███████╗██║██║     ██║███████╗██║  ██║
╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
```

**Real Estate Intelligent Platform for Investment and Lead Acquisition**

*Intelligence foncière temps réel · Métropole de Lyon · 58 communes*

---

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor_3.3-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-5.24-396CB2?style=flat-square)](https://maplibre.org)
[![Claude](https://img.shields.io/badge/Claude-claude--haiku--4--5_%7C_claude--sonnet--4--6-D97706?style=flat-square)](https://anthropic.com)
[![Status](https://img.shields.io/badge/MVP-Phase_2_✅_98%25-16A34A?style=flat-square)]()
[![License](https://img.shields.io/badge/License-Proprietary-EF4444?style=flat-square)]()

</div>

---

## Ce que c'est

Reipila n'est pas un CRM. Ce n'est pas un outil de gestion de leads.

C'est un **système d'intelligence foncière temps réel** — un Bloomberg Terminal pour la prospection immobilière et la détection d'opportunités d'investissement dans la **Métropole de Lyon**.

Le produit croise des données publiques (DVF, DPE, BODACC, PLU, Géorisques, Cadastre) pour répondre à deux questions que les professionnels de l'immobilier posent chaque matin :

> **"Qui va vendre avant de le savoir ?"**
> **"Quel bien vaut plus que son prix affiché ?"**

La réponse : un **Conviction Score déterministe**, un **Signal Convergence Log traçable**, et si le score ≥ 70, une **interprétation Claude** — pitch téléphonique ou mémo d'apport investisseur.

---

## Deux moteurs. Une interface.

```
┌─────────────────────────────────────────────────────────────────┐
│                         REIPILA                                 │
│                                                                 │
│   ┌─────────────────────┐     ┌─────────────────────────────┐  │
│   │   SIGNALS ENGINE    │     │    ACQUISITIONS ENGINE      │  │
│   │                     │     │                             │  │
│   │  Détecte les        │     │  Détecte les biens dont     │  │
│   │  propriétaires qui  │     │  la valeur réelle dépasse   │  │
│   │  vont vendre avant  │     │  le prix de marché          │  │
│   │  de le savoir       │     │                             │  │
│   │                     │     │  → Mémo d'apport IA         │  │
│   │  → Pitch Claude     │     │  → Simulation financière    │  │
│   └─────────────────────┘     └─────────────────────────────┘  │
│                                                                 │
│         185 parcelles · 754 signaux · 67 communes              │
│                    Données réelles · Zéro mock                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
reipila/
├── backend/                    # FastAPI + MongoDB (Motor async)
│   ├── server.py               # API principale + Auth JWT
│   ├── database.py             # Connexion MongoDB + collections
│   ├── ingestion.py            # Pipeline d'enrichissement progressif
│   ├── open_data.py            # Intégrations APIs publiques
│   ├── scoring_engine.py       # Moteur de scoring déterministe
│   ├── ai_service.py           # Intégration Claude (interpret/pitch/memo)
│   ├── poc_core.py             # POC de validation Phase 1
│   └── requirements.txt
│
├── frontend/                   # React 19 + MapLibre GL + Tailwind
│   ├── src/
│   │   ├── pages/              # 7 pages (Home, Map, Signals, Opportunities,
│   │   │                       #          Pipeline, Market, Settings)
│   │   ├── components/         # AppShell, Sidebar, Topbar, PropMap,
│   │   │                       # IntelligenceDrawer, StatTiles, LiveFeed
│   │   ├── context/            # AuthContext, WorkspaceContext
│   │   ├── hooks/              # useMediaQuery + hooks métier
│   │   └── lib/                # Axios client + utils
│   ├── package.json
│   └── tailwind.config.js
│
├── memory/                     # Contexte projet pour agents IA
├── tests/                      # Suite de tests E2E
├── plan.md                     # Roadmap et statut par phase
├── design_guidelines.md        # Design system complet (JSON)
└── backend_test.py             # Tests API (demo@reipila.com / demo1234)
```

---

## Stack technique

### Backend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework API | FastAPI | 0.110.1 |
| Base de données | MongoDB (Motor async) | 3.3.1 |
| Auth | JWT (PyJWT) + bcrypt (passlib) | — |
| Data pipeline | Requests + Pandas + NumPy | — |
| LLM | Anthropic Claude (emergentintegrations) | claude-haiku-4-5 / claude-sonnet-4-6 |
| Runtime | Uvicorn | 0.25.0 |

### Frontend

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | React | 19.0.0 |
| Routeur | React Router DOM | 7.15.0 |
| Cartographie | MapLibre GL JS | 5.24.0 |
| UI Components | Radix UI (shadcn/ui) | — |
| Animations | Framer Motion | 11.18.0 |
| Graphes | Recharts | 3.6.0 |
| Data fetching | Axios + SWR + TanStack Query | — |
| Styles | Tailwind CSS + CRACO | 3.4.17 |
| Build | CRACO (Create React App override) | 7.1.0 |

### Design System

```
Typographie :
  Space Grotesk   → Labels UI, navigation, boutons
  Inter           → Corps de texte, descriptions, feed
  JetBrains Mono  → Signal Convergence Log, IDs parcelles, timestamps

Palette (locked) :
  Background  #F5F5F7   Surface    #FFFFFF
  Accent      #6366F1   Success    #16A34A
  Warning     #F59E0B   Critical   #EF4444
  Text        #111827   Muted      #6B7280

Carte :
  Fond de carte   CARTO Voyager
  Cadastre        IGN GeoPF (raster overlay)
  Heatmap         MapLibre GL JS native
  Clustering      MapLibre cluster source
```

---

## Collections MongoDB

```
users               → Comptes utilisateurs (JWT auth)
communes            → 67 communes Métropole de Lyon (+ arrondissements Lyon)
parcelles           → Entité centrale (ref_cadastrale unique)
parcelles_geometries → Polygones cadastraux GeoJSON (IGN)
signals             → Événements détectés par parcelle (horodatés)
convergence_logs    → Logs de convergence déterministes (5 steps)
pipeline            → Execution Flow (mandats en cours)
pipeline_contacts   → Historique des tentatives de contact
acquisitions        → Opportunités d'acquisition détectées
ingestion_runs      → Audit de chaque exécution de pipeline
```

---

## API Reference

### Auth
```
POST  /api/auth/signup       Créer un compte
POST  /api/auth/login        Connexion → JWT token (30 jours)
GET   /api/auth/me           Profil utilisateur courant
```

### Intelligence
```
GET   /api/stats/overview    KPIs globaux (new signals, high conviction, convergence events)
GET   /api/feed              Live intelligence feed (signaux récents horodatés)
GET   /api/map/parcelles     GeoJSON parcelles pour MapLibre (filtrable par bbox)
GET   /api/parcelles/{ref}   Dossier complet d'une parcelle (ref_cadastrale)
GET   /api/signals           Liste des signaux actifs (tri par conviction)
GET   /api/opportunities     Acquisitions détectées (tri par score)
GET   /api/market            Analytics marché DVF par commune
GET   /api/search            Recherche globale (adresse, parcelle, commune)
```

### Pipeline
```
GET   /api/pipeline          Execution Flow complet
PATCH /api/pipeline/{id}     Mettre à jour le statut d'un signal
DELETE /api/pipeline/{id}    Retirer du pipeline
POST  /api/pipeline/{id}/contacts  Ajouter un contact (appel/courrier/email)
```

### IA (Claude)
```
POST  /api/ai/interpret      Interprétation de situation (claude-haiku-4-5)
POST  /api/ai/pitch          Pitch téléphonique d'approche (claude-haiku-4-5)
POST  /api/ai/memo           Mémo d'apport investisseur (claude-sonnet-4-6)
```

*Note : les endpoints IA déclenchent Claude uniquement si conviction_score ≥ 70.*

### Ingestion
```
POST  /api/ingest            Déclencher l'ingestion d'une commune
GET   /api/ingest/runs       Historique des ingestion_runs
GET   /api/ingest/status     Statut des ingestions en cours
```

---

## Moteur de Scoring

Le scoring est **100% déterministe** — aucun LLM dans la boucle de calcul. Claude intervient uniquement en post-traitement (interprétation narrative).

### Table des signaux et poids

| Signal | Poids brut | Catégorie |
|--------|-----------|-----------|
| `bodacc_liquidation` | **45** | Judiciaire |
| `bodacc_dissolution` | **40** | Judiciaire |
| `bodacc_redressement` | 35 | Judiciaire |
| `bodacc_radiation` | 35 | Judiciaire |
| `inpi_sci_cessation` | 38 | Structure |
| `dpe_g` | **35** | Réglementaire |
| `dpe_f` | 25 | Réglementaire |
| `copro_procedure_carence` | 30 | Structure |
| `dvf_achat_au_dessus_p75` | 22 | Temporel |
| `copro_procedure_alerte` | 20 | Structure |
| `marche_decote_10pct` | 18 | Marché |
| `inpi_gerant_senior` | 12 | Structure |
| `dvf_long_hold_20ans_plus` | 15 | Temporel |
| `geo_mvt_terrain` | 12 | Risque |
| `plu_zone_dense` | 12 | Urbanisme |
| `dvf_long_hold_15_20ans` | 12 | Temporel |
| `dvf_achat_recent_3ans` | **-10** | Temporel (signal inverse) |

### Recency Decay

```
Signal temporel (dvf_long_hold_*)    → factor = 1.00 (pas de decay — l'âge EST le signal)

Signal judiciaire (bodacc_*, inpi_*) → 0-90j : 1.00 | 91-180j : 0.85 | >180j : 0.60

Autres signaux :
  0-30j   → 1.00     31-120j  → 0.85
  121-180j → 0.70    181-365j → 0.55
  1-2ans  → 0.40     2-5ans   → 0.20    >5ans → 0.08
```

### Formule de conviction

```
score_brut         = Σ(poids_brut × recency_factor) pour tous signaux actifs
bonus_convergence  = +10% si ≥2 signaux judiciaires
                   = +8%  si ≥2 catégories différentes
                   = +15% si ≥3 catégories différentes
context_multiplier = ×1.10 si marché +5%/6mois | ×1.12 si marché -5%/6mois

conviction_score   = MIN(100, ROUND(score_brut × (1+bonus) × context))
```

### Niveaux de conviction

```
0-39  → monitoring   WATCH LIST
40-54 → low          LOW PROBABILITY SELLER
55-69 → medium       MEDIUM PROBABILITY SELLER
70-84 → high         HIGH PROBABILITY SELLER        → Claude pitch activé
85-100→ critical     CRITICAL — CONTACT TODAY       → Alerte prioritaire
```

---

## Signal Convergence Log

Chaque parcelle scorée génère un log structuré **avant** tout appel Claude.
C'est le différenciateur principal du produit : **zéro boîte noire**.

```
SIGNAL CONVERGENCE LOG — Lyon 6e · Parcelle 69123000BY1234

[STEP 1] Ownership Analysis
         → long-term holding detected (21 years)            [HIGH WEIGHT]   ✓
[STEP 2] Legal Registry Scan
         → SCI dissolution event found (BODACC 15/03/2026)  [CRITICAL]      ✓
[STEP 3] Energy Performance Data
         → DPE G — 312 kWh/m²/an (obligation jan 2025)      [HIGH WEIGHT]   ✓
[STEP 4] Market Comparison
         → price below sector median (-18% vs P50 DVF)      [STANDARD]      ✓
[STEP 5] Temporal Factor
         → recent legal change (recency boost applied)       [RECENCY BOOST] ✓

→ Score brut          68.4
→ Bonus convergence   +13% (3 catégories actives)
→ Context multiplier  ×1.10 (marché +6.2%/6mois)
→ Conviction Score    82 / 100
→ Classification      HIGH PROBABILITY SELLER
→ Action recommandée  Appel cette semaine + préparer pitch
```

---

## Sources de données

Toutes les sources sont **open data**, sans scraping.

| Source | Usage | Fréquence |
|--------|-------|-----------|
| **DPE ADEME** (data.ademe.fr) | Étiquettes énergétiques F/G + dates d'obligation | Quotidien |
| **DVF+** (data.gouv.fr) | Prix de marché, historique transactions, calcul P10/P50/P75 | Mensuel |
| **BODACC** (bodacc.fr) | Procédures collectives, liquidations, dissolutions | Quotidien |
| **BAN** (api-adresse.data.gouv.fr) | Géocodage adresses + normalisation | On-demand |
| **GPU/PLU IGN** (apicarto.ign.fr) | Zonage PLU, constructibilité, division | Hebdomadaire |
| **Géorisques** (georisques.gouv.fr) | Inondation, mouvements terrain, radon, sismicité | Hebdomadaire |
| **Cadastre IGN** (apicarto.ign.fr) | Géométries polygonales parcelles (PostGIS) | Trimestriel |
| **INSEE Entreprises** (recherche-entreprises.api.gouv.fr) | Données SCI/PM, état administratif, catégorie juridique | On-demand |

---

## Installation

### Prérequis

```bash
Python 3.11+
Node.js 18+
MongoDB (local ou Atlas)
Clé API Anthropic
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Variables d'environnement
cp .env.example .env
# Renseigner : MONGO_URL, JWT_SECRET, ANTHROPIC_API_KEY

uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd frontend
yarn install

# Variables d'environnement
echo "REACT_APP_API_URL=http://localhost:8001" > .env.local

yarn start
# → http://localhost:3000
```

### Compte démo

```
Email    : demo@reipila.com
Password : demo1234
```

---

## Workflow d'ingestion

```
Déclencher depuis l'UI (Settings → Ingestion) ou via API :

POST /api/ingest
{
  "code_insee": "69123",   ← Code INSEE de la commune
  "commune_nom": "Lyon 3e"
}

Pipeline exécuté :
  DVF+ (transactions 3 ans) → SCI identifiées (BODACC/INSEE)
  → DPE (ADEME)  → PLU (IGN)  → Géorisques
  → Scoring déterministe
  → Convergence Log
  → Persist MongoDB
  → Si score ≥ 70 : Claude interprétation disponible à la demande

Résultats visibles dans :
  GET /api/ingest/status   (en temps réel)
  GET /api/ingest/runs     (historique)
```

---

## Tests

```bash
# Tests backend (tous les endpoints)
python backend_test.py

# Résultat attendu : ~98% pass rate
# Auth → Stats → Feed → Map → Signals → Opportunities
# Market → Pipeline → AI → Ingestion
```

---

## Roadmap

```
Phase 1 ✅  POC données réelles · Scoring déterministe · Claude validé
Phase 2 ✅  MVP complet (7 pages · E2E testé · 98% pass rate · 0 bug critique)
Phase 3 🔜  Auth production · UX Opportunities · Pipeline kanban · Scheduling auto
Phase 4 🔜  58 communes full ingestion · Datafoncier (Copros/DFI) 
Phase 5 🔜  Multi-utilisateurs · SaaS billing · Alertes email · Export PDF
```

---

## Statut actuel (Phase 2)

```
Backend  ✅  185 parcelles · 754 signaux · 67 communes — données réelles
Frontend ✅  7 pages · MapLibre + cadastre IGN · Drawer intelligence · Claude intégré
Tests    ✅  98% global · 0 bug critique · E2E validé
```

---

## Organisation du projet

Reipila est développé par [**Infragentics**](https://infragentics.com) — agence IA spécialisée dans l'infrastructure intelligente pour les marchés francophones (France, Suisse, Belgique).

Le projet est propriétaire. Disponible uniquement en France.

---

<div align="center">

*"Détecter avant les autres. Décider avec les données."*

**Infragentics · Lyon · 2026**

</div>
