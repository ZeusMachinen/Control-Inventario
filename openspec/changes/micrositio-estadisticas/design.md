# Design: Micrositio de Estadísticas y Analítica del Hato

## Technical Approach

New `AnaliticaController` (13 endpoints) + 4 PHP helper classes that compute analytics in-process from the existing 16 tables. Frontend replaces `DashboardStats.js` with a Plotly.js-powered SPA at `/estadisticas` (lazy-loaded). `EstadisticaController.php` and `DashboardStats.js` stay on disk for rollback. Maps to specs #111 (analytics-dashboard, animal-scorecard, herd-analytics) and formulas from #92.

```
Browser ──hash──▶ /estadisticas ──▶ Router ──▶ PlotlyPage
  │                                        │
  └──axios──▶ /api/analitica/* ──▶ AnaliticaController ──▶ Helpers ──▶ MySQL
                                          │
                                          └─▶ Cache (in-request benchmarks)
```

## Architecture Decisions

| Decision | Choice | Alternatives | Why |
|---|---|---|---|
| Charts | Plotly.js lazy via dynamic `<script>` on first `/estadisticas` visit | Chart.js already loaded | Need zoom, drill-down, tooltips, time-series rangeslider for spec #111 series temporales |
| Compute layer | PHP helpers (Scorecard, EPD, Proyeccion, Composicion, Descarte) | Python micro-service / MySQL stored procs | No new infra; formulas from #92 are pure arithmetic; helpers are unit-testable |
| Filter state | URL query params + `localStorage` | React-state, sessionStorage | Survives reload, shareable links, matches existing hash-router pattern |
| Scorecard formulas | Encogimiento bayesiano `(p+K·p_hato)/(n+K)` con K=5, ponderación recencia λ=ln2/12, REZAGO 90d | EPD real BLUP | Spec mandates bayesiano simplificado; N_MIN=5 kills noise without infra |
| Performance @ 500+ animals | Derived tables + GROUP BY + composite idx `(usuario_id, activo, fecha_nacimiento)` | Materialized views, Redis | `animales` ya tiene `idx_animales_usuario/activo`; añadir `idx_animales_compuesto` cubre el 80% de queries |
| Mobile | CSS Grid auto-fit `minmax(280px, 1fr)`; Plotly `responsive: true` con `scrollable: horizontal` en contenedor | Tabla horizontal scroll | Spec requiere 375px single-column |
| EPD ranking | Z-score normalizado contra el hato, `indice = 50+10·z` acotado [0,100], weights toro (0.40/0.20/0.25/0.15) / vaca (0.30/0.25/0.20/0.10/0.15) | ML model | Spec formula deterministic; reproducible, auditable |
| Export | jsPDF + SheetJS (CDN, lazy) on `/estadisticas` first visit | Server-side PHP export | No backend changes; client renders what user sees |
| Backward compat | `EstadisticaController` y `DashboardStats.js` quedan; nueva página vive en `MicrositioEstadisticasPage` | Replace in place | Rollback = swap one line in `app.js`; meets proposal rollback plan |
| 500+ performance | `?granularidad=dia\|mes\|anio`; server pre-aggregates by period; client caches benchmarks per session | Always-day granularity | Day for ≤90d, month for ≤2y, year for >2y |

## Data Flow

1. User navigates `#/estadisticas` → `app.js` lazy-injects Plotly 2.27 (1.2MB, cached after first load).
2. `MicrositioEstadisticasPage.render()` fires 4 parallel `axios` calls: `/analitica/dashboard-kpis`, `/analitica/composicion`, `/analitica/series-temporales`, `/analitica/comparativas`.
3. `AnaliticaController` resolves `AuthMiddleware::ejecutar()->sub`, computes benchmarks once per request (`p_hato`, `peso_nacer_hato`, `iep_hato`, `mortalidad_crias_hato`), then runs 4 SQL queries.
4. PHP helpers reduce row sets to scorecard structures; EPD via z-score; descarte via semáforo (verde <365d, amarillo ≥365d vacía, rojo ≥540d).
5. Frontend hydrates Plotly charts, registers drill-down handlers, applies MoM/YoY deltas (green/red arrow).

## File Changes

