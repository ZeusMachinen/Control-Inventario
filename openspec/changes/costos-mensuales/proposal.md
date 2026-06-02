# Proposal: Costos Mensuales por Cabeza + Inversiones

## Problema
1. No hay registro mensual del costo por cabeza por rebaño
2. Medicamentos, vacunas, veterinario y compras de animales no se vinculan automáticamente a costos
3. Inversiones (meds, vet, compras) están mezcladas con gastos (mantenimiento)
4. No se puede calcular cuánto valió un animal y cuánto produjo

## Solución
Crear un sistema de **Costos Mensuales** que:
1. Calcule automáticamente la **cantidad de cabezas** por rebaño cada mes (histórico)
2. Separe **inversiones** (medicamentos, veterinario, compras de animales) de **gastos** (mantenimiento)
3. Auto-alimente desde los registros existentes (vacunaciones, medicamentos, ventas)
4. Muestre **costo total / costo por cabeza** por mes y rebaño

## Flujo
- Rebaño creado en fecha X con Y animales
- Primer mes completo (siguiente al inicio) comienza el cálculo
- Animales que entran/salen ajustan el headcount desde ese mes
- Medicamentos comprados, vacunas aplicadas, vet contratado → se registran como inversión del mes
- Gastos manuales (mantenimiento, alimento) → quedan como gasto
- El sistema divide: (inversiones + gastos) / cabezas del mes
