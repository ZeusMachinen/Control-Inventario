# Exploration: Micrositio Estadísticas — Módulo de Analítica Avanzada

## Executive Summary

The current `EstadisticaController` (5 endpoints, 305 lines) + `DashboardStats.js` (294 lines, 5 canvas charts) provides basic KPI cards and static doughnut/bar charts. It is **far** from the "microsite" the user envisions: no per-herd drill-down, no per-animal scorecards, no time-series, no predictive analytics, no EPD indices, no reproductive efficiency metrics. The database has **rich raw data** across 16+ tables to support advanced analytics. Adding Python is feasible but introduces deployment complexity; a pure-PHP approach with enhanced JS visualization (Plotly.js) is the lower-risk path for v1.

## 1. Current Module Deep Dive

### 1.1 EstadisticaController.php (`api/controllers/EstadisticaController.php`)

| Endpoint | Method | What it does | Data sources | Missing |
|---|---|---|---|---|
| `/estadisticas/resumen` | `resumen()` L20-78 | 8 KPIs: total animals, males, females, herds, pregnant, birth rate, death rate | `animales` (6 queries) | No time-filter, no trend arrows, no per-herd breakdown |
| `/estadisticas/poblacion` | `piramide()` L84-136 | Distribution by sex, etapa, reproductive state, age pyramid (4 buckets) | `animales` (5 queries) | No per-herd filter, age buckets too coarse (only 4), no sex-separated pyramid |
| `/estadisticas/reproduccion` | `reproduccion()` L142-205 | 8 metrics: celos, services, pregnant, lactating, empty, dx positives/negatives, births | `diagnosticos_celo`, `servicios`, `animales`, `diagnosticos_gestacion`, `partos` | No conception rate, no calving interval, no services/conception, no per-bull stats |
| `/estadisticas/vacunacion` | `coberturaVacuna()` L211-235 | Vaccination coverage (last 3 months) | `animales`, `vacunacion_animales`, `vacunaciones` | No per-medicament breakdown, no overdue alerts |
| `/estadisticas/comerciales` | `comerciales()` L241-304 | Ingresos, gastos (compras), ganancia neta, total ventas, costos by type, vacuna costs | `ventas`, `companias`, `gastos`, `vacunaciones` | No monthly trend, no profitability/animal, no cost/head, no ROI |

**Key pattern**: Every endpoint does independent `Database::queryOne/query` calls — no shared caching, no helper class, no composite DTO. Each request triggers 5-6 queries.

### 1.2 DashboardStats.js (`public/js/pages/estadisticas/DashboardStats.js`)

- **`render()`** (L4-141): Fetches 5 API endpoints in parallel, renders KPI cards + 5 chart canvases
- **`afterRender()`** (L143-146): Destroys previous charts, calls cargarGraficos
- **`cargarGraficos()`** (L153-293): Re-fetches 3 endpoints and creates:
  1. Age pyramid bar chart (simple, 4 bars, single color)
  2. Etapa distribution doughnut (3 segments)
  3. Reproductive states doughnut (3 segments)
  4. Commercial bar chart (4 bars: ingresos, gastos, ganancia, costos)
  5. Costos operativos doughnut (dynamic from costos object)

**Gaps**:
- No per-herd selector/dropdown
- No date range picker (always current year)
- All charts are static — no click-to-drilldown
- No time-series line charts (monthly evolution)
- No scatter plots (weight vs age, price vs weight)
- No heatmaps
- No reproductive timeline visualization
- No combined bull/vaca scorecards

## 2. Per-Herd Stats (RebanoController)

**`RebanoController::estadisticas()`** (L377-484):
- Accepts `fecha_desde`/`fecha_hasta` query params
- Returns: `nacidos`, `muertes`, `vendidos`, `activos`, `activos_pastaje`, `kilos_producidos`, `ingresos_generados`
- **Caveat**: `nacidos` = `rebano_nacimiento_id` (birth herd), not current herd. Others are `rebano_id` (current herd).
- `kilos_producidos` = weight gain of non-active animals (sale weight - entry weight)

