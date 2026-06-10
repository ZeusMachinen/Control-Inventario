# Tasks: Gastos Automáticos desde Vacunación

> Desglose de tareas para implementar el cambio "gastos-automaticos".
> Basado en proposal, design, specs y código existente.

---

## Database

### T1: Migration SQL — agregar columna gasto_id a vacunaciones con FK a gastos

- **Archivos**: `database/migrations/001_add_gasto_id_to_vacunaciones.sql` (nuevo), `database/schema.sql`
- **Descripción**:
  1. Crear archivo de migración con `ALTER TABLE vacunaciones ADD COLUMN gasto_id INT UNSIGNED NULL AFTER ...` y `ADD CONSTRAINT fk_vacunacion_gasto FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE SET NULL`
  2. Actualizar `database/schema.sql` agregando la columna `gasto_id` y la FK en el DDL de `vacunaciones`
  3. Agregar índice para `gasto_id` en `schema.sql`
- **Criterio**: La columna `gasto_id` existe en `vacunaciones`, acepta NULL, tiene FK a `gastos(id)` con `ON DELETE SET NULL`. `schema.sql` refleja el cambio.
- **Dependencias**: Ninguna

---

## Backend — VacunacionController

### T2: Helper privado `calcularMontoGasto()`

- **Archivos**: `api/controllers/VacunacionController.php`
- **Descripción**:
  1. Implementar método privado `calcularMontoGasto(array $datos, int $vacunacionId, int $uid): array`
  2. Obtener `precio` del medicamento desde `medicamentos`
  3. Contar animales vacunados: si `vacunar_rebano=true` y `rebano_id`, contar animales activos del rebaño; si no, contar de `vacunacion_animales`
  4. Calcular `monto = (precio_med * count_animales) + costo_veterinario`
  5. Generar descripción con formato `"Vacunación - {nombre_medicamento} ({count} animales)"`
  6. Retornar `['monto' => float, 'descripcion' => string, 'count' => int]`
- **Criterio**: Dados los mismos datos de entrada, el helper siempre retorna el mismo resultado. Maneja `precio=null` como 0, `costo_veterinario=null` como 0, rebaños sin animales activos como count=0.
- **Dependencias**: Ninguna

### T3: `VacunacionController::store()` — crear gasto automático al registrar vacunación

- **Archivos**: `api/controllers/VacunacionController.php`
- **Descripción**:
  1. Después del bloque de inserción de animales (individual + rebaño, líneas 77-98 actuales), llamar a `$this->calcularMontoGasto($datos, $vacunacionId, $uid)`
  2. Calcular `$mes = date('Y-m-01', strtotime($datos['fecha']))`
  3. `INSERT INTO gastos (tipo, descripcion, monto, mes, rebano_id, usuario_id)` con tipo=`'medicamentos'`
  4. Obtener `$gastoId = Database::lastInsertId()`
  5. Llamar a `CostosSyncHelper::sincronizarGasto($gastoId, $uid)`
  6. `UPDATE vacunaciones SET gasto_id = ? WHERE id = ?` para vincular
  7. Crear gasto incluso si monto=0 (trazabilidad), la descripción aclara "sin costo"
- **Criterio**: Al crear una vacunación vía `POST /api/vacunaciones`, aparece un nuevo registro en `gastos` con tipo=`medicamentos`, monto=(precio_med × animales) + costo_veterinario, vinculado a la vacunación via `gasto_id`. La sincronización a `costos_mensuales` se ejecuta si el gasto tiene `rebano_id`.
- **Dependencias**: T1 (columna `gasto_id`), T2 (`calcularMontoGasto`)

### T4: `VacunacionController::update()` — actualizar/crear gasto al editar vacunación

- **Archivos**: `api/controllers/VacunacionController.php`
- **Descripción**:
  1. Modificar la query de búsqueda inicial para incluir `gasto_id`: `SELECT id, gasto_id FROM vacunaciones WHERE ...`
  2. Después de actualizar campos y reemplazar animales, llamar a `$this->calcularMontoGasto()`
  3. Si `$existente['gasto_id']` existe: `UPDATE gastos SET monto, descripcion, mes WHERE id = ?` y `CostosSyncHelper::sincronizarGasto($gastoId, $uid)`
  4. Si NO existe `gasto_id`: crear nuevo gasto (misma lógica que T3) y vincularlo
  5. Si se envió `vacunar_rebano=true`, reemplazar animales del rebaño (lógica nueva similar a store)
