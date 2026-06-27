# Proposal: Exportación PDF Profesional — Completa y Reutilizable

## Intent

La exportación PDF actual (`MicrositioEstadisticasPage.exportarPDF()`, 17 líneas) es un placeholder que vuelca `innerText` truncado a 3000 caracteres. No captura gráficos, no formatea tablas, no incluye logo, no muestra filtros aplicados. Tres specs del micrositio de estadísticas (`analytics-dashboard`, `animal-scorecard`, `herd-analytics`) exigen exportación PDF profesional con gráficos renderizados, tablas estructuradas, y metadata contextual — y ninguna se cumple. Este cambio reemplaza esa implementación por un sistema de exportación PDF completo, reutilizable, y visualmente profesional que cubra todos los módulos actuales y futuros.

## Scope

### In Scope
- **Helper de exportación PDF compartido** (`public/js/utils/pdfExport.js`) con API declarativa: título, secciones (texto, tabla, gráfico), metadata, logo
- **Reescritura de `MicrositioEstadisticasPage.exportarPDF()`** usando el nuevo helper, cubriendo los 7 tabs: Dashboard, Composición, Rankings, Comparativa, Proyecciones, Scorecard, Descarte
- **Captura de gráficos Plotly.js** como imágenes en el PDF vía `html2canvas`
- **Renderizado de tablas profesionales** con `jspdf-autotable` (bordes, colores de categoría, alineación, saltos de página automáticos)
- **Logo de Control Ganadero** en el PDF: SVG inline del ícono `fa-cow` + texto "Control Ganadero" como encabezado
- **Metadata en el PDF**: fecha de generación, nombre del tab/sección, filtros aplicados (rebaño, período), usuario
- **Carga lazy de dependencias** (`html2canvas`, `jspdf-autotable`) desde CDN con fallback y manejo de errores
- **CSS de impresión** para ocultar elementos interactivos cuando se captura el DOM

### Out of Scope
- Exportación PDF server-side (Dompdf/mPDF) — se mantiene client-side por decisión de diseño
- Exportación Excel — ya funciona correctamente con SheetJS, no se modifica
- Módulos que actualmente exportan JSON (Sidebar, AnimalList) — no migran a PDF en este cambio
- Generación de PDFs programáticos/automáticos (email, reportes nocturnos)
- Firma digital o metadatos avanzados de PDF/A
- PDFs multi-idioma — solo español

## Capabilities

### New Capabilities
- `pdf-export-engine`: Motor de exportación PDF reutilizable con templates por tipo de contenido (dashboard, tabla, ranking, scorecard)

### Modified Capabilities
- `analytics-dashboard`: La funcionalidad de exportar PDF del dashboard se reescribe completamente
- `animal-scorecard`: La exportación PDF de rankings y scorecards ahora genera PDFs reales
- `herd-analytics`: La exportación PDF de comparativas y proyecciones se implementa por primera vez

## Approach

### Arquitectura

```
public/js/utils/pdfExport.js  ← NUEVO helper compartido
  ├── PDFExport.create({ title, orientation, logo })
  ├── PDFExport.addSection({ type: 'title'|'text'|'table'|'chart'|'metadata' })
  ├── PDFExport.captureChart(containerSelector) → html2canvas → PNG → PDF
  └── PDFExport.save(filename)

public/js/pages/estadisticas/MicrositioEstadisticasPage.js
  └── exportarPDF() reescrito → llama a PDFExport con los datos del tab activo

public/vendor/
  ├── html2canvas.min.js       ← NUEVA (CDN fallback: copia local ~42KB)
  └── jspdf-autotable.min.js   ← NUEVA (CDN fallback: copia local ~30KB)
```

### Decisiones técnicas

