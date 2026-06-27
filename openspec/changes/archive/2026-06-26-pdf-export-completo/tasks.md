# Tasks: Exportación PDF Profesional — Completa y Reutilizable

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500 (authored) + ~72KB vendor (minified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Integration) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | PDF engine + vendor files + print CSS | PR 1 | base=main; standalone helper, verifiable in isolation |
| 2 | Micrositio tab export integration | PR 2 | base=main; uses engine from PR 1, per-tab content extraction |

## Phase 1: Foundation — PDF Export Engine

- [x] 1.1 Download `html2canvas` v1.4.1 → `public/vendor/html2canvas.min.js` (CDN fallback)
- [x] 1.2 Download `jspdf-autotable` v3.8.x → `public/vendor/jspdf-autotable.min.js`
- [x] 1.3 Create `public/js/utils/pdfExport.js` with lazy CDN→vendor dependency loader (5s timeout, error toast)
- [x] 1.4 Add `PDFExport.create()` fluent builder API (title, orientation, logo config)
- [x] 1.5 Add `addSection()` type routing: title (18pt bold), text (11pt), table, chart, metadata (8pt gray), spacer
- [x] 1.6 Implement chart capture via html2canvas with `Plotly.toImage()` WebGL fallback
- [x] 1.7 Style jspdf-autotable: green header #2E7D32, alternating rows #F5F5F5/#FFF, page-break headers
- [x] 1.8 Add logo header (fa-cow SVG + "Control Ganadero") on first page only at (14,10)
- [x] 1.9 Add metadata footer: generation date DD/MM/YYYY HH:mm, active filters, user name
- [x] 1.10 Create `public/css/print.css` with @media print rules (hide buttons, tooltips, scrollbars, nav)

## Phase 2: Integration — Micrositio Wiring

- [x] 2.1 Link `print.css` in `public/index.html` via `<link rel="stylesheet">`
- [x] 2.2 Rewrite `exportarPDF()`: create PDFExport, dispatch by active tab, pass filters, save
- [x] 2.3 Extract Dashboard content: KPIs table + chart selectors for html2canvas
- [x] 2.4 Extract Composicion content: category table (terneros/destetados/novillos) + donut chart selector
- [x] 2.5 Extract Rankings content: podium (gold/silver/bronze) + score table with grupos A/B
- [x] 2.6 Extract Comparativa content: multi-herd table with green-best/red-worst highlight + bar chart
- [x] 2.7 Extract Proyecciones content: 12-month bands table (optimista/esperada/pesimista) + line chart
- [x] 2.8 Wire Descarte as 6th tab in `tabs[]` + `cambiarTab`; extract traffic-light cull list table
- [x] 2.9 Extract Scorecard content: reproductive metrics, financial summary, genealogy from API data

## Phase 3: Polish & Verify

- [x] 3.1 Verify all 7 export paths produce correct PDFs per spec scenarios (title, tables, charts, metadata)
- [x] 3.2 Test CDN online path and vendor offline fallback (disconnect network, verify local load)
- [x] 3.3 Verify UTF-8: Spanish accented chars (á, é, í, ó, ú, ñ) in titles, table cells, metadata
- [x] 3.4 Verify dark mode: print CSS renders correctly in both light and dark themes
- [x] 3.5 Verify Excel export works unchanged (no regression on XLSX path)
- [x] 3.6 Cross-browser: verify export in Chrome, Edge, Firefox
