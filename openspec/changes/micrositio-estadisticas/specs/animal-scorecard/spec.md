# Animal Scorecard Specification

## Purpose

Scorecards individuales por animal con rankings tipo podio, índice EPD simplificado, veredicto (excelente/bueno/regular/deficiente) para vacas y toros, y lista de descarte para vacas no productivas.

## Requirements

### Requirement: Ranking de Vacas por Productividad

El sistema **MUST** rankear vacas por: tasa de natalidad, cantidad de partos, edad al primer parto, IEP promedio (días entre partos), y días desde el último parto. El ranking **MUST** calcular un score compuesto usando shrinkage bayesiano y ponderación por recencia. Vacas con < 30 meses de edad se excluyen del ranking (etapa de desarrollo).

#### Scenario: Ranking de vacas con podio visual

- GIVEN un rebaño con 50+ vacas con historial reproductivo
- WHEN el usuario accede al ranking de vacas
- THEN las 3 mejores vacas se muestran en formato podio (oro/plata/bronce)
- AND el resto se lista en tabla ordenada por score descendente
- AND cada vaca muestra: natalidad %, partos totales, edad 1er parto, IEP promedio (días), días desde último parto

#### Scenario: Scorecard individual de una vaca

- GIVEN un ranking de vacas visible
- WHEN el usuario hace clic en una vaca específica
- THEN se muestra su scorecard completo con historial reproductivo
- AND el veredicto (excelente/bueno/regular/deficiente) se calcula según fórmulas de Engram #92
- AND el índice EPD simplificado se muestra normalizado 0-100

#### Scenario: Vacas sin datos suficientes

- GIVEN una vaca con menos de 2 partos registrados
- WHEN se calcula su scorecard
- THEN el sistema aplica shrinkage bayesiano hacia la media del rebaño
- AND muestra una etiqueta "Datos insuficientes — score ajustado"

### Requirement: Ranking de Toros por Producción de Crías

El sistema **MUST** rankear toros por: crías por año y peso promedio de crías. El ranking **MUST** usar el mismo modelo de shrinkage bayesiano que el ranking de vacas.

#### Scenario: Ranking de toros con podio visual

- GIVEN un rebaño con 10+ toros con registro de descendencia
- WHEN el usuario accede al ranking de toros
- THEN los 3 mejores toros se muestran en formato podio (oro/plata/bronce)
- AND cada toro muestra: crías/año, peso promedio crías, score total

#### Scenario: Scorecard individual de un toro

- GIVEN un ranking de toros visible
- WHEN el usuario hace clic en un toro específico
- THEN se muestra su scorecard con lista de descendencia
- AND el veredicto se calcula según fórmulas de Engram #92
- AND el EPD del toro se muestra con desglose por componente

### Requirement: Vista por Rebaño y por Animal Individual

El sistema **MUST** soportar vista agregada por rebaño (todos los rankings de un rebaño) y vista drill-down a scorecard individual de un animal específico.

#### Scenario: Vista agregada por rebaño

- GIVEN un hato con 3 rebaños
- WHEN el usuario selecciona un rebaño en el filtro
- THEN se muestran rankings de vacas y toros solo de ese rebaño
- AND un resumen de distribución de veredictos (cuántos excelentes, buenos, etc.)

#### Scenario: Drill-down a scorecard individual

- GIVEN un ranking de rebaño visible
- WHEN el usuario hace clic en cualquier animal del ranking
- THEN navega a la scorecard individual con historial completo
- AND el historial incluye todos los eventos reproductivos, ventas y gastos asociados

### Requirement: Historial Completo del Animal

El sistema **MUST** mostrar el historial completo de cada animal: eventos reproductivos, partos, ventas, gastos asociados, y cambios de rebaño, en una ventana de tiempo configurable.

#### Scenario: Historial reproductivo completo

- GIVEN una vaca con 5+ años de registro
- WHEN el usuario abre su scorecard
- THEN se muestra timeline con: servicios, diagnósticos de celo/gestación, partos
- AND cada evento muestra fecha, resultado, y animal vinculado (toro/cría)

#### Scenario: Costo acumulado del animal

- GIVEN un animal con gastos y costos registrados
- WHEN el usuario abre la sección financiera del scorecard
- THEN se muestra costo acumulado de crianza vs precio de venta (si fue vendido)
- AND el ROI neto se calcula y muestra con indicador visual

### Requirement: Costo por Cabeza/Mes y ROI por Animal

El sistema **MUST** calcular costo de crianza por cabeza por mes y ROI neto por animal (costo acumulado vs precio de venta o valor estimado actual).

#### Scenario: ROI de animal vendido

- GIVEN una vaca que fue vendida con precio registrado
- WHEN se consulta su scorecard financiera
- THEN el ROI = precio_venta - costo_acumulado
- AND se muestra como porcentaje y monto absoluto

#### Scenario: ROI estimado de animal activo

- GIVEN una vaca activa sin venta registrada
- WHEN se consulta su scorecard financiera
- THEN el ROI estimado usa valor de mercado basado en peso y categoría
- AND se marca claramente como "estimado"

### Requirement: Lista de Descarte de Vacas

El sistema **MUST** generar una lista de vacas candidatas a descarte basada en tiempo vacía y estado reproductivo. La edad mínima para evaluación **MUST** ser 30 meses (2.5 años). El score de riesgo **MUST** ponderar: días desde último parto (0.50) + edad en meses (0.20) + partos totales (0.15) + tasa de preñez histórica (0.15). El semáforo de descarte **MUST** usar: 🟢 bajo riesgo (< 365 días desde último parto o estado Preñada/Lactando), 🟡 atención (≥ 365 días, estado Vacía, sin preñez activa), 🔴 descarte recomendado (≥ 540 días vacía, sin preñez).

#### Scenario: Lista de descarte con semáforo

- GIVEN un hato con vacas de 30+ meses de edad
- WHEN el usuario accede a la lista de descarte
- THEN las vacas se ordenan por mayor tiempo vacía primero
- AND cada vaca muestra: días desde último parto, estado, edad, partos totales, veredicto (🟢/🟡/🔴)
- AND las vacas con < 30 meses no aparecen en la lista

#### Scenario: Vaca con más de un año vacía sin preñez

- GIVEN una vaca de 30+ meses con último parto hace 400 días y estado Vacía
- WHEN se evalúa en la lista de descarte
- THEN el veredicto es 🟡 Atención
- AND su score de riesgo pondera máximo peso a días vacía

#### Scenario: Vaca con más de 540 días vacía

- GIVEN una vaca de 30+ meses con último parto hace 600 días y sin preñez activa
- WHEN se evalúa en la lista de descarte
- THEN el veredicto es 🔴 Descarte recomendado
- AND aparece entre las primeras posiciones de la lista

### Requirement: Exportación de Scorecards

El sistema **MUST** permitir exportar scorecards individuales o rankings completos a PDF y Excel.

#### Scenario: Exportar ranking completo a PDF

- GIVEN un ranking de vacas con 50 animales
- WHEN el usuario presiona "Exportar PDF"
- THEN se genera un PDF con el podio visual y tabla completa
- AND cada fila incluye score, veredicto y métricas clave

#### Scenario: Exportar scorecard individual a Excel

- GIVEN la scorecard de un animal visible
- WHEN el usuario presiona "Exportar Excel"
- THEN se descarga un .xlsx con historial tabular del animal
- AND incluye pestañas: reproductivo, financiero, genealogía
