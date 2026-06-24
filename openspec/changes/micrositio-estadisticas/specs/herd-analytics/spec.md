# Herd Analytics Specification

## Purpose

Analítica agregada por rebaño con comparativas entre rebaños, proyecciones a 12 meses basadas en tasas históricas reales, y métricas de eficiencia por grupo.

## Requirements

### Requirement: Métricas Agregadas por Rebaño

El sistema **MUST** calcular y mostrar metricas agregadas por rebano: tamano actual, composicion detallada (terneros/as lactando 0-8m, destetados 9-17m, novillos, toretes, vacas, toros, vacas vacias), tasa de natalidad, tasa de mortalidad, tasa de prenez, costo promedio por cabeza, ROI del rebano, y cantidad de vacas en riesgo de descarte (Atencion y Descarte recomendado).

#### Scenario: Dashboard de rebaño individual

- GIVEN un hato con 3 rebaños de diferente tamaño
- WHEN el usuario selecciona un rebaño específico
- THEN se muestran todas las métricas agregadas calculadas solo para ese rebaño
- AND se incluye un grafico de composicion detallada del rebano con las categorias por edad/sexo/estado

#### Scenario: Métricas con datos incompletos

- GIVEN un rebaño nuevo con menos de 3 meses de datos
- WHEN se calculan sus métricas
- THEN las métricas se muestran con indicador "datos preliminares"
- AND el shrinkage bayesiano ajusta hacia la media global del hato

### Requirement: Comparativa entre Rebaños

El sistema **MUST** permitir comparar 2 o más rebaños lado a lado en las mismas métricas, con indicadores visuales de diferencia porcentual.

#### Scenario: Comparativa lado a lado de 3 rebaños

- GIVEN un hato con 3 rebaños
- WHEN el usuario selecciona los 3 rebaños para comparar
- THEN se muestra una tabla comparativa con todas las métricas clave
- AND cada celda muestra el valor y un indicador relativo al mejor rebaño (verde=mejor, rojo=peor)

#### Scenario: Gráfico comparativo de natalidad por rebaño

- GIVEN datos de natalidad de 2+ rebaños en los últimos 12 meses
- WHEN el usuario activa la vista comparativa temporal
- THEN se muestra un gráfico de líneas superpuestas por rebaño
- AND el tooltip identifica el rebaño al pasar sobre cada línea

### Requirement: Proyecciones a 12 Meses

El sistema **MUST** generar proyecciones a 12 meses basadas en tasas históricas reales del rebaño: crecimiento esperado del hato, pariciones estimadas, y costos proyectados. Las proyecciones **MUST** usar promedios móviles ponderados por recencia, no modelos de ML.

#### Scenario: Proyección de crecimiento del hato

- GIVEN un rebaño con 2+ años de datos históricos
- WHEN el usuario accede a las proyecciones
- THEN se muestra gráfico de crecimiento estimado mes a mes por 12 meses
- AND la proyección usa tasas de natalidad y mortalidad históricas ponderadas
- AND se incluye banda de confianza (optimista/pesimista) basada en varianza histórica

#### Scenario: Proyección de pariciones estimadas

- GIVEN vacas preñadas activas en el rebaño
- WHEN se generan proyecciones
- THEN se estiman fechas de parto basadas en diagnósticos de gestación vigentes
- AND se proyectan pariciones adicionales basadas en tasa de servicio histórica
- AND el gráfico distingue entre pariciones confirmadas y estimadas

#### Scenario: Proyección de costos

- GIVEN costos históricos mensuales del rebaño
- WHEN se generan proyecciones financieras
- THEN se proyectan costos mensuales basados en promedio móvil ponderado
- AND se ajusta por tamaño proyectado del rebaño (más animales = más costo)

### Requirement: Comparativas Temporales por Rebaño

El sistema **MUST** soportar comparativas mes-a-mes y año-a-año específicas por rebaño, mostrando tendencias y anomalías.

#### Scenario: Tendencia MoM de un rebaño

- GIVEN un rebaño con 12+ meses de datos
- WHEN el usuario activa la vista de tendencia
- THEN se muestra gráfico de cada métrica con variación mes anterior
- AND las anomalías (>2 desviaciones estándar) se resaltan visualmente

#### Scenario: Comparativa YoY estacional

- GIVEN un rebaño con 2+ años de datos
- WHEN el usuario compara el mismo mes de años diferentes
- THEN se muestra overlay de series temporales
- AND se calcula la variación porcentual por métrica

### Requirement: Metricas de Descarte por Rebano

El sistema **MUST** mostrar para cada rebano la cantidad de vacas en cada nivel de riesgo de descarte (Bajo, Atencion, Descarte recomendado) usando los mismos criterios del scorecard individual (edad minima 30 meses, semaforo por dias vacia). El sistema **MUST** permitir drill-down desde el resumen hacia la lista de descarte del rebano.

#### Scenario: Resumen de riesgo por rebano

- GIVEN un rebano con 50 vacas de 30+ meses
- WHEN el usuario ve las metricas del rebano
- THEN se muestra conteo de vacas en Bajo riesgo, Atencion, y Descarte recomendado
- AND un indicador visual destaca si mas del 15% del rebano esta en riesgo

#### Scenario: Drill-down a lista de descarte desde rebano

- GIVEN el resumen de riesgo de un rebano visible
- WHEN el usuario hace clic en la categoria "Descarte recomendado"
- THEN navega a la lista de descarte filtrada por ese rebano
- AND solo muestra las vacas con veredicto rojo

El sistema **MUST** permitir exportar analíticas de rebaño, comparativas y proyecciones a PDF y Excel.

#### Scenario: Exportar comparativa de rebaños a PDF

- GIVEN una comparativa activa de 3 rebaños
- WHEN el usuario presiona "Exportar PDF"
- THEN se genera un PDF con tabla comparativa y gráficos
- AND incluye fecha de generación y período analizado

#### Scenario: Exportar proyecciones a Excel

- GIVEN proyecciones a 12 meses visibles
- WHEN el usuario presiona "Exportar Excel"
- THEN se descarga un .xlsx con proyecciones mes a mes
- AND incluye columnas: métrica, valor proyectado, banda optimista, banda pesimista, método de cálculo
