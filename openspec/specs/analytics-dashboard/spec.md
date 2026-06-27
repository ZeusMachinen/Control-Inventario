# Delta for Analytics Dashboard

## ADDED Requirements

### Requirement: Tab-Specific PDF Content Export

The system **MUST** export different content for each active tab in the micrositio statistics page. The exported PDF **MUST** reflect the specific data and visualizations of the currently selected tab, not a generic snapshot.

#### Scenario: Dashboard tab exports KPIs and charts

- GIVEN the user is on the Dashboard tab with KPIs and two charts visible
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes: KPIs as a formatted table (metric + value + delta), composition chart captured as PNG, and time series chart captured as PNG

#### Scenario: Composicion tab exports category table and donut chart

- GIVEN the user is on the Composicion tab
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a table with categories (terneros, destetados, novillos, etc.) showing quantities and percentages, plus the donut chart captured as PNG

#### Scenario: Rankings tab exports podium and score table

- GIVEN the user is on the Rankings tab
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a visual podium (gold/silver/bronze) and a score table with columns: animal, score, veredicto, key metrics

#### Scenario: Comparativa tab exports multi-herd table with conditional formatting

- GIVEN the user is on the Comparativa tab with 3 herds selected
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a comparison table where the best value per metric is highlighted in green and the worst in red, plus the bar chart captured as PNG

#### Scenario: Proyecciones tab exports 12-month projection table

- GIVEN the user is on the Proyecciones tab
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a projection table at 12 months with bands (optimista/esperada/pesimista) and the line chart captured as PNG

#### Scenario: Scorecard tab exports individual animal fiche

- GIVEN the user is on the Scorecard tab viewing a specific animal
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes all animal metrics in a structured format: reproductive, financial, and genealogy sections

#### Scenario: Descarte tab exports cull list with traffic light

- GIVEN the user is on the Descarte tab
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a table with traffic light indicators (green/yellow/red) and cull scores

### Requirement: Active Filters Visible in PDF

The system **MUST** display the currently active filters in the PDF metadata section. Filters **MUST** include: herd selection, date period, and granularity. The format **MUST** be: "Rebaño: {value} | Período: {start} - {end} | Granularidad: {value}".

#### Scenario: Filters appear in PDF footer

- GIVEN filters are set to Rebaño="Todos", Periodo="Ene 2025 - Dic 2025"
- WHEN the PDF is generated
- THEN the metadata section shows "Rebaño: Todos | Período: Ene 2025 - Dic 2025"

### Requirement: Tab Name as PDF Subtitle

The system **MUST** use the active tab name as the PDF subtitle below the main title. The subtitle **MUST** be rendered in 14pt bold text.

#### Scenario: Dashboard tab name as subtitle

- GIVEN the Dashboard tab is active
- WHEN the PDF is generated
- THEN the PDF subtitle reads "Dashboard" in 14pt bold

## MODIFIED Requirements

### Requirement: Exportacion PDF y Excel

The system **MUST** allow exporting the visible dashboard to PDF and underlying data to Excel/CSV, preserving active filters and date range. The PDF export **MUST** use the new PDFExport engine with tab-specific content, chart capture, and styled tables instead of the current innerText placeholder.

(Previously: Generic innerText dump truncated to 3000 characters with no chart capture or table formatting)

#### Scenario: Exportar dashboard a PDF

- GIVEN a dashboard with herd and date filters applied
- WHEN the user presses "Exportar PDF"
- THEN a PDF is generated with visible KPIs and rendered charts
- AND the file includes the generation date and active filters
- AND each tab exports its specific content (not a generic snapshot)

#### Scenario: Exportar datos a Excel

- GIVEN a dashboard with filtered data
- WHEN the user presses "Exportar Excel"
- THEN a .xlsx file downloads with tabular KPI data
- AND each metric occupies a column with descriptive headers
