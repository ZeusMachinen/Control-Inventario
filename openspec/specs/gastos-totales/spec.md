# Spec: Totales de Gastos Filtrados

## Descripción
Los totales de gastos mostrados en el resumen superior de GastosPage deben corresponder al mismo filtro aplicado en el listado de gastos, no a todos los tiempos. Actualmente la query de totales en GastosController ignora los filtros de tipo, mes, año y rango.

## Escenarios

Scenario: Filtrar por tipo específico
  Given hay gastos de varios tipos
  When se selecciona tipo "medicamentos"
  Then los totales muestran solo la suma de gastos tipo medicamentos

Scenario: Filtrar por mes
  Given hay gastos en varios meses
  When se selecciona período "Mes" y un mes específico
  Then los totales muestran solo gastos de ese mes

Scenario: Filtrar por año
  Given hay gastos en varios años
  When se selecciona período "Año" y un año específico
  Then los totales muestran solo gastos de ese año

Scenario: Filtrar por rango personalizado
  Given hay gastos en varias fechas
  When se selecciona período "Rango" con fechas desde/hasta
  Then los totales muestran solo gastos en ese rango

Scenario: Sin filtros (todos los gastos)
  Given hay gastos de todo tipo y período
  When no se aplica filtro específico (solo usuario_id)
  Then los totales muestran la suma global de todos los tipos

Scenario: Sin gastos en el período
  Given no hay gastos en el período filtrado
  When se aplica el filtro
  Then todos los totales muestran 0

Scenario: Filtrar por tipo + período combinados
  Given hay gastos de varios tipos en varios meses
  When se filtra por tipo "mantenimiento" y mes "2026-06"
  Then los totales muestran solo mantenimiento de junio 2026

Scenario: Filtrar por tipo + año combinados
  Given hay gastos de varios tipos en varios años
  When se filtra por tipo "compras" y año "2026"
  Then los totales muestran solo compras de 2026

Scenario: Filtrar por tipo + rango combinados
  Given hay gastos de varios tipos en varias fechas
  When se filtra por tipo "medicamentos" y rango "2026-01-01" a "2026-06-30"
  Then los totales muestran solo medicamentos del primer semestre 2026
