# Delta for Herd Analytics

## ADDED Requirements

### Requirement: PDF Export of Herd Comparison

The system **MUST** export multi-herd comparisons to PDF with a formatted comparison table. The table **MUST** use conditional formatting: best value per metric highlighted in green (`#2E7D32`), worst value in red (`#C62828`). Below the table, the comparison bar chart **MUST** be captured as PNG via html2canvas.

#### Scenario: Export 3-herd comparison to PDF

- GIVEN a comparison of 3 herds is active with all metrics visible
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a comparison table with green/red conditional formatting and the bar chart captured as PNG
- AND the PDF metadata shows which herds were compared and the date range

### Requirement: PDF Export of 12-Month Projections

The system **MUST** export 12-month projections to PDF with a projection table showing: metric, projected value, optimistic band, expected band, and pessimistic band. The projection line chart **MUST** be captured as PNG below the table.

#### Scenario: Export projection with confidence bands

- GIVEN 12-month projections are visible with optimistic/pessimistic bands
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a table with all projection bands and the line chart captured as PNG
- AND the methodology note ("promedio móvil ponderado por recencia") appears in the metadata

## MODIFIED Requirements

### Requirement: Exportacion de Analiticas de Rebano

The system **MUST** allow exporting herd analytics, comparisons, and projections to PDF and Excel. The PDF export **MUST** use the PDFExport engine with conditional formatting, chart capture, and projection tables instead of the current placeholder.

(Previously: No real PDF export implementation — spec existed but was unfulfilled)

#### Scenario: Exportar comparativa de rebanos a PDF

- GIVEN an active comparison of 3 herds
- WHEN the user presses "Exportar PDF"
- THEN a PDF is generated with comparison table and charts
- AND it includes generation date and analyzed period

#### Scenario: Exportar proyecciones a Excel

- GIVEN 12-month projections are visible
- WHEN the user presses "Exportar Excel"
- THEN a .xlsx file downloads with month-by-month projections
- AND it includes columns: metric, projected value, optimistic band, pessimistic band, calculation method