**`RebanoController::kpisGlobales()`** (L311-347): Global KPIs — `total_animales`, `total_nacidos`, `total_muertes`, `total_vendidos`, `rebanos_activos`. Used nowhere in frontend currently.

**Usage in frontend**: `RebanoDetail.js` calls `GET /api/rebanos/{id}/estadisticas` and displays a summary card. No charts per herd.

## 3. Raw Data Available for Advanced Analytics

### 3.1 Complete Table Inventory (from `database/schema.sql` + migrations)

| Table | Key analytics columns | Analytics potential |
|---|---|---|
| `animales` | sexo, fecha_nacimiento, etapa, estado_reproductivo, peso_entrada, peso_salida, precio_kg, precio_final, estado_general, fecha_salida, madre_id, padre_id, rebano_id, rebano_nacimiento_id, origen, precio_compra | Core entity — everything flows from here |
| `servicios` | animal_id, tipo (Monta Natural/IA/TE), reproductor_id, fecha | Bull performance, service frequency, AI vs natural comparison |
| `diagnosticos_celo` | animal_id, fecha_inicio, fecha_fin, sintomas, comportamiento | Heat detection efficiency, cycle regularity |
| `diagnosticos_gestacion` | animal_id, servicio_id, fecha, metodo, resultado, meses_gestacion | Conception rate, palpation vs ultrasound, gestation length |
| `partos` | animal_id, fecha, crias (JSON), diagnostico_gestacion_id | Calving interval, litter size, birth weight distribution, calving ease |
| `ventas` | animal_id, vendedor_id, comprador_id, precio, fecha, tipo, peso_salida | Revenue per animal, price trends, buyer analysis |
| `gastos` | tipo (mantenimiento/medicamentos/compras/veterinarios), monto, mes, rebano_id | Cost breakdown, monthly trends |
| `costos_mensuales` | rebano_id, mes, tipo (gasto/inversion), concepto, monto, cabezas | Pre-aggregated cost per head |
| `conteo_mensual_rebano` | rebano_id, mes, cabezas | Historical headcount per herd |
| `vacunaciones` | fecha, medicamento_id, rebano_id, costo_veterinario | Vaccination cost, schedule compliance |
| `vacunacion_animales` | vacunacion_id, animal_id, dosis_aplicada | Per-animal vaccine history |
| `medicamentos` | nombre, stock, unidad, fecha_vencimiento | Inventory health, expiring alerts |
| `rebanos` | nombre, costo_cabeza, fecha_inicio, dia_corte | Herd metadata |
| `companias` | animal_id, socio_id, porcentaje_socio, peso_entrada, peso_salida, precio_venta, gastos | Partnership profitability |
| `movimientos_rebano` | animal_id, rebano_origen_id, rebano_destino_id, fecha, created_at | Movement history, herd flow analysis |
| `compras` | proveedor, fecha_compra, total | Purchase batches |

### 3.2 Key Relationships

```
animales
  ├─ madre_id → animales.id (self-referential)
  ├─ padre_id → animales.id (self-referential)
  ├─ rebano_id → rebanos.id
  ├─ rebano_nacimiento_id → rebanos.id
  ├─ compra_id → compras.id
  └─ servicios, diagnosticos_celo, diagnosticos_gestacion, partos ← animal_id
```

### 3.3 Entity-Attribute Matrix for Analytics

**Animal-level metrics computable from raw data**:
- Age in months: `TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE())`
- Weight gain: `peso_salida - peso_entrada` (for inactive animals)
- Profit per animal: `ventas.precio - precio_compra - proportional costs`
- Days in herd: `DATEDIFF(fecha_salida, fecha_nacimiento)` or `DATEDIFF(fecha_salida, fecha_ingreso)`

**Reproductive metrics (per female)**:
- Total services, diagnostics, partos — all queryable via animal_id
- Services per conception: `COUNT(servicios) / COUNT(diagnosticos_gestacion WHERE resultado='Positivo')`
- Calving interval: `AVG(DATEDIFF(p2.fecha, p1.fecha))` between consecutive partos
- Days open: `DATEDIFF(primer_servicio_post_parto, parto)`
- Pregnancy rate: `COUNT(dx_positivos) / COUNT(dx_totales)`

