# Analytics Dashboard Specification

## Purpose

Tablero principal del micrositio de estadisticas que presenta KPIs agregados, composicion detallada del hato, graficos de series temporales y filtros dinamicos para analizar el hato completo.

## Requirements

### Requirement: KPI Cards Agregados

El sistema **MUST** mostrar tarjetas KPI con metricas financieras, reproductivas y sanitarias calculadas sobre el rango de fechas y rebano seleccionados. Las metricas **MUST** incluir: total de animales, tasa de natalidad, tasa de prenez, costo por cabeza/mes, ROI promedio, partos del periodo, y gastos totales.

#### Scenario: Dashboard carga con filtros por defecto

- GIVEN un usuario accede al micrositio sin filtros aplicados
- WHEN la pagina carga
- THEN el sistema muestra KPIs calculados para todo el hato y los ultimos 12 meses
- AND la carga completa ocurre en menos de 2 segundos con 500+ animales

#### Scenario: KPIs se recalculan al cambiar filtro de rebano

- GIVEN un hato con multiples rebanos
- WHEN el usuario selecciona un rebano especifico en el filtro
- THEN todos los KPIs se recalculan solo para ese rebano
- AND el recalculo ocurre en menos de 1 segundo

#### Scenario: KPIs se recalculan al cambiar rango de fechas

- GIVEN un dashboard con datos de 3+ anos
- WHEN el usuario ajusta el rango de fechas a un trimestre especifico
- THEN los KPIs reflejan solo datos dentro del rango seleccionado

### Requirement: Composicion Detallada del Hato

El sistema **MUST** mostrar la composicion del hato desglosada por edad, sexo y estado productivo. Las categorias **MUST** ser: terneros lactando 0-8m (machos y hembras por separado), terneros destetados 9-17m (machos y hembras por separado), novillos 18+m (machos en desarrollo), toretes 18+m (machos reproductores jovenes), vacas 18+m (hembras con al menos 1 parto), toros adultos 24+m (reproductores activos), y vacas vacias 30+m sin prenez activa. Cada categoria **MUST** mostrar: cantidad de animales, porcentaje del hato, y peso promedio.

#### Scenario: Composicion en grafico de barras apiladas

- GIVEN un hato con animales de diversas edades y sexos
- WHEN el usuario accede al dashboard
- THEN se muestra un grafico de barras apiladas con las categorias detalladas
- AND cada barra distingue machos y hembras con colores diferentes
- AND el tooltip muestra cantidad y porcentaje de cada segmento

#### Scenario: Composicion filtrada por rebano

- GIVEN un hato con multiples rebanos
- WHEN el usuario selecciona un rebano en el filtro
- THEN la composicion detallada se recalcula solo para ese rebano
- AND las categorias sin animales no se muestran (filtradas automaticamente)

#### Scenario: Drill-down desde composicion a lista de animales

- GIVEN la composicion detallada visible
- WHEN el usuario hace clic en una categoria (ej. vacas vacias 30+m)
- THEN navega a una lista filtrada de los animales de esa categoria
- AND la lista permite ordenar por edad, peso, dias vacia

### Requirement: Graficos de Series Temporales Interactivos

El sistema **MUST** renderizar graficos interactivos con Plotly.js mostrando evolucion temporal de metricas clave. Los graficos **MUST** soportar zoom, drill-down, tooltips y cambio de granularidad (dia/mes/ano).

#### Scenario: Grafico de natalidad mensual con zoom

- GIVEN datos de natalidad de 24 meses
- WHEN el usuario hace zoom en un trimestre del grafico
- THEN Plotly.js amplia la vista mostrando datos diarios si estan disponibles
- AND los tooltips muestran valores exactos al pasar el cursor

#### Scenario: Cambio de granularidad en grafico financiero

- GIVEN un grafico de costos con granularidad mensual
- WHEN el usuario cambia a granularidad anual
- THEN los datos se agregan por ano mediante GROUP BY SQL
- AND el grafico se redibuja en menos de 500ms

### Requirement: Comparativas Mes-a-Mes y Ano-a-Ano

El sistema **MUST** permitir comparar metricas entre periodos consecutivos (MoM) y entre el mismo mes de anos diferentes (YoY), mostrando variacion porcentual con indicadores visuales (verde/rojo).

#### Scenario: Comparativa MoM de tasa de prenez

- GIVEN datos de prenez de enero y febrero
- WHEN el usuario activa la vista comparativa MoM
- THEN el sistema muestra la variacion porcentual entre ambos meses
- AND un indicador verde indica mejora, rojo indica deterioro

#### Scenario: Comparativa YoY de costos por cabeza

- GIVEN datos de costos de marzo 2025 y marzo 2026
- WHEN el usuario activa la vista comparativa YoY
- THEN el sistema muestra la variacion porcentual ano contra ano
- AND el grafico superpone ambas series temporales

### Requirement: Exportacion PDF y Excel

El sistema **MUST** permitir exportar el dashboard visible a PDF y los datos subyacentes a Excel/CSV, preservando filtros activos y rango de fechas.

#### Scenario: Exportar dashboard a PDF

- GIVEN un dashboard con filtros de rebano y fechas aplicados
- WHEN el usuario presiona "Exportar PDF"
- THEN se genera un PDF con los KPIs visibles y graficos renderizados
- AND el archivo incluye la fecha de generacion y los filtros aplicados

#### Scenario: Exportar datos a Excel

- GIVEN un dashboard con datos filtrados
- WHEN el usuario presiona "Exportar Excel"
- THEN se descarga un archivo .xlsx con los datos tabulares de los KPIs
- AND cada metrica ocupa una columna con encabezados descriptivos

### Requirement: Diseno Mobile-First Responsivo

El sistema **MUST** renderizar correctamente en viewport de 375px minimo, reorganizando KPIs en columna unica y graficos con scroll horizontal cuando sea necesario.

#### Scenario: Dashboard en mobile 375px

- GIVEN un dispositivo con viewport de 375px de ancho
- WHEN el usuario accede al dashboard
- THEN las tarjetas KPI se muestran en una sola columna apilada
- AND los graficos son navegables con scroll horizontal
- AND los filtros son accesibles mediante menu desplegable colapsable

### Requirement: Rendimiento con 500+ Animales

El sistema **MUST** cargar el dashboard completo en menos de 2 segundos con 500+ animales y 5+ anos de datos historicos, usando agregacion SQL con GROUP BY y granularidad configurable.

#### Scenario: Carga inicial con dataset grande

- GIVEN una base de datos con 500+ animales y 5 anos de registros
- WHEN el usuario accede al dashboard por primera vez
- THEN la respuesta del servidor llega en menos de 1 segundo
- AND el renderizado completo en el navegador ocurre en menos de 2 segundos

#### Scenario: Cambio de filtro con dataset grande

- GIVEN un dashboard ya cargado con 500+ animales
- WHEN el usuario cambia el filtro de rebano
- THEN los nuevos datos se cargan en menos de 500ms mediante request AJAX
