# Spec: Gastos Automáticos desde Vacunación

## Descripción
Cuando se crea, edita o elimina una vacunación, el sistema debe crear, actualizar o eliminar automáticamente un gasto asociado de tipo "medicamentos", calculando el monto como (precio_medicamento × cantidad_animales) + costo_veterinario.

## Escenarios

### Creación
Scenario: Crear vacunación con animales individuales seleccionados
  Given un medicamento con precio 5000 y un costo_veterinario de 20000
  When se registra una vacunación con 10 animales y costo_veterinario=20000
  Then se crea un gasto tipo "medicamentos" con monto = (5000 × 10) + 20000 = 70000
  And el gasto queda vinculado a la vacunación via gasto_id

Scenario: Crear vacunación con "vacunar rebaño completo"
  Given un rebaño con 15 animales activos (Novillo/Adulto)
  When se registra una vacunación con vacunar_rebano=true
  Then se crea un gasto con monto calculado sobre los 15 animales

Scenario: Crear vacunación sin costo_veterinario
  Given un medicamento con precio 3000
  When se registra una vacunación con 5 animales y costo_veterinario=null
  Then se crea un gasto con monto = 3000 × 5 = 15000

Scenario: Crear vacunación con medicamento sin precio
  Given un medicamento con precio=null
  When se registra una vacunación con 8 animales y costo_veterinario=10000
  Then se crea un gasto con monto = 0 + 10000 = 10000

Scenario: Crear vacunación sin precio ni costo_veterinario
  Given un medicamento sin precio y costo_veterinario=null
  When se registra una vacunación con 3 animales
  Then se crea un gasto con monto = 0

Scenario: Crear vacunación con 0 animales y monto 0
  Given un medicamento con precio 5000
  When se registra una vacunación con 0 animales y costo_veterinario=null
  Then se crea un gasto con monto = 0
  And la descripción del gasto aclara que fue sin costo

### Actualización
Scenario: Editar vacunación cambiando cantidad de animales
  Given una vacunación existente con 5 animales y gasto asociado de 25000
  When se edita la vacunación agregando 3 animales más (total 8)
  Then el gasto se actualiza con el nuevo monto recalculado

Scenario: Editar vacunación cambiando costo_veterinario
  Given una vacunación existente con costo_veterinario=10000
  When se cambia costo_veterinario a 25000
  Then el gasto se actualiza con el nuevo monto

Scenario: Editar vacunación cambiando medicamento
  Given una vacunación existente con medicamento de precio 3000
  When se cambia a un medicamento de precio 8000
  Then el gasto se actualiza con el nuevo monto recalculado

Scenario: Editar vacunación de rebaño completo cambiando rebaño
  Given una vacunación asociada a un rebaño con 10 animales
  When se cambia a otro rebaño con 20 animales
  Then el gasto se actualiza con el monto recalculado sobre los 20 animales

### Eliminación
Scenario: Eliminar vacunación con gasto asociado
  Given una vacunación con un gasto asociado
  When se elimina la vacunación
  Then el gasto asociado también se elimina
  And la referencia en costos_mensuales también se elimina
  And la vacunación se elimina de vacunacion_animales

Scenario: Eliminar vacunación sin gasto asociado
  Given una vacunación sin gasto asociado (gasto_id=null)
  When se elimina la vacunación
  Then la vacunación se elimina normalmente

### Cobertura
Scenario: Vacunación sin gasto asociado (existente antes de migración)
  Given una vacunación creada antes de la migración (gasto_id=null)
  When se edita esa vacunación
  Then se crea un nuevo gasto y se vincula

Scenario: Index incluye datos del gasto asociado
  Given una vacunación con un gasto asociado de monto 70000
  When se consulta el listado de vacunaciones
  Then la respuesta incluye el monto del gasto para cada vacunación
