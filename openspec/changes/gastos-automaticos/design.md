# Design: Gastos Automáticos desde Vacunación

## 1. Resumen Técnico

Se modifica `VacunacionController` para que cree/actualice/elimine automáticamente registros en la tabla `gastos` al hacer store/update/destroy de vacunaciones. Se corrige `GastosController` para que los totales respeten los mismos filtros que el listado. En frontend se agrega estimación de costo en `VacunacionForm` y columna de costo total en `VacunacionList`.

### Convenciones existentes que este diseño sigue
- `generarGastoPastaje()` en `RebanoController` crea/actualiza gastos con el mismo patrón (sin transacciones, llama a `CostosSyncHelper::sincronizarGasto`)
- `medicamentos.precio` ya existe en la DB (aunque no está en `schema.sql`)
- `vacunaciones.costo_veterinario` ya existe en la DB (aunque no está en `schema.sql`)
- Los gastos de tipo "medicamentos" ya son válidos según el ENUM de `gastos.tipo`

## 2. Base de Datos

### Migración
```sql
-- Agregar columna gasto_id a vacunaciones para vincular con gastos
ALTER TABLE vacunaciones
  ADD COLUMN gasto_id INT UNSIGNED NULL AFTER costo_veterinario,
  ADD CONSTRAINT fk_vacunacion_gasto FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE SET NULL;
```

**Nota**: Se usa `ON DELETE SET NULL` porque si alguien elimina el gasto directamente desde GastosPage, la vacunación no se pierde — solo queda sin vinculo.

### Actualizar schema.sql
Agregar la columna `gasto_id` y la FK al DDL de `vacunaciones` en `database/schema.sql` para que futuras instalaciones la tengan.

## 3. Backend

### 3.1 VacunacionController::index() — Incluir datos del gasto

Modificar la query para incluir el monto del gasto asociado:

```php
$vacunaciones = Database::query(
    'SELECT v.*, m.nombre as medicamento_nombre, m.precio as medicamento_precio, 
            r.nombre as rebano_nombre, g.monto as gasto_monto
     FROM vacunaciones v
     JOIN medicamentos m ON m.id = v.medicamento_id
     LEFT JOIN rebanos r ON r.id = v.rebano_id
     LEFT JOIN gastos g ON g.id = v.gasto_id
     WHERE v.usuario_id = :uid
     ORDER BY v.fecha DESC',
    [':uid' => $uid]
);
```

### 3.2 Helper: calcularMontoGasto()

Método privado reusable para ambos store/update:

```php
private function calcularMontoGasto(array $datos, int $vacunacionId, int $uid): array
{
    // Obtener precio del medicamento
    $med = Database::queryOne(
        'SELECT precio FROM medicamentos WHERE id = :id AND usuario_id = :uid',
        [':id' => (int)$datos['medicamento_id'], ':uid' => $uid]
    );
    $precio = $med ? (float)($med['precio'] ?? 0) : 0;

    // Contar animales
    $count = 0;
    if (!empty($datos['vacunar_rebano']) && !empty($datos['rebano_id'])) {
        $animales = Database::query(
            'SELECT COUNT(*) as total FROM animales WHERE rebano_id = :rid AND usuario_id = :uid AND activo = 1',
            [':rid' => (int)$datos['rebano_id'], ':uid' => $uid]
        );
        $count = (int)($animales[0]['total'] ?? 0);
    } else {
        $row = Database::queryOne(
            'SELECT COUNT(*) as total FROM vacunacion_animales WHERE vacunacion_id = :vid',
            [':vid' => $vacunacionId]
        );
        $count = (int)($row['total'] ?? 0);
    }

    $costoVet = isset($datos['costo_veterinario']) ? (float)$datos['costo_veterinario'] : 0;
    $monto = ($precio * $count) + $costoVet;

    // Descripción: "Vacunación - {medicamento_nombre} ({count} animales)"
    $med = Database::queryOne(
        'SELECT nombre FROM medicamentos WHERE id = :id',
        [':id' => (int)$datos['medicamento_id']]
    );
    $desc = $med ? "Vacunación - {$med['nombre']} ({$count} animales)" : "Vacunación ({$count} animales)";

    return [
        'monto' => $monto,
        'descripcion' => $desc,
        'count' => $count,
    ];
}
```

### 3.3 VacunacionController::store()

Secuencia completa:

1. Insertar vacunación (ya existe)
2. Insertar animales en `vacunacion_animales` (ya existe)
3. Si `vacunar_rebano=true`: insertar animales del rebaño (ya existe)
4. Llamar a `$costo = $this->calcularMontoGasto($datos, $vacunacionId, $uid)`
5. Si `$monto >= 0` (siempre es true, pero filtramos creación innecesaria si monto=0 Y no hay costo_veterinario):

