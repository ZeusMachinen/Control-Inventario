# Proposal: Micrositio de Estadísticas y Analítica del Hato

## Intent

El módulo actual de estadísticas (5 endpoints, 12 tarjetas KPI estáticas, 5 gráficos Chart.js sin interactividad) no refleja la riqueza de datos disponible en las 16 tablas del sistema. No hay rankings por animal, tasas reproductivas reales, comparativas temporales, ni análisis financiero integrado. El usuario necesita un centro de analítica completo que responda: ¿cuáles son mis mejores y peores animales?, ¿cuánto me cuesta cada cabeza?, ¿cómo evoluciona mi hato en el tiempo?

## Scope

### In Scope
- Dashboard integral: KPIs financieros, reproductivos y sanitarios con filtros por rebaño y rango de fechas
- Rankings podium (oro/plata/bronce) de mejores/peores vacas (natalidad, edad 1er parto, intervalo entre partos) y toros (crías/año, peso promedio crías)
- Scorecards individuales por animal con EPD simplificado y veredicto
- Costo por cabeza/mes + ROI neto por animal (costo de crianza vs precio de venta)
- Comparativas mes-a-mes y año-a-año (time series)
- Proyecciones a 12 meses (crecimiento esperado, pariciones estimadas)
- Exportación a PDF y Excel/CSV
- Mobile-first responsive, carga lazy, interactividad con Plotly.js (zoom, drill-down, tooltips)
- Backend PHP puro (nuevo `AnaliticaController` + helpers de cálculo). Sin Python en v1.

### Out of Scope
- Python (FastAPI/Streamlit) — diferido a v2 si se requieren modelos estadísticos avanzados (ARIMA, ML)
- Alertas automáticas por email/push
- Panel multi-usuario con roles (veterinario, socio) — single admin
- Forecasting con machine learning
- Modificar flujos existentes de registro (solo lectura de datos)

## Capabilities

### New Capabilities
- `analytics-dashboard`: Tablero principal con KPIs agregados, gráficos temporales y filtros dinámicos
- `animal-scorecard`: Scorecards individuales con rankings, EPD y veredicto por animal
- `herd-analytics`: Analítica agregada por rebaño con comparativas y proyecciones

### Modified Capabilities
- None — el micrositio consume datos existentes sin alterar el comportamiento de otros módulos

## Approach

Nuevo `AnaliticaController` (13+ endpoints) con helpers PHP (`ScorecardHelper`, `EPDHelper`, `ProyeccionHelper`) que implementan las fórmulas del documento de analítica (shrinkage bayesiano, ponderación por recencia, índice EPD). Frontend: nueva ruta SPA `/estadisticas` (reemplaza la actual) con componentes modulares y Plotly.js para gráficos interactivos. El `EstadisticaController` actual se mantiene por retrocompatibilidad pero el frontend migra completamente.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `api/controllers/AnaliticaController.php` | New | 13+ endpoints de analítica |
| `api/helpers/ScorecardHelper.php` | New | Cálculo de scorecards toro/vaca |
| `api/helpers/EPDHelper.php` | New | Índice EPD normalizado |
| `api/helpers/ProyeccionHelper.php` | New | Proyecciones a 12 meses |
| `public/js/pages/estadisticas/` | Modified | Reescritura completa del frontend |
| `public/js/app.js` | Modified | Nueva ruta y lazy-load de Plotly.js |
| `public/js/components/Sidebar.js` | Modified | Actualizar enlace de navegación |
| `api/routes/web.php` | Modified | Nuevas rutas de analítica |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tiempos de respuesta lentos con 5+ años de datos | Medium | Agregación SQL con GROUP BY, granularidad configurable (?granularidad=mes), caché de benchmarks por request |
| Complejidad de fórmulas en PHP sin bibliotecas estadísticas | Low | Fórmulas ya especificadas (mem #92); solo requieren aritmética básica y funciones de agregación SQL |
| Plotly.js (1.2MB) afecta carga inicial | Low | Lazy-load solo en ruta `/estadisticas`; Chart.js se mantiene para el resto de la app |

## Rollback Plan

El `EstadisticaController` y `DashboardStats.js` actuales no se eliminan. Si el micrositio falla, se revierte `app.js` para apuntar a la ruta anterior. Los nuevos archivos (controller, helpers, JS) se pueden eliminar sin afectar otras funcionalidades.

## Dependencies

- Plotly.js (CDN, lazy-loaded)
- jsPDF + SheetJS (para exportación PDF/Excel)
- Fórmulas de Engram obs #92 (ya documentadas)
- Ningún cambio en schema de base de datos requerido

## Success Criteria

- [ ] Dashboard carga en < 2 segundos con 500+ animales
- [ ] Rankings de toros y vacas muestran datos correctos validados contra consultas manuales
- [ ] Comparativas mes-a-mes y año-a-año funcionales con al menos 2 años de datos
- [ ] Exportación PDF y Excel genera archivos legibles con los datos visibles en pantalla
- [ ] Micrositio responsive funcional en mobile (viewport 375px)
- [ ] Proyecciones a 12 meses basadas en tasas históricas reales del hato