- **Criterio**: Al editar una vacunación vía `PUT /api/vacunaciones/{id}`, el gasto asociado se actualiza con el nuevo monto. Si la vacunación no tenía gasto (gasto_id=null), se crea uno nuevo y se vincula. Sincronización a `costos_mensuales` se ejecuta.
- **Dependencias**: T1 (columna `gasto_id`), T2 (`calcularMontoGasto`)

### T5: `VacunacionController::destroy()` — eliminar gasto al eliminar vacunación

- **Archivos**: `api/controllers/VacunacionController.php`
- **Descripción**:
  1. Reemplazar lógica actual: primero obtener la vacunación con su `gasto_id` ANTES de eliminar
  2. `SELECT id, gasto_id FROM vacunaciones WHERE id = ? AND usuario_id = ?`
  3. Si no existe, devolver 404
  4. `DELETE FROM vacunaciones WHERE id = ? AND usuario_id = ?` (cascade a `vacunacion_animales`)
  5. Si `gasto_id` existe: `CostosSyncHelper::eliminarGasto($gastoId, $uid)` + `DELETE FROM gastos WHERE id = ?`
  6. Retornar `json(['mensaje' => 'Vacunación eliminada'])`
- **Criterio**: Al eliminar una vacunación vía `DELETE /api/vacunaciones/{id}`, el gasto asociado se elimina de `gastos` y su referencia en `costos_mensuales` se limpia. Si no tenía gasto asociado, la eliminación ocurre normalmente.
- **Dependencias**: T1 (columna `gasto_id`)

### T6: `VacunacionController::index()` — incluir monto del gasto asociado en la respuesta

- **Archivos**: `api/controllers/VacunacionController.php`
- **Descripción**:
  1. Modificar la query de `index()` para hacer `LEFT JOIN gastos g ON g.id = v.gasto_id`
  2. Agregar `g.monto as gasto_monto` al `SELECT`
  3. Mantener el subquery de `total_animales` existente
- **Criterio**: La respuesta de `GET /api/vacunaciones` incluye el campo `gasto_monto` para cada vacunación. Vacunaciones sin gasto asociado muestran `gasto_monto=null`.
- **Dependencias**: T1 (columna `gasto_id` existe)

---

## Backend — GastosController

### T7: `GastosController::index()` — aplicar filtros a query de totales

- **Archivos**: `api/controllers/GastosController.php`
- **Descripción**:
  1. Reemplazar la query de totales (líneas 57-60 actuales) que solo filtra por `usuario_id`
  2. Reusar el mismo `$where` y `$params` del listado en la query de totales:
     ```php
     $totales = Database::query(
         'SELECT tipo, SUM(monto) as total FROM gastos g WHERE ' . implode(' AND ', $where) . ' GROUP BY tipo',
         $params
     );
     ```
  3. Asegurar que el alias `g.` está presente en los `$where` (ya lo está por `g.usuario_id = :uid`)
- **Criterio**: Los totales devueltos en `GET /api/gastos` reflejan los mismos filtros de tipo, mes, año y rango que el listado. Escenarios de spec `gastos-totales` se cumplen todos.
- **Dependencias**: Ninguna

---

## Frontend

### T8: `VacunacionForm.js` — mostrar estimación de costo en tiempo real

- **Archivos**: `public/js/pages/vacunacion/VacunacionForm.js`
- **Descripción**:
  1. Guardar `precios` por medicamento al cargar la página (dentro del `render`, recorrer `meds.data`)
  2. Agregar bloque HTML después del campo "Costo Veterinario" (línea 75):
     - Contenedor `#costo-estimado` oculto por defecto
     - Muestra monto total estimado, más detalle de droga y veterinario
  3. Implementar función `recalcularCosto()` que:
     - Lee precio del medicamento, cantidad de checkboxes seleccionados, costo veterinario
     - Calcula monto = (precio × count) + costoVet
     - Actualiza el DOM con `Formateador.moneda()`
     - Oculta el bloque si no hay animales ni costo veterinario
     - Si `vacunar_rebano=true`, oculta (no se puede estimar desde frontend)
  4. Vincular event listeners: onChange de `#vac-medicamento`, `#vac-rebano`, `#vac-costo-vet`, y checkboxes `.vac-animal`
  5. En edición, calcular y mostrar el costo estimado al cargar el formulario