**Bull metrics (per male)**:
- Total services: `COUNT(*) FROM servicios WHERE reproductor_id = X`
- Conception rate: via `diagnosticos_gestacion.resultado` joined through `servicios`
- Offspring count: `COUNT(*) FROM animales WHERE padre_id = X`
- Offspring sex ratio, birth weights

## 4. Existing Analytics Formulas (from Engram Memory #92)

Memory `#92` (topic: `analytics/micrositio-hato`) contains the complete mathematical specification:

### 4.1 Constants
- `N_MIN = 5` (minimum sample for confidence)
- `K = 5` (Bayesian prior strength)
- `HALF_LIFE = 12 months` (recency decay)
- `REZAGO_DIAS = 90` (gestation grace period — services without dx < 90 days are "pending")
- `GESTACION_DIAS = 283`

### 4.2 Herd Benchmarks (`p_hato`, `peso_nacer_hato`, `iep_hato`, `mortalidad_crias_hato`)

### 4.3 Guardrail Formulas
1. **Bayesian shrinkage**: `tasa_ajustada = (positivos + K*p_hato) / (n_diagnosticados + K)`
2. **Recency weighting**: `λ = ln(2)/HALF_LIFE; peso = exp(-λ*meses_antiguedad); tasa_vigente = Σ(peso*es_positivo)/Σ(peso)`
3. **Gestation lag**: services with no dx and < 90 days old → "pending", not negative
4. **Exclude bought animals** from birth weight stats (origen='Compra' excluded)

### 4.4 Scorecard Toro (Bull Scorecard) — 12 fields
- servicios_total, n_diagnosticados, pendientes, positivos, negativos
- tasa_vigente (title metric), tasa_historica, tasa_ajustada
- tendencia (Mejora/Estable/Declive — comparing last 12 vs prior months)
- p_hato (herd benchmark), edad_meses
- hijos_total + machos/hembras
- peso_nacer_prom crías (delta vs hato)
- confianza (Alta if n_diagnosticados >= N_MIN)
- alerta_racha (true if last 5 dx all negative or well below herd)

### 4.5 Veredicto Toro (priority-ordered)
1. confianza=Baja → "Datos insuficientes"
2. tendencia=Declive AND edad alta → "Considerar reemplazo"
3. alerta_racha → "Alerta — racha negativa"
4. tasa_vigente >= p_hato+0.05 → "Buen reproductor"
5. tasa_vigente <= p_hato-0.10 → "Revisar rendimiento"
6. Else → "En el promedio"

### 4.6 Scorecard Vaca (Cow Scorecard) — 7 fields
- partos_total, crias_total, servicios_por_concepcion
- intervalo_entre_partos_dias (≥2 partos)
- peso_nacer_prom_crias (delta vs hato), edad_meses, etapa, estado_reproductivo

### 4.7 EPD Index (both toro and vaca)
`z-score → índice = 50 + 10*z`, clamped [0, 100]
- **Toro weights**: tasa_vigente(0.40) + peso_nacer_prom(0.20) + supervivencia(0.25) + hijos_total(0.15)
- **Vaca weights**: fertilidad(0.30) + iep_invertido(0.25) + supervivencia(0.20) + peso_nacer_prom(0.10) + partos_total(0.15)
- Low confidence → `provisional = true`

## 5. Python Integration Feasibility

### 5.1 Current Serving Architecture

| File | Role |
|---|---|
| `.htaccess` (root) | Apache: redirects everything to `public/` |
| `public/.htaccess` | Apache: SPA → `index.html`, `/api/*` → `../api/index.php` |
| `api/.htaccess` | Apache: all requests → `api/index.php` |
| `router.php` | PHP built-in server: manual routing for `php -S` mode |
| `api/index.php` | Front controller: CORS, autoload, route matching, auth middleware, controller dispatch |

**Key fact**: The app can run under Apache (with mod_rewrite) OR PHP built-in server. No Docker, no nginx, no reverse proxy currently.

### 5.2 Python Integration Options