```php
$monto = $costo['monto'];

// Mes basado en la fecha de vacunación
$mes = date('Y-m-01', strtotime($datos['fecha']));

Database::execute(
    'INSERT INTO gastos (tipo, descripcion, monto, mes, rebano_id, usuario_id)
     VALUES (:tipo, :desc, :monto, :mes, :rid, :uid)',
    [
        ':tipo'  => 'medicamentos',
        ':desc'  => $costo['descripcion'],
        ':monto' => $monto,
        ':mes'   => $mes,
        ':rid'   => !empty($datos['rebano_id']) ? (int)$datos['rebano_id'] : null,
        ':uid'   => $uid,
    ]
);

$gastoId = Database::lastInsertId();

// Sincronizar a costos_mensuales
CostosSyncHelper::sincronizarGasto((int)$gastoId, $uid);

// Vincular gasto a vacunación
Database::execute(
    'UPDATE vacunaciones SET gasto_id = :gasto WHERE id = :id',
    [':gasto' => $gastoId, ':id' => $vacunacionId]
);
```

6. Devolver `$this->show($id)`

**Decisión**: Se crea el gasto incluso si monto=0, para mantener trazabilidad. La descripción aclara "sin costo" en ese caso.

### 3.4 VacunacionController::update()

1. Obtener vacunación existente (incluyendo `gasto_id`)
2. Actualizar datos de vacunación (ya existe)
3. Si se enviaron animales: reemplazar lista (ya existe)
4. Si `vacunar_rebano=true`: reemplazar con animales del nuevo rebaño (NUEVO — manejarlo igual que en store)
5. Llamar a `$costo = $this->calcularMontoGasto($datos, (int)$id, $uid)`
6. Si `$existente['gasto_id']`:
   - `UPDATE gastos SET monto = :monto, descripcion = :desc, mes = :mes WHERE id = :gastoId`
   - `CostosSyncHelper::sincronizarGasto((int)$gastoId, $uid)`
7. Si NO existe gasto_id:
   - Crear nuevo gasto (misma lógica que store)
   - `UPDATE vacunaciones SET gasto_id = :gasto WHERE id = :id`

### 3.5 VacunacionController::destroy()

1. Obtener vacunación (incluyendo `gasto_id`) ANTES de eliminar:

```php
$vac = Database::queryOne(
    'SELECT id, gasto_id FROM vacunaciones WHERE id = :id AND usuario_id = :uid',
    [':id' => (int)$id, ':uid' => $uid]
);
if (!$vac) Response::error('Vacunación no encontrada', 404);

$gastoId = $vac['gasto_id'];

// Eliminar vacunación (cascade a vacunacion_animales)
Database::execute(
    'DELETE FROM vacunaciones WHERE id = :id AND usuario_id = :uid',
    [':id' => (int)$id, ':uid' => $uid]
);

// Eliminar gasto asociado si existe
if ($gastoId) {
    CostosSyncHelper::eliminarGasto((int)$gastoId, $uid);
    Database::execute(
        'DELETE FROM gastos WHERE id = :id',
        [':id' => $gastoId]
    );
}

Response::json(['mensaje' => 'Vacunación eliminada']);
```

### 3.6 GastosController::index() — Totales filtrados

**Problema actual** (líneas 57-60): Los totales usan una query separada que solo filtra por `usuario_id`, ignorando todos los filtros aplicados al listado.

**Solución**: Reusar el mismo `$where` y `$params` del listado:

```php
// Totales por tipo — usar los MISMOS filtros que el listado
$totales = Database::query(
    'SELECT tipo, SUM(monto) as total FROM gastos g WHERE ' . implode(' AND ', $where) . ' GROUP BY tipo',
    $params
);
```

Esto asegura que:
- Si se filtra por tipo → la suma es solo de ese tipo
- Si se filtra por mes → la suma es solo de ese mes
- Si se filtra por rango → la suma es solo de ese rango
- Si no se filtra → suma global

## 4. Frontend

### 4.1 VacunacionForm.js — Estimación de costo en tiempo real

Agregar después del campo costo_veterinario:

```html
<div id="costo-estimado" class="form-group" style="display:none">
  <div class="card" style="background:var(--gris-fondo);padding:1rem">
    <strong>Costo estimado:</strong>
    <span id="costo-monto" style="font-size:1.3rem;font-weight:700;color:var(--primary)">$0</span>
    <div style="font-size:0.85rem;color:var(--texto-secundario);margin-top:0.25rem">
      (droga: $<span id="costo-droga">0</span> + veterinario: $<span id="costo-vet">0</span>)
    </div>
  </div>
</div>
```

Lógica JavaScript:

