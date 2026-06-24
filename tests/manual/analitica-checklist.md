# E2E Checklist — Micrositio de Estadisticas

## Pre-requisitos
- Servidor PHP corriendo (`php -S localhost:8000 router.php`)
- Base de datos MySQL con datos de prueba
- Usuario autenticado

## Pasos

### 1. Dashboard carga correctamente
- [ ] Navegar a `#/estadisticas`
- [ ] Verificar que el shell carga con tabs (Dashboard, Composicion, Rankings, Descarte, Comparativa, Proyecciones)
- [ ] Confirmar que las tarjetas KPI muestran numeros reales
- [ ] Verificar que el filtro de rebano carga opciones
- [ ] Cambiar filtro de rebano y confirmar que los KPIs se actualizan

### 2. Composicion detallada
- [ ] Hacer clic en tab "Composicion"
- [ ] Verificar que el grafico de torta se renderiza con Plotly
- [ ] Confirmar que la tabla muestra las 8+ categorias con cantidades, % y peso
- [ ] Total del hato coincide con la suma de categorias

### 3. Rankings y Scorecards
- [ ] Hacer clic en tab "Rankings"
- [ ] Verificar podio (oro/plata/bronce) con nombres y scores
- [ ] Cambiar a toros y confirmar que muestra datos diferentes
- [ ] Hacer clic en un animal del ranking → modal de scorecard se abre
- [ ] Scorecard muestra EPD, veredicto, y timeline de historial

### 4. Lista de Descarte
- [ ] Hacer clic en tab "Descarte"
- [ ] Verificar resumen de riesgo (verde/amarillo/rojo)
- [ ] Confirmar que vacas con >540 dias vacias aparecen en rojo
- [ ] Alertas: si >15% en riesgo, aparece banner de advertencia

### 5. Exportacion
- [ ] Desde cualquier tab, hacer clic en boton PDF
- [ ] Se descarga archivo .pdf con los datos de la vista actual
- [ ] Hacer clic en boton Excel
- [ ] Se descarga archivo .xlsx con tablas exportadas

## Mobile
- [ ] Reducir viewport a 375px (Chrome DevTools)
- [ ] Verificar que tabs tienen scroll horizontal
- [ ] KPIs se apilan en 1 o 2 columnas
- [ ] Modal de scorecard ocupa pantalla completa

## Dark Mode
- [ ] Activar dark mode desde el toggle
- [ ] Verificar que los fondos y textos del micrositio usan el tema oscuro
- [ ] Podium mantiene legibilidad en dark mode