| File | Action | Description |
|---|---|---|
| `api/controllers/AnaliticaController.php` | **Create** | 13 endpoints; injects benchmarks once, delegates to helpers |
| `api/helpers/ScorecardHelper.php` | **Create** | `scorecardToro()`, `scorecardVaca()`, `veredictoToro()` from #92 |
| `api/helpers/EPDHelper.php` | **Create** | `calcularEPDToro()`, `calcularEPDVaca()`, z-score normalization |
| `api/helpers/ProyeccionHelper.php` | **Create** | 12-month moving average with confidence band |
| `api/helpers/ComposicionHelper.php` | **Create** | Categorías terneros/destetados/novillos/toretes/vacas/toros (8 buckets) |
| `api/helpers/DescarteHelper.php` | **Create** | Score ponderado (0.50/0.20/0.15/0.15) + semáforo |
| `api/routes/web.php` | **Modify** | Add 13 routes under `/api/analitica/*` (literals before params) |
| `public/js/pages/estadisticas/MicrositioEstadisticasPage.js` | **Create** | Main shell; lazy-loads Plotly, sub-view dispatcher |
| `public/js/pages/estadisticas/subviews/ComposicionDetallada.js` | **Create** | 8-bucket composition table with drill-down |
| `public/js/pages/estadisticas/subviews/Rankings.js` | **Create** | Top-3 podium + full ranking + EPD bar |
| `public/js/pages/estadisticas/subviews/ScorecardAnimal.js` | **Create** | EPD gauge, veredicto, timeline (reuses ReproduccionController) |
| `public/js/pages/estadisticas/subviews/ComparativaRebanos.js` | **Create** | Side-by-side herd table + projections chart |
| `public/js/pages/estadisticas/subviews/Proyecciones.js` | **Create** | 12-month projection with confidence band |
| `public/js/pages/estadisticas/DashboardStats.js` | **Keep** | Rollback fallback; do not delete |
| `public/js/app.js` | **Modify** | Add 5 sub-routes (`/estadisticas/composicion`, `/rankings`, `/animal/:id`, `/rebanos`, `/proyecciones`); register Plotly lazy |
| `public/js/components/Sidebar.js` | **Modify** | Add submenu: "Composición", "Rankings", "Proyecciones", "Comparativa" |
| `api/controllers/EstadisticaController.php` | **Keep** | Unused by new frontend; rollback safety |
| `database/migrations/2026_06_24_analitica_indexes.sql` | **Create** | `CREATE INDEX idx_animales_compuesto ON animales(usuario_id, activo, fecha_nacimiento)` + `idx_partos_fecha(usuario_id, fecha)` |

## Interfaces / Contracts

```
GET  /api/analitica/dashboard-kpis?rebano_id&desde&hasta
  → { total, prenadas, tasa_natalidad, tasa_prenez, costo_cabeza_mes, roi, partos_mes, gastos_mes, comparativas: {natalidad_mom, prenez_yoy, ...} }

GET  /api/analitica/composicion?rebano_id
  → { buckets: [{key, label, cantidad, porcentaje, peso_promedio}], detalle: {terneros:{lactando_m, lactando_h, destetados_m, ...}} }

GET  /api/analitica/series-temporales?metrica=natalidad|prenez|costos&granularidad=dia|mes|anio&desde&hasta
  → { puntos: [{fecha, valor, intervalo_confianza_inf?, sup?}] }

GET  /api/analitica/rankings?tipo=toro|vaca&metrica=&top=20
  → { ranking: [{animal_id, nombre, valor, epd, veredicto, confianza}] }

GET  /api/analitica/scorecard/{animalId}
  → { animal, epd:{indice, breakdown, provisional}, scorecard: {...spec 1.1/1.2}, historial:{repro, financiero, genealogico}, costo_cabeza_mes, roi }

GET  /api/analitica/descarte?rebano_id
  → { lista: [{animal_id, nombre, dias_vacia, score, semaforo}], stats:{verde, amarillo, rojo, total, pct_riesgo} }

GET  /api/analitica/rebanos/comparativa
  → { rebanos: [{id, nombre, tamano, natalidad, prenez, costo_cabeza, roi, riesgo_descarte, mejor_en:[]}] }

GET  /api/analitica/rebanos/{id}/proyecciones?meses=12
  → { proyeccion: [{mes, crecimiento_esperado, particiones_confirmadas, partos_estimados, costos_estimados, banda_inf, banda_sup}] }

GET  /api/analitica/comparativa-temporal?metrica=&desde&hasta
  → { serie_actual:[], serie_anio_anterior:[], anomalias:[{fecha, valor, zscore}] }

GET  /api/analitica/exportar?seccion=...&formato=pdf|xlsx
  → Binary stream (client-side alt: jsPDF/SheetJS from cached data)
```

All routes use `Response::json()`; `Response::paginar()` for listas >50 items; Auth required on all.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit (PHP) | ScorecardHelper, EPDHelper, DescarteHelper | `tests/helpers/` with PHPUnit-light assertion script (no framework installed): seed fixture animals, assert expected EPD/ranking |
| Integration (manual) | Each endpoint vs `EstadisticaController` baseline | `curl` against dev server with seed data, compare counts |
| SQL | Benchmarks match #92 formulas | Direct query in `mysql` client, cross-check with `EXPLAIN` on 500-animal fixture |
| Frontend (manual) | Mobile 375px / Desktop 1280px / Dark mode | Browser DevTools responsive mode + Lighthouse |
| E2E (manual) | Dashboard → drill-down → export PDF | Scripted 5-step checklist in `tests/manual/analitica-checklist.md` |

No test framework installed → use lightweight PHP assert script and manual SQL fixtures.

## Migration / Rollout

1. Ship migration `2026_06_24_analitica_indexes.sql` first (additive, no data change).
2. Deploy helpers + controller; old frontend untouched.
3. Switch `app.js` route `/estadisticas` → new page; keep `DashboardStats.js` referenced at `#/estadisticas/v1` for rollback.
4. Monitor first 48h: query time logs, JS bundle size.
5. Rollback: revert `app.js` line 30 to `DashboardStatsPage.render()`. Old routes stay alive.

## Open Questions

- [x] Export: client-side jsPDF + SheetJS (confirmed by user)
- [x] EPD `provisional` threshold: `N_MIN = 3` (user adjusted from 5 to 3)
- [x] `REZAGO_DIAS=90` — accepted as-is