| Option | Architecture | Pros | Cons | Deployment Complexity |
|---|---|---|---|---|
| **A: Sidecar microservice** | FastAPI on separate port (e.g., 8001), called via PHP `file_get_contents('http://localhost:8001/...')` or cURL | Full Python ecosystem (pandas, numpy, scipy), clean separation | Requires Python runtime + process manager (supervisor/systemd), CORS, auth token forwarding, network latency | HIGH |
| **B: Batch computation** | PHP calls Python scripts via `shell_exec('python3 analytics.py --rebano 5 --desde 2025-01')`, reads JSON stdout | No always-running server, simple integration | Startup overhead per call (~200ms Python cold start), need to pass data via args/stdin | MEDIUM |
| **C: Embedded iframe** | Streamlit/Dash app served on different port, embedded via `<iframe>` in PHP frontend | Beautiful visualizations out of the box, interactive | Separate auth (need token passthrough), UI disjoint from SPA, 2 servers to manage | HIGH |
| **D: Pure PHP + Plotly.js** | Computation in PHP helper classes, visualization with Plotly.js CDN in vanilla JS SPA | No new runtime, single deployable, same auth, consistent UX | PHP lacks advanced stats libraries (no pandas equivalent), verbose for matrix operations | LOW |

### 5.3 Recommended Path

**Option D (Pure PHP) for v1, with Option B (Python batch) as an optional enhancement for hard computations later.**

Rationale:
1. The current analytics formulas (Bayesian shrinkage, recency weighting, z-scores) are all computable in plain PHP
2. PHP already has the database connection and auth — no dual-auth headache
3. Plotly.js gives richer interactivity than Chart.js with zero server changes
4. If performance becomes an issue for large datasets (>100k animals), Python batch via `shell_exec` can be added later without refactoring the API

### 5.4 When Python Would Be Worthwhile

- **Scatter plot matrices** (e.g., seaborn pairplot of weight vs age vs price by sex)
- **PCA/clustering** for animal classification
- **Time-series forecasting** (ARIMA/Prophet for herd growth projections)
- **Automated PDF report generation** (Jinja2 + WeasyPrint)
- **Correlation analysis** across dozens of variables

These are "nice to have" for v2/v3, not v1 essentials.

## 6. Visualization: Chart.js vs Alternatives

### 6.1 Current State

- Chart.js 4.x loaded via UMD bundle (`public/vendor/chart.umd.min.js`, ~250KB)
- Charts are destroyed and recreated on each page navigation
- All charts are static (no zoom, no tooltip customization beyond basic callbacks)
- 5 chart types used: bar, doughnut, pie

### 6.2 Comparison

| Library | Size (min) | Interactive | Timeline | Heatmap | 3D | CDN |
|---|---|---|---|---|---|---|
| **Chart.js** | 250KB UMD | Basic tooltips + legend clicks | No built-in | No | No | Already loaded |
| **Plotly.js** | 3.5MB basic / 1.2MB min | Zoom, pan, hover details, click-to-filter, export to PNG | Yes (gantt-like) | Yes | Yes (scatter3d) | Yes (cdn.plot.ly) |
| **Apache ECharts** | 1MB min | Excellent — zoom, brush, dataZoom slider, toolbox | Yes | Yes | Limited | Yes (cdn.jsdelivr.net) |
| **ApexCharts** | 450KB | Good — zoom, toolbar, export | Yes (timeline) | Yes (heatmap) | No | Yes (cdn.jsdelivr.net) |
| **D3.js** | 250KB | Maximum — but manual | Manual | Manual | Manual | Yes |

### 6.3 Recommendation

**Replace Chart.js with Plotly.js** for the microsite. Reasons:
1. **Zoom & pan**: Users can explore dense time-series data
2. **Click events**: Click a bar → navigate to filtered animal list (e.g., click "Prenadas" → see all pregnant cows)
3. **Subplots**: Multiple charts sharing x-axis (e.g., births + deaths on same timeline)
4. **Built-in statistical traces**: box plots, violin plots, histogram with KDE
5. **Export to PNG**: Users can save/print charts directly
6. **No server changes**: Just add `<script src="plotly.min.js">` and rewrite chart rendering

