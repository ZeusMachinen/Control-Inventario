# Delta for Animal Scorecard

## ADDED Requirements

### Requirement: PDF Export of Rankings with Podium

The system **MUST** export cow and bull rankings to PDF with a visual podium (gold/silver/bronze) rendered as formatted sections. The podium **MUST** show: rank position, animal name, composite score, and verdict. Below the podium, the full ranking table **MUST** include columns: animal, score, veredicto, and key metrics (natalidad %, partos, IEP).

#### Scenario: Export cow ranking with podium

- GIVEN a cow ranking with 50+ animals visible
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a podium section (top 3) followed by the complete ranking table
- AND each row shows score, verdict, and key reproductive metrics

#### Scenario: Export bull ranking with podium

- GIVEN a bull ranking with 10+ bulls visible
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes a podium section (top 3) followed by the complete ranking table
- AND each row shows calves/year, average calf weight, and total score

### Requirement: PDF Export of Individual Scorecard

The system **MUST** export an individual animal scorecard to PDF with structured sections: reproductive (history, events, IEP), financial (accumulated cost, ROI, cost per head/month), and genealogy (parents, offspring). Each section **MUST** be separated by a spacer and have a section title.

#### Scenario: Export individual cow scorecard

- GIVEN a cow scorecard is open with full reproductive history
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes sections: reproductive timeline, financial summary with ROI, and genealogy tree
- AND each section has a clear title header

#### Scenario: Export individual bull scorecard

- GIVEN a bull scorecard is open with descendant list
- WHEN the user clicks "Exportar PDF"
- THEN the PDF includes sections: descendant table, EPD breakdown by component, and verdict calculation

## MODIFIED Requirements

### Requirement: Exportacion de Scorecards

The system **MUST** allow exporting individual scorecards or complete rankings to PDF and Excel. The PDF export **MUST** use the PDFExport engine with podium rendering, styled tables, and sectioned layout instead of the current placeholder.

(Previously: Placeholder export with no real PDF generation — only innerText dump)

#### Scenario: Exportar ranking completo a PDF

- GIVEN a cow ranking with 50 animals
- WHEN the user presses "Exportar PDF"
- THEN a PDF is generated with the visual podium and complete table
- AND each row includes score, verdict, and key metrics

#### Scenario: Exportar scorecard individual a Excel

- GIVEN an animal scorecard is visible
- WHEN the user presses "Exportar Excel"
- THEN a .xlsx file downloads with the animal's tabular history
- AND it includes tabs: reproductive, financial, genealogy
