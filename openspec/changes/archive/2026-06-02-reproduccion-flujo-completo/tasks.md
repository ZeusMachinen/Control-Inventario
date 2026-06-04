# Tasks: Renovación Sistema de Reproducción — Flujo Completo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1000–1100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB) → PR 2 (Backend) → PR 3 (Frontend+Cleanup) |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## Phase 1: DB Migration (T001–T003)

- [x] **1.1 (T001)**: Create `database/migracion_reproduccion.sql` — 4 new tables (`diagnosticos_celo`, `servicios`, `diagnosticos_gestacion`, `partos`) with `partos.crias` JSON column, FKs to `animales`/`usuarios`, nullable chained FKs between events
  - AC: 4 tables created, FKs to animales/usuarios, nullable sequential FKs between events
  - Files: `database/migracion_reproduccion.sql` (new)
  - Deps: None

- [x] **1.2 (T002)**: Add migration logic in `migracion_reproduccion.sql` — migrate existing `ciclos_celo` records to `diagnosticos_celo`, create linked `servicios` for those with `servicio_realizado=1` (default tipo='Monta Natural')
  - AC: All ciclos_celo records migrated, servicio_records create linked servicios
  - Files: `database/migracion_reproduccion.sql`
  - Deps: T001

- [x] **1.3 (T003)**: Replace `ciclos_celo` table definition (lines 159–175) in `database/schema.sql` with the 4 new table definitions; update `database/seeds.sql` demo data
  - AC: schema.sql has 4 new tables, ciclos_celo removed; seeds.sql has demo data for all 4
  - Files: `database/schema.sql`, `database/seeds.sql`
  - Deps: T001, T002

## Phase 2: Backend (T004–T009)

- [x] **2.1 (T004)**: Create `api/controllers/ReproduccionController.php` — `storeCelo()` validates Hembra/activo/edad≥15, INSERT; state machine updates `estado_reproductivo` after each event
  - AC: POST `/api/reproduccion/celos` creates celo, validates edad/sexo/estado_general
  - Files: `api/controllers/ReproduccionController.php` (new)
  - Deps: T001

- [x] **2.2 (T005)**: Add `storeServicio()`, `storeDiagnosticoGestacion()`, `storeParto()` — each validates event-specific rules and transitions `estado_reproductivo` per machine spec
  - AC: Servicio→Prenada, DiagNeg→Vacia, Parto→Lactando; crías auto-created in animales on parto
  - Files: `api/controllers/ReproduccionController.php`
  - Deps: T004

- [x] **2.3 (T006)**: Add `indexCelo()`/`indexServicio()`/`indexDiagnosticoGestacion()`/`indexParto()` + `show()`/`update()`/`destroy()` for each + `timeline(animal_id)`
  - AC: 4 index endpoints return paginated results; timeline returns all events for an animal sorted by date
  - Files: `api/controllers/ReproduccionController.php`
  - Deps: T005

- [x] **2.4 (T007)**: Replace routes in `api/routes/web.php` — remove 7 `/api/celos/*` lines, add 15 `/api/reproduccion/*` routes pointing to `ReproduccionController`
  - AC: All old celos routes removed, all new reproduccion routes registered
  - Files: `api/routes/web.php`
  - Deps: T004

- [x] **2.5 (T008)**: Refactor `AnimalController::celos()` to query 4 new tables; update `EstadisticaController::reproduccion()` to count by `estado_reproductivo`
  - AC: `GET /animales/{id}/celos` → returns joined data from new tables; stats use new schema
  - Files: `api/controllers/AnimalController.php`, `api/controllers/EstadisticaController.php`
  - Deps: T001

- [x] **2.6 (T009)**: Review `CalculadorEdad.php` — `proximoCelo()` and `fechaParto()` are reused by new controller; verify constants `CELO_CICLO_DIAS` and `GESTACION_DIAS` remain in `app.php`
  - AC: No regressions in age/schedule calculations
  - Files: `api/helpers/CalculadorEdad.php`, `api/config/app.php`
  - Deps: None

## Phase 3: Frontend (T010–T016)

- [x] **3.1 (T010)**: Create `DiagnosticoCeloForm.js` — select hembra≥15 meses, fecha_inicio, síntomas, comportamiento, submit to POST `/api/reproduccion/celos`
  - AC: Form renders, validates required fields, creates celo via API
  - Files: `public/js/pages/reproduccion/DiagnosticoCeloForm.js` (new)
  - Deps: T004

- [x] **3.2 (T011)**: Create `ServicioForm.js` — tipo (Monta Natural/IA/TE), reproductor_id/nombre, diagnostico_celo_id optional, submit to POST `/api/reproduccion/servicios`
  - AC: Form creates servicio linked to optional celo, state becomes Prenada
  - Files: `public/js/pages/reproduccion/ServicioForm.js` (new)
  - Deps: T005

- [x] **3.3 (T012)**: Create `DiagnosticoGestacionForm.js` — método (Palpación/Ecografía), resultado (Positivo/Negativo), servicio_id, submit to POST `/api/reproduccion/diagnosticos-gestacion`
  - AC: Form creates diagnóstico, state reverts to Vacia if negativo
  - Files: `public/js/pages/reproduccion/DiagnosticoGestacionForm.js` (new)
  - Deps: T005

- [x] **3.4 (T013)**: Create `PartoForm.js` — fecha, complicaciones, dynamic crías rows (cantidad/sexo/peso), submit to POST `/api/reproduccion/partos` with `crias` JSON array
  - AC: Dynamic add/remove cría inputs, parto creates N animals via API, mother→Lactando
  - Files: `public/js/pages/reproduccion/PartoForm.js` (new)
  - Deps: T005

- [x] **3.5 (T014)**: Rewrite `CeloList.js` → `ReproduccionPage.js` — timeline view grouping events (celo→servicio→gestación→parto) per animal, replace header and route to `#/reproduccion`
  - AC: Timeline shows all 4 events per animal in sequence; new register buttons per event type
  - Files: `public/js/pages/reproduccion/ReproduccionPage.js` (new), drop `CeloList.js`
  - Deps: T006, T010–T013

- [x] **3.6 (T015)**: Update `Sidebar.js` — rename `#/celos` → `#/reproduccion`, change label text to "Reproducción"
  - AC: Sidebar link navigates to #/reproduccion
  - Files: `public/js/components/Sidebar.js`
  - Deps: T014

- [x] **3.7 (T016)**: Update `app.js` — register `#/reproduccion` route (→ `ReproduccionPage`) and `#/reproduccion/{evento}/nuevo` routes (→ respective forms); update `index.html` — load 4 new form scripts, remove `CeloList.js`/`CeloForm.js`
  - AC: All routes functional, scripts load without errors
  - Files: `public/js/app.js`, `public/index.html`
  - Deps: T015

## Phase 4: Integration & Cleanup (T017–T018)

- [x] **4.1 (T017)**: Update `AnimalDetail.js` — replace `GET /animales/{id}/celos` with `GET /api/reproduccion/timeline/{id}`, display all events grouped in historial section
  - AC: Animal detail shows timeline with celo→servicio→gestación→parto events
  - Files: `public/js/pages/animales/AnimalDetail.js`
  - Deps: T006

- [x] **4.2 (T018)**: Delete `api/controllers/CeloController.php`, `CeloForm.js`, old `CeloList.js`; verify no remaining references to `/api/celos` or ciclos_celo in JS/HTML/PHP
  - AC: No dead code, no 404 routes, no dangling imports
  - Files: remove `api/controllers/CeloController.php`, `public/js/pages/reproduccion/CeloForm.js`
  - Deps: T007, T016
