# Tasks: Árbol Genealógico en Detalle de Animal

## Review Workload Forecast

- **Estimated changed lines**: ~271
- **400-line budget risk**: Low
- **Chained PRs recommended**: No
- **Decision needed before apply**: No

## Task Breakdown

### Task 1: Backend — Endpoint árbol genealógico

**Files**: `api/controllers/AnimalController.php`, `api/routes/web.php`
**Lines**: ~70 + 1

**Subtasks**:
1. Agregar método `arbolGenealogico(string $id): void` en `AnimalController`
2. Implementar queries: animal actual, madre, padre, abuelos maternos, abuelos paternos, hijos (madre_id OR padre_id), hermanos
3. Construir respuesta con stats (tiene_padres, tiene_hijos, total_hijos, total_hermanos)
4. Agregar ruta en `web.php` después de `/api/animales/{id}/baja`

### Task 2: Frontend — Botón y modal árbol genealógico

**File**: `public/js/pages/animales/AnimalDetail.js`
**Lines**: ~200

**Subtasks**:
1. Agregar botón "Árbol Genealógico" en page-header, condicionado a madre_id/padre_id
2. Crear función `abrirArbolGenealogico(id)` con modal + loader + llamada API
3. Crear función `renderArbol(datos)` que renderiza el árbol jerárquico
4. Implementar lógica de visibilidad: mostrar botón si tiene hijos aunque no tenga padres
5. Agregar estilos CSS para conectores del árbol
6. Cards clickeables con estilo por estado (muerto=gris, vendido=rojo)

## Dependencies
- Task 1 debe completarse antes de poder probar Task 2 (aunque pueden implementarse en paralelo)
- Task 2 requiere conocer la estructura de datos que devuelve Task 1
