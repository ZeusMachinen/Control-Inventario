# Proposal: Gastos Automáticos desde Vacunación

## Intent

Hoy los gastos de vacunación no se registran automáticamente en el sistema. Esto genera:
- **Totales de gastos incorrectos**: los filtros de tipo o período no se aplican en los totales.
- **Trabajo manual**: el usuario debe ingresar manualmente cada gasto de vacunación.
- **Falta de trazabilidad**: no hay relación entre la vacunación y el gasto asociado.
- **Cálculos manuales**: el costo total (precio del medicamento × cantidad de animales + costo veterinario) no se calcula ni muestra.

Este cambio automatiza la creación, actualización y eliminación de gastos cuando se registra una vacunación, y asegura que los totales de gastos respeten los filtros aplicados.

## Scope

### In Scope
- **Creación automática de gastos**: al registrar una vacunación, se crea un gasto asociado de tipo "medicamentos".
- **Actualización automática**: al editar una vacunación, se recalcula y actualiza el gasto asociado.
- **Eliminación automática**: al eliminar una vacunación, se elimina el gasto asociado.
- **Cálculo automático del monto**: `monto = (precio_medicamento × cantidad_animales) + costo_veterinario`.
- **Estimación en tiempo real**: en el formulario de vacunación, se muestra el costo estimado al seleccionar el medicamento y la cantidad de animales.
- **Totales de gastos filtrados**: los totales de gastos ahora respetan los filtros de tipo y período.
- **Migración de datos**: se agrega una columna `gasto_id` a la tabla `vacunaciones` para vincular cada vacunación con su gasto.

### Out of Scope
- **Soporte para otros tipos de gastos**: este cambio solo aplica a vacunaciones. Otros tipos (ej.: alimentación, mano de obra) no se ven afectados.
- **Historial de cambios**: no se registrará un historial de modificaciones en los gastos.
- **Sincronización con contabilidad externa**: no se integrará con sistemas de contabilidad externos.
- **Notificaciones**: no se enviarán notificaciones al crear/editar/eliminar gastos.


## Capabilities

### New Capabilities
- `gastos-vacunacion`: Registro automático de gastos asociados a vacunaciones, incluyendo creación, actualización y eliminación.

### Modified Capabilities
- `gastos-totales`: Los totales de gastos ahora respetan los filtros de tipo y período aplicados en la consulta.


## Approach

1. **Backend**:
   - Modificar `VacunacionController` para que, al crear/editar/eliminar una vacunación, se cree/actualice/elimine un gasto asociado.
   - Calcular el monto del gasto como `(precio_medicamento × cantidad_animales) + costo_veterinario`.
   - Agregar una columna `gasto_id` a la tabla `vacunaciones` para vincular cada vacunación con su gasto.
   - Modificar `GastosController::index()` para que los totales respeten los filtros de tipo y período.

2. **Frontend**:
   - En `VacunacionForm.js`, mostrar el costo estimado al seleccionar el medicamento y la cantidad de animales.
   - En `VacunacionList.js`, mostrar el costo total de cada vacunación.

3. **Base de datos**:
   - Crear una migración para agregar la columna `gasto_id` a la tabla `vacunaciones`.


## Affected Areas

| Area                                      | Impact       | Description                                                                                     |
|-------------------------------------------|--------------|-------------------------------------------------------------------------------------------------|
| `api/controllers/GastosController.php`    | Modified     | Aplicar filtros de tipo y período a la query de totales.                                       |
| `api/controllers/VacunacionController.php`| Modified     | Crear/actualizar/eliminar gastos automáticamente al registrar una vacunación.                  |
| `public/js/pages/vacunacion/VacunacionForm.js` | Modified     | Mostrar estimación del costo al seleccionar medicamento y cantidad de animales.                |
| `public/js/pages/vacunacion/VacunacionList.js` | Modified     | Mostrar el costo total de cada vacunación.                                                      |
| `database/migrations/`                    | New          | Migración para agregar la columna `gasto_id` a la tabla `vacunaciones`.                        |
| `database/schema.php`                     | Modified     | Actualizar esquema para incluir la nueva columna `gasto_id` en `vacunaciones`.                 |


## Risks

| Risk                                      | Likelihood | Mitigation                                                                                     |
|-------------------------------------------|------------|-------------------------------------------------------------------------------------------------|
| **Datos inconsistentes**: Si falla la creación/actualización/eliminación del gasto, la vacunación podría quedar en un estado inválido. | Medium      | Usar transacciones en la base de datos para asegurar que ambas operaciones (vacunación y gasto) se completen o fallen juntas. |
| **Rendimiento**: El cálculo del monto y la creación del gasto podrían ralentizar las operaciones de vacunación. | Low         | Optimizar las queries y realizar pruebas de carga.                                             |
| **Filtros no aplicados**: Si los filtros de totales no se aplican correctamente, los reportes de gastos podrían ser incorrectos. | Medium      | Probar exhaustivamente los filtros en `GastosController::index()`.                             |
| **Migración fallida**: Si la migración de la columna `gasto_id` falla, el sistema podría quedar en un estado inconsistente. | Low         | Probar la migración en un entorno de staging antes de aplicarla en producción.                 |


## Rollback Plan

1. **Revertir migración**: Ejecutar una migración inversa para eliminar la columna `gasto_id` de la tabla `vacunaciones`.
2. **Restaurar código**: Revertir los cambios en `GastosController.php`, `VacunacionController.php`, `VacunacionForm.js` y `VacunacionList.js` a su estado anterior.
3. **Verificar datos**: Asegurarse de que no queden gastos huérfanos o vacunaciones con `gasto_id` inválido.
4. **Probar funcionalidad**: Validar que las operaciones de vacunación y gastos funcionen correctamente sin los cambios.


## Dependencies

- **Base de datos**: La tabla `costos_mensuales` debe existir y estar accesible.
- **Backend**: `GastosController` y `VacunacionController` deben estar funcionando correctamente.
- **Frontend**: Los archivos `VacunacionForm.js` y `VacunacionList.js` deben estar implementados y accesibles.


## Success Criteria

- [ ] Al crear una vacunación, se crea un gasto asociado con el monto calculado correctamente.
- [ ] Al editar una vacunación, el gasto asociado se actualiza con el nuevo monto.
- [ ] Al eliminar una vacunación, el gasto asociado se elimina.
- [ ] Los totales de gastos respetan los filtros de tipo y período.
- [ ] En el formulario de vacunación, se muestra el costo estimado al seleccionar el medicamento y la cantidad de animales.
- [ ] En la lista de vacunaciones, se muestra el costo total de cada vacunación.
- [ ] La columna `gasto_id` existe en la tabla `vacunaciones` y está correctamente poblada.
- [ ] No hay gastos huérfanos ni vacunaciones con `gasto_id` inválido.