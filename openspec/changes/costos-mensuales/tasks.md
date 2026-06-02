# Tasks: Costos Mensuales por Cabeza + Inversiones

## DB Migration
- [ ] T1: Crear tabla `costos_mensuales`
- [ ] T2: Crear tabla `conteo_mensual_rebano`
- [ ] T3: Migration SQL script

## Backend
- [ ] T4: Nuevo `CostosController.php` con:
  - `index` — costos por rebaño+mes (con tipo)
  - `cabezas` — headcount histórico por rebaño
  - `recalcular` — recalcular headcount para un rebaño
  - `recalcularTodos` — recalcular todo
- [ ] T5: Modificar `GastosController.php` — al crear/editar gasto, auto-sincronizar a costos_mensuales
- [ ] T6: Modificar `MedicamentoController.php` — al crear/editar med con precio, auto-sincronizar
- [ ] T7: Modificar `VacunacionController.php` — al crear vacuna, auto-sincronizar costo_veterinario + dosis
- [ ] T8: Agregar rutas en `web.php`

## Frontend
- [ ] T9: `CostosRebanoPage.js` — tabla mensual por rebaño
- [ ] T10: Agregar botón "💰 Costos" en `RebanoList.js`
- [ ] T11: Modificar `GastosPage.js` — solapa "Inversiones" auto-poblada + separar visualmente
- [ ] T12: Registrar ruta en `app.js` + script en `index.html`