The size increase (250KB → 1.2MB) is acceptable for an analytics page where users expect richness. The Plotly bundle can be loaded lazily (only when navigating to `/estadisticas`).

## 7. Frontend Architecture Integration

### 7.1 How a New Microsite Page Would Be Added

From `public/js/app.js` (L30, L40):
```js
Router.registrar('/estadisticas', () => DashboardStatsPage.render());
// afterRender map L62:
'/estadisticas': () => DashboardStatsPage.afterRender(),
```

To add a new microsite page `/estadisticas/hato`:
1. Create `public/js/pages/estadisticas/MicrositioPage.js` with `render()` + `afterRender()`
2. Register route in `app.js`: `Router.registrar('/estadisticas/hato', () => MicrositioPage.render())`
3. Add to afterRender map
4. Add sidebar link in `Sidebar.js`

### 7.2 Layout Pattern

All pages use `MainLayout.render(contenidoHtml)` which wraps content in:
```
.app-shell > Sidebar + .main-content > Navbar + main.page-content > {contenidoHtml}
```

The microsite can use this same shell. For a "full-width dashboard" experience, the page content can use CSS grid with custom column layouts — no layout framework changes needed.

### 7.3 API Client

`API.get(url, params)` uses axios with JWT interceptor. Adding new analytics endpoints requires:
1. New routes in `api/routes/web.php`
2. New public methods in `EstadisticaController` (or a new `AnaliticaController`)
3. New PHP helper classes for computation (e.g., `ReproStatsHelper`, `ScorecardHelper`, `EindiceHelper`)

## 8. What the Microsite Should Contain (Gap Analysis)

| Feature | Current | Proposed |
|---|---|---|
| **Herd selector** | None | Dropdown to filter all stats by herd |
| **Date range picker** | None | Date from/to for time-scoped analytics |
| **KPI cards** | 12 static cards | + trend arrows (↑↓), comparison vs previous period |
| **Population pyramid** | 4 age buckets, no sex split | Sex-separated pyramid, 12-month buckets, per-herd |
| **Reproductive dashboard** | 8 numbers, no rates | Conception rate, calving interval, days open, services/conception, heat detection rate — all as time-series |
| **Bull scorecards** | None | Full scorecard per bull with verdict |
| **Cow scorecards** | None | Full scorecard per cow with fertility metrics |
| **EPD ranking** | None | Leaderboard of bulls/cows by EPD index |
| **Financial analytics** | Revenue - costs | ROI per animal, cost/head/month trend, profit per herd, price/kg trend |
| **Weight analytics** | None | Weight gain distribution, weight vs age scatter, growth curves |
| **Vaccination coverage** | Single % (3mo) | Per-medicament, per-herd, compliance timeline, overdue alerts |
| **Heatmap calendar** | None | Births/deaths by month, services by month |
| **Export** | None (sidebar export is JSON list) | PDF report, CSV export of analytics data |
| **Alerts** | None | Low-conception alerts, overdue vaccines, racha negativa bulls |
| **Interactivity** | None | Click chart → drill down, hover details, zoom/pan |

## 9. Recommended Architecture

### 9.1 New Backend Structure

```
api/
├── controllers/
│   ├── EstadisticaController.php  (keep — existing endpoints for backward compat)
│   └── AnaliticaController.php    (NEW — advanced analytics endpoint)
├── helpers/
│   ├── ReproStatsHelper.php       (NEW — herd benchmarks, bull/cow scorecards)
│   ├── ScorecardHelper.php        (NEW — Bayesian shrinkage, recency weighting)
│   ├── EPDHelper.php              (NEW — EPD index computation)
│   └── TimeSeriesHelper.php       (NEW — monthly aggregation helpers)
└── routes/
    └── web.php                    (add new analitica routes)
```

### 9.2 New Frontend Structure