```js
// Guardar precios al cargar medicamentos
const precios = {};
(meds.data || []).forEach(m => { precios[m.id] = parseFloat(m.precio) || 0; });

function recalcularCosto() {
  const medId = document.getElementById('vac-medicamento').value;
  const precio = precios[medId] || 0;
  const rebanoId = document.getElementById('vac-rebano').value;
  const costoVet = parseFloat(document.getElementById('vac-costo-vet').value) || 0;

  let count = 0;
  if (rebanoId) {
    // No podemos saber cuántos animales tiene el rebaño desde el frontend
    document.getElementById('costo-estimado').style.display = 'none';
    return;
  }
  count = document.querySelectorAll('.vac-animal:checked').length;

  if (count === 0 && costoVet === 0) {
    document.getElementById('costo-estimado').style.display = 'none';
    return;
  }

  const monto = (precio * count) + costoVet;
  document.getElementById('costo-monto').textContent = Formateador.moneda(monto);
  document.getElementById('costo-droga').textContent = Formateador.moneda(precio * count);
  document.getElementById('costo-vet').textContent = Formateador.moneda(costoVet);
  document.getElementById('costo-estimado').style.display = '';
}

// Vincular eventos existentes:
// - onChange de #vac-medicamento
// - onChange de #vac-rebano (ocultar al cambiar)
// - onChange de #vac-costo-vet
// - onChange de checkboxes .vac-animal
```

**Importante**: Cuando `vacunar_rebano=true`, no podemos estimar desde el frontend porque no sabemos la cantidad exacta de animales activos del rebaño. En ese caso se oculta la estimación y se calcula del lado del servidor.

### 4.2 VacunacionList.js — Columna de costo total

1. Agregar columna "Costo Total" en el `<thead>`:
```html
<th onclick="VacunacionListPage.ordenarPor('gasto_monto')" data-columna="gasto_monto" class="th-sortable">Costo Total</th>
```

2. Agregar key `gasto_monto` al mapper `obtenerValor()`:
```js
gasto_monto: parseFloat(item.gasto_monto) || 0,
```

3. Agregar celda en el `tbody`:
```js
<td><strong>${item.gasto_monto ? Formateador.moneda(item.gasto_monto) : '-'}</strong></td>
```

4. Actualizar `colspan` en el mensaje de carga/vacío (de 7 a 8).

## 5. Secuencia de Implementación

1. **Migration SQL** — agregar columna `gasto_id` a `vacunaciones`, actualizar `schema.sql`
2. **Backend: VacunacionController** — modificar `store()` + `update()` + `destroy()` + `index()`
3. **Backend: GastosController** — corregir query de totales en `index()`
4. **Frontend: VacunacionForm** — agregar bloque de estimación y lógica JS
5. **Frontend: VacunacionList** — agregar columna "Costo Total"

## 6. Consideraciones

| Aspecto | Decisión |
|---------|----------|
| **Medicamento sin precio** | precio se trata como 0 en el cálculo |
| **costo_veterinario null** | se trata como 0 |
| **Transacciones** | No hay manejo transaccional en el código base (`Database` helper no usa transacciones). Si falla la creación del gasto, la vacunación ya quedó creada. Riesgo aceptable — sigue el patrón existente de `generarGastoPastaje` que tampoco usa transacciones |
| **Backwards compatibility** | Vacunaciones existentes tienen `gasto_id=null`. Al editarlas se crea el gasto y se vincula |
| **Monto = 0** | Se crea el gasto igual para mantener trazabilidad, con descripción que aclare "sin costo" |
| **Eliminación directa del gasto** | Si alguien elimina el gasto desde GastosPage, la FK tiene `ON DELETE SET NULL`, la vacunación queda con `gasto_id=null`. En la próxima edición se recrea el gasto |
| **CostosSyncHelper** | Se llama a `sincronizarGasto()` solo si el gasto tiene `rebano_id` (el helper internamente retorna si no hay rebano) — esto replica el comportamiento de `GastosController::store()` |
| **Mes del gasto** | Se usa el mes de la fecha de vacunación (`date('Y-m-01', strtotime($datos['fecha']))`), no el mes actual |
| **Descripción del gasto** | Formato: `"Vacunación - {nombre_medicamento} ({count} animales)"` |

## 7. Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|------------|------------|
| **Datos inconsistentes** si falla la creación del gasto después de insertar la vacunación | Media | Sin transacciones nativas, es un riesgo aceptado (mismo patrón que pastaje). El gasto_id queda null y la vacunación existe sin gasto |
| **Gastos huérfanos** si se elimina la vacunación pero falla la eliminación del gasto | Baja | Se elimina primero la vacunación (cascade a animales), luego el gasto. Si falla el DELETE del gasto, queda huérfano pero sin referencia |
| **Rendimiento** en listados con JOIN a gastos para cada vacunación | Baja | El LEFT JOIN es indexado por PK y el volumen de datos es bajo en sistemas ganaderos |