| Decisión | Alternativa considerada | Razón |
|---|---|---|
| `html2canvas` para capturar gráficos | `Plotly.toImage()` | `toImage()` depende del CDN de Plotly y no funciona offline; html2canvas captura cualquier DOM (Chart.js, Plotly, tablas custom) |
| `jspdf-autotable` plugin oficial | Hacer tablas manuales con `doc.rect()` + `doc.text()` | autotable maneja saltos de página, ancho de columnas, estilos de celda — el boilerplate manual sería ~200 líneas por tabla |
| Helper compartido en `utils/` | Lógica inline en cada página | Reutilizable; futuros módulos (árbol genealógico, reportes) solo llaman `PDFExport.addTable()` |
| Logo SVG inline en JS | Archivo PNG en `public/img/` | Sin dependencia de archivos externos; el SVG de fa-cow es 2KB y se embebe directo en el PDF |
| jsPDF 2.5.1 (mantener versión) | jsPDF 3.x | v3 cambia la API de plugins; v2.5.1 ya está probado y autotable es compatible |
| CDN con copia local de fallback | Solo CDN | El sistema ya funciona en zonas rurales con conectividad intermitente; copia local en `vendor/` como safety net |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `public/js/utils/pdfExport.js` | **New** | Motor de exportación PDF reutilizable (~250 líneas) |
| `public/js/pages/estadisticas/MicrositioEstadisticasPage.js` | **Modified** | Reescritura de `exportarPDF()` (~80 líneas → llama al helper) |
| `public/vendor/html2canvas.min.js` | **New** | Librería de captura DOM (~42KB) |
| `public/vendor/jspdf-autotable.min.js` | **New** | Plugin de tablas para jsPDF (~30KB) |
| `public/index.html` | **Modified** | Agregar `<script>` tags con `defer` para nuevas librerías |
| `public/css/print.css` | **New** | Reglas `@media print` para ocultar botones, tooltips, scrollbars |
| `openspec/changes/micrositio-estadisticas/specs/` | **Referenced** | No se modifican — este cambio implementa lo que esas specs ya piden |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `html2canvas` no captura Plotly correctamente (WebGL canvas) | Medium | Plotly 2.35+ soporta `Plotly.toImage()` como fallback; si html2canvas falla en WebGL, se usa `toImage()` que devuelve PNG base64 |
| jsPDF + autotable genera PDFs muy pesados con muchas tablas | Low | Las tablas del micrositio rara vez exceden 50 filas; autotable maneja paginación automática |
| Carga de librerías desde CDN lenta en zonas rurales | Medium | Copias locales en `vendor/` como fallback; se intenta CDN primero (cacheado por browser), luego local |
| Romper compatibilidad con browsers viejos | Low | html2canvas y jsPDF soportan ES5+; el proyecto ya usa Bootstrap 5.3 y Plotly 2.35 que tienen requisitos similares |
| `CapturePrompt` — el usuario podría esperar un PDF idéntico al dashboard | Low | El PDF será una representación fiel pero no pixel-perfect; se incluye nota visual "vista previa de impresión" |

## Rollback Plan

1. Revertir `MicrositioEstadisticasPage.exportarPDF()` a la versión anterior (el placeholder)
2. Eliminar `public/js/utils/pdfExport.js`, `public/vendor/html2canvas.min.js`, `public/vendor/jspdf-autotable.min.js`
3. Quitar los `<script>` tags agregados en `index.html`
4. Eliminar `public/css/print.css`

El `AnaliticaController` y los helpers de backend no se tocan. La exportación Excel (SheetJS) sigue funcionando sin cambios.

## Dependencies

- **html2canvas 1.4.1** (CDN + copia local en `vendor/`)
- **jspdf-autotable 3.8.x** (CDN + copia local en `vendor/`)
- **jsPDF 2.5.1** (ya disponible vía CDN en el código actual)
- **FontAwesome 6.7.2** (ya disponible) — para el ícono del logo
- Plotly.js 2.35.2 (opcional — fallback con `Plotly.toImage()`)
- Ningún cambio en backend PHP requerido

## Success Criteria

- [ ] `PDFExport` funciona como helper independiente: cualquier página puede generar un PDF con 3 líneas de código
- [ ] Los 7 tabs del micrositio exportan PDFs distintos con contenido específico: gráficos capturados, tablas formateadas, metadata visible
- [ ] El logo "Control Ganadero" + ícono vaca aparece en el encabezado de todo PDF generado
- [ ] Los filtros activos (rebaño, período, granularidad) quedan registrados en el PDF
- [ ] La carga de librerías funciona con CDN y con fallback local si el CDN no responde en 5 segundos
- [ ] El PDF generado para "Comparativa de Rebaños" incluye tabla con formato de colores por rebaño + gráfico de barras capturado
- [ ] El PDF generado para "Rankings" incluye podio visual (oro/plata/bronce) con scores y veredictos
- [ ] Sin regresiones: la exportación Excel sigue funcionando idéntico
- [ ] Sin regresiones: el micrositio carga en < 2 segundos (las librerías PDF se cargan lazy, no en carga inicial)