- **Criterio**: Al seleccionar medicamento y animales, se muestra el costo estimado actualizado en tiempo real. Al seleccionar rebaño, la estimación se oculta. Al cambiar a 0 animales y sin costo veterinario, la estimación se oculta.
- **Dependencias**: T2 (para entender la fórmula de cálculo, aunque la implementación frontend replica la misma lógica)

### T9: `VacunacionList.js` — agregar columna "Costo Total"

- **Archivos**: `public/js/pages/vacunacion/VacunacionList.js`
- **Descripción**:
  1. Agregar `<th>` para "Costo Total" en el `<thead>` (después de "Costo Vet."), ordenable por `gasto_monto`
  2. Agregar `gasto_monto: parseFloat(item.gasto_monto) || 0` al mapper `obtenerValor()`
  3. Agregar `<td>` en el `tbody`: muestra `Formateador.moneda(gasto_monto)` si existe, sino `-`
  4. Actualizar `colspan` de 7 a 8 en las filas de carga (línea 31), vacío (línea 87), y error (línea 70)
- **Criterio**: La lista de vacunaciones muestra "Costo Total" en pesos formateados. Vacunaciones sin gasto asociado muestran un guión. Se puede ordenar por esta columna.
- **Dependencias**: T6 (`index()` devuelve `gasto_monto`)

---

## Review

### T10: Verificar que no hay regresiones en CRUD de vacunaciones

- **Archivos**: N/A — pruebas funcionales
- **Descripción**:
  1. Probar crear vacunación con animales individuales → verificar que se crea y tiene gasto asociado
  2. Probar crear vacunación con "vacunar rebaño completo" → verificar cálculo sobre todos los animales del rebaño
  3. Probar crear vacunación con medicamento sin precio → verificar monto = 0 + costo_veterinario
  4. Probar crear vacunación sin costo veterinario → verificar monto = precio_med × animales
  5. Probar editar vacunación cambiando cantidad de animales → verificar que el gasto se actualiza
  6. Probar editar vacunación cambiando medicamento → verificar recálculo
  7. Probar editar vacunación existente sin gasto previo → verificar que se crea el gasto
  8. Probar eliminar vacunación con gasto → verificar que se elimina el gasto
  9. Probar eliminar vacunación sin gasto → verificar que funciona normalmente
  10. Probar que el listado devuelve `gasto_monto` correcto
- **Criterio**: Todos los escenarios del spec `gastos-vacunacion` se cumplen. Las vacunaciones existentes (sin gasto) siguen funcionando. No hay errores 500 ni datos inconsistentes.
- **Dependencias**: T3, T4, T5, T6

### T11: Verificar que los totales de gastos filtrados son correctos

- **Archivos**: N/A — pruebas funcionales
- **Descripción**:
  1. Filtrar por tipo específico → verificar que totales muestran suma de ese tipo
  2. Filtrar por mes → verificar que totales muestran solo gastos de ese mes
  3. Filtrar por año → verificar totales de ese año
  4. Filtrar por rango personalizado → verificar totales dentro del rango
  5. Sin filtros → verificar suma global
  6. Filtrar tipo + período combinados → verificar suma intersectada
  7. Período sin gastos → verificar totales en 0
- **Criterio**: Todos los escenarios del spec `gastos-totales` se cumplen. Los totales en el resumen de `GastosPage` reflejan exactamente los mismos filtros que el listado.
- **Dependencias**: T7

---

## Orden de implementación sugerido

```
T1 (migración)
  ↓
T2 (helper) ──→ T3 (store) ──→ T4 (update) ──→ T5 (destroy) ──→ T6 (index) ──→ T9 (lista frontend)
                     ↓               ↓               ↓
                     └───────────────┴───────────────┴── T10 (review vacunaciones)

T7 (totales filtrados) ───────────────────────────────────────────────────────── T11 (review totales)

T8 (estimación frontend) ── puede hacerse en paralelo con T3-T6, depende solo de T2
```
