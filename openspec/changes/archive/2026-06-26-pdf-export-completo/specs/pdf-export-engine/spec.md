# PDF Export Engine Specification

## Purpose

Reusable client-side PDF export engine with declarative API, section templates, chart capture, styled tables, and lazy-loaded dependencies.

## Requirements

### Requirement: Declarative PDF API

The system **MUST** expose a fluent API: `PDFExport.create({ title, orientation, logo })`, `addSection({ type, data })`, `captureChart(selector)`, and `save(filename)`. Each call **MUST** return the builder instance for chaining.

#### Scenario: Create and save a basic PDF

- GIVEN the PDFExport module is loaded
- WHEN a page calls `PDFExport.create({ title: "Reporte", orientation: "portrait" }).addSection({ type: "title", text: "Mi Reporte" }).save("reporte.pdf")`
- THEN a PDF file named "reporte.pdf" downloads with the title section rendered

#### Scenario: Chained API returns builder

- GIVEN a PDFExport instance created with `create()`
- WHEN `addSection()` is called
- THEN it returns the same builder instance (not undefined or a new object)

### Requirement: Section Types

The system **MUST** support section types: `title` (18pt bold), `text` (11pt body), `table` (autoTable with styles), `chart` (PNG image), `metadata` (8pt gray footer), and `spacer` (configurable height in mm). Each section **MUST** trigger an automatic page break if remaining page height is insufficient.

#### Scenario: Add text section with automatic wrap

- GIVEN a PDF with a text section added
- WHEN the text exceeds the remaining page width
- THEN the text wraps to the next line within margins

#### Scenario: Spacer creates vertical gap

- GIVEN a PDF with `addSection({ type: "spacer", height: 10 })`
- WHEN the PDF is rendered
- THEN there is a 10mm vertical gap between adjacent sections

### Requirement: Styled Tables with jspdf-autotable

The system **MUST** render tables using jspdf-autotable with: header background `#2E7D32` (green), header text white, alternating row backgrounds (`#F5F5F5` / `#FFFFFF`), thin borders (`0.1`), font size 9pt, and automatic column width distribution. Tables **MUST** span multiple pages with repeated headers.

#### Scenario: Table with alternating row colors

- GIVEN a table with 20+ rows
- WHEN the PDF is generated
- THEN odd rows have background `#F5F5F5` and even rows have `#FFFFFF`

#### Scenario: Table header repeats on page break

- GIVEN a table that spans 3 pages
- WHEN the PDF is viewed
- THEN the green header row appears at the top of each page

### Requirement: Chart Capture with html2canvas

The system **MUST** capture chart containers as PNG images using html2canvas. If html2canvas fails on a WebGL canvas (Plotly), the system **MUST** fall back to `Plotly.toImage()` returning a base64 PNG. The captured image **MUST** be scaled to fit the PDF page width minus margins (14mm each side).

#### Scenario: Capture Plotly chart as PNG

- GIVEN a visible Plotly chart in the DOM with selector `#my-chart`
- WHEN `captureChart("#my-chart")` is called
- THEN the chart is captured as PNG and added to the PDF as a full-width image

#### Scenario: Fallback to Plotly.toImage on WebGL failure

- GIVEN a Plotly chart rendered with WebGL
- WHEN html2canvas returns a blank or corrupted image
- THEN the system calls `Plotly.toImage(graphDiv, { format: "png" })` and uses the base64 result

### Requirement: Logo Header

The system **MUST** render a logo on every PDF: an inline SVG of the FontAwesome `fa-cow` icon followed by "Control Ganadero" text, 30mm wide, positioned at coordinates (14, 10) from the top-left of the first page. The logo **MUST** appear only on the first page.

#### Scenario: Logo appears on first page

- GIVEN a PDF created with the default logo option
- WHEN the PDF is opened
- THEN the fa-cow icon + "Control Ganadero" text appears at position (14, 10) on page 1

#### Scenario: Logo does not repeat on subsequent pages

- GIVEN a PDF with 5+ pages
- WHEN viewing pages 2-5
- THEN no logo appears on those pages

### Requirement: PDF Metadata Footer

The system **MUST** append a metadata section at the end of every PDF containing: generation date (format `DD/MM/YYYY HH:mm`), active filters (e.g., "Rebaño: Todos | Período: Ene 2025 - Dic 2025"), and the current user name. Metadata **MUST** render in 8pt gray text (`#757575`).

#### Scenario: Metadata shows active filters

- GIVEN a dashboard with filters: rebano="Todos", periodo="2025"
- WHEN the PDF is generated
- THEN the metadata footer includes "Rebaño: Todos | Período: 2025"

### Requirement: Lazy Loading with CDN + Local Fallback

The system **MUST** load `html2canvas` and `jspdf-autotable` lazily (not at page load). The loading strategy **MUST** attempt CDN first with a 5-second timeout, then fall back to `public/vendor/` local copies. If neither source loads, the system **MUST** show a toast error and abort the export.

#### Scenario: CDN loads successfully

- GIVEN the CDN is reachable
- WHEN `PDFExport.create()` is called for the first time
- THEN html2canvas and jspdf-autotable load from CDN within 5 seconds

#### Scenario: Fallback to local vendor files

- GIVEN the CDN is unreachable (network timeout)
- WHEN PDF export is initiated
- THEN the system loads libraries from `public/vendor/` within 2 seconds

#### Scenario: Error toast when all sources fail

- GIVEN neither CDN nor local vendor files are available
- WHEN the user clicks "Exportar PDF"
- THEN a toast error message appears: "No se pudieron cargar las librerías de PDF"
- AND no PDF download is attempted

### Requirement: UTF-8 Encoding

The system **MUST** encode all PDF text content as UTF-8, correctly rendering Spanish characters: á, é, í, ó, ú, ñ, ü. This **MUST** apply to titles, table cells, metadata, and any user-provided text.

#### Scenario: Spanish characters render correctly

- GIVEN a PDF with text containing "Estadísticas de producción — rebaño ñandú"
- WHEN the PDF is generated
- THEN all accented characters and ñ display correctly (not as garbled symbols)
