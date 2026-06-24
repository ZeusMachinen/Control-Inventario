# Tasks: Micrositio Estadísticas — Analítica del Hato

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,500–1,800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Backend) → PR 2 (Frontend) → PR 3 (Polish) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: migration, 5 helpers, controller + routes | PR 1 | Base = `main`; all PHP + SQL |
| 2 | Frontend: shell + 5 subviews + app.js/sidebar wiring | PR 2 | Base = `main`; needs PR 1 APIs live |
| 3 | Polish: export PDF/Excel, mobile CSS, dark mode, tests | PR 3 | Base = `main`; final layer |

## Phase 1: Foundation

- [x] 1.1 Create migration `database/migracion_analitica_indexes.sql` — composite idx on `animales` + `idx_partos_fecha`
- [x] 1.2 Create `api/helpers/ComposicionHelper.php` — 8-bucket category logic (terneros lactando/destetados/novillos/toretes/vacas/toros)
- [x] 1.3 Create `api/helpers/ScorecardHelper.php` — bayesian shrinkage `(p+K·p_hato)/(n+K)` with K=3, recency λ=ln2/12
- [x] 1.4 Create `api/helpers/EPDHelper.php` — z-score `indice=50+10·z` clamped [0,100], weights toro/vaca per design
- [x] 1.5 Create `api/helpers/ProyeccionHelper.php` — 12mo weighted MA with confidence band
- [x] 1.6 Create `api/helpers/DescarteHelper.php` — score (0.50/0.20/0.15/0.15) + semáforo verde/amarillo/rojo

## Phase 2: Core Controller

- [x] 2.1 Create `api/controllers/AnaliticaController.php` — 10 endpoints delegating to helpers
- [x] 2.2 Implement dashboard-kpis, composicion, series-temporales endpoints
- [x] 2.3 Implement rankings, scorecard/{id}, descarte endpoints
- [x] 2.4 Implement rebanos/comparativa, rebanos/{id}/proyecciones, comparativa-temporal, exportar
- [x] 2.5 Add 10 routes to `api/routes/web.php` under `/api/analitica/*` (literals before params)

## Phase 3: Frontend

- [x] 3.1 Create `public/js/pages/estadisticas/MicrositioEstadisticasPage.js` — shell + Plotly lazy-load + tab dispatcher
- [x] 3.2 Create `subviews/DashboardView.js` — KPIs + time-series Plotly chart
- [x] 3.3 Create `subviews/ComposicionDetallada.js` — pie chart + 8-bucket table + drill-down
- [x] 3.4 Create `subviews/RankingsView.js` — top-3 podium + full ranking table
- [x] 3.5 Create `subviews/ScorecardAnimal.js` — modal with EPD, veredicto, timeline
- [x] 3.6 Create `subviews/DescarteView.js` — semaforo table with risk summary
- [x] 3.7 Create `subviews/ComparativaRebanos.js` — side-by-side herd comparison
- [x] 3.8 Create `subviews/ProyeccionesView.js` — 12mo projection chart with confidence band
- [x] 3.9 Modify `app.js` — route to MicrositioEstadisticasPage, keep /v1 fallback
- [x] 3.10 Modify `Sidebar.js` — rename Estadisticas to Analitica, link to new microsite

## Phase 4: Polish

- [x] 4.1 Wire export buttons — jsPDF + SheetJS (CDN lazy) in MicrositioEstadisticasPage
- [x] 4.2 Add mobile responsive CSS — `public/css/micrositio.css` with 768px and 480px breakpoints
- [x] 4.3 Verify dark mode — `.dark-mode` overrides in micrositio.css
- [x] 4.4 Write PHP unit tests: `tests/helpers/test_analitica.php` (ScorecardHelper, EPDHelper, DescarteHelper asserts)
- [x] 4.5 Create `tests/manual/analitica-checklist.md` — 5-step E2E checklist