```
public/js/pages/estadisticas/
├── DashboardStats.js      (keep — current page, unchanged)
├── MicrositioPage.js       (NEW — main microsite shell)
├── components/
│   ├── KpiCards.js         (NEW — reusable KPI card with trend)
│   ├── HerdSelector.js     (NEW — dropdown for herd filter)
│   ├── DateRangePicker.js  (NEW — date range input)
│   ├── BullScorecard.js    (NEW — individual bull card)
│   ├── CowScorecard.js     (NEW — individual cow card)
│   ├── EPDLeaderboard.js   (NEW — sorted table)
│   └── ChartGrid.js        (NEW — responsive chart container)
└── charts/
    ├── PopulationPyramid.js
    ├── ReproductiveTimeline.js
    ├── FinancialTrend.js
    ├── WeightScatter.js
    └── HeatmapCalendar.js
```

### 9.3 Proposed API Endpoints

```php
GET  /api/analitica/rebanos         → herd list for selector (name, id, animal count)
GET  /api/analitica/resumen?rebano_id=X&desde=Y&hasta=Z  → master KPI response
GET  /api/analitica/poblacion?rebano_id=X  → sex-separated pyramid, 12mo buckets
GET  /api/analitica/reproduccion?rebano_id=X&desde=Y&hasta=Z  → rate metrics + time-series
GET  /api/analitica/toros?rebano_id=X    → bull scorecards array
GET  /api/analitica/toros/{id}           → single bull full scorecard
GET  /api/analitica/vacas?rebano_id=X    → cow scorecards array
GET  /api/analitica/vacas/{id}           → single cow full scorecard
GET  /api/analitica/epd?tipo=toro|vaca   → EPD ranking
GET  /api/analitica/financiero?rebano_id=X&desde=Y&hasta=Z  → financial KPIs + trends
GET  /api/analitica/pesos?rebano_id=X    → weight distribution data
GET  /api/analitica/vacunacion?rebano_id=X → vaccination compliance
GET  /api/analitica/alertas               → active alerts/warnings
```

## 10. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Performance** — scorecards for 500+ animals each loading reproductive history | Medium | High | Cache herd benchmarks in a `ReproStatsHelper` factory (compute once per request). Paginate scorecards. Lazy-load animal-level data on demand. |
| **PHP precision** — Bayesian/logarithmic math with many decimals | Low | Medium | Use PHP's `bcmath` extension if available; fallback to float with explicit rounding. The formulas are well-defined and don't require matrix operations. |
| **Plotly.js bundle size** | Medium | Low | Load Plotly.js lazily (only on `/estadisticas` route). Keep Chart.js for pages that don't need rich viz. |
| **API response size** — time-series data for 5 years | Medium | Medium | Aggregate in SQL (GROUP BY MONTH(fecha)), return minimal arrays. Use `?granularidad=mes|trimestre|anio` param. |
| **Breaking existing stats** | Low | High | Keep `EstadisticaController` untouched. New analytics in `AnaliticaController`. `DashboardStats.js` unchanged, microsite is a separate page. |
| **Python deployment** if chosen | Medium | High | Only add Python after pure-PHP v1 is stable. Document Python runtime requirements explicitly in deployment guide. |
| **Auth token passthrough** (if Python sidecar) | High | Medium | Don't do Python sidecar for v1. If ever needed, use a shared HMAC secret for inter-service auth, not JWT forwarding. |

## 11. Recommendations

1. **Start pure PHP + Plotly.js** — zero new infrastructure, 100% compatible with current deployment
2. **Create `AnaliticaController`** with the 13+ endpoints listed above, backed by helper classes
3. **Build `MicrositioPage.js`** as a separate SPA page (keeps current DashboardStats.js for backward compat)
4. **Implement the formulas from memory #92** in PHP helper classes first (they're the hardest part)
5. **Defer Python** to post-v1 evaluation — only if PHP computation proves too slow or verbose
6. **Plotly.js replaces Chart.js** for the microsite only (lazy-loaded); keep Chart.js for other pages
7. **Per-herd filtering** is the most impactful UX feature — add it as a top-level dropdown
8. **Date range picker** is the second most impactful — all endpoints should accept `desde`/`hasta`

## 12. Ready for Proposal

**Yes.** The data is available, the formulas are defined, the architecture patterns are clear, and the integration points are well-understood. The next step is `sdd-propose` to formalize scope, or `sdd-design` to specify the detailed API contracts, helper class interfaces, and component hierarchy.
