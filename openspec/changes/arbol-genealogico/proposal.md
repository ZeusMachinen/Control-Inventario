# Proposal: Árbol Genealógico en Detalle de Animal

## Intent

**Problema**: Los usuarios del sistema de gestión ganadera necesitan visualizar las relaciones genealógicas de un animal (padres, abuelos, hijos y hermanos) de manera clara y accesible. Actualmente, esta información existe en la base de datos pero no está disponible en una vista consolidada, lo que obliga a los usuarios a navegar manualmente entre múltiples registros para reconstruir el árbol genealógico.

**Oportunidad**: Implementar un árbol genealógico visual en el detalle de cada animal mejorará la experiencia del usuario, reducirá el tiempo de búsqueda de información y facilitará la toma de decisiones reproductivas o de manejo.

## Scope

### In Scope
- **Backend**: Nuevo endpoint `GET /api/animales/{id}/arbol-genealogico` que devuelve:
  - Datos del animal actual.
  - Padres (madre y padre) y abuelos (maternos y paternos).
  - Hijos (por `madre_id` o `padre_id`).
  - Hermanos (mismos padres).
  - Estados (`activo`, `estado_general`) para estilizar en el frontend.
- **Frontend**:
  - Botón "Árbol Genealógico" en el detalle del animal, visible solo si el animal tiene padres **o** hijos.
  - Modal Bootstrap con visualización del árbol genealógico (3 niveles: abuelos → padres → animal actual → hijos).
  - Estilización condicional: animales muertos en gris, vendidos en rojo.
  - Conectores visuales con CSS (líneas verticales/horizontales).
  - Links clickeables a cada perfil de animal.
- **Archivos afectados**:
  - `api/controllers/AnimalController.php` (nuevo método).
  - `api/routes/web.php` (nueva ruta).
  - `public/js/pages/animales/AnimalDetail.js` (botón y modal).

### Out of Scope
- Edición de datos genealógicos desde el árbol (solo visualización).
- Exportación del árbol a PDF o imagen.
- Árbol genealógico en otros módulos (ej: reportes).
- Profundidad mayor a 3 niveles (abuelos → padres → hijos).
- Sincronización en tiempo real con cambios en la base de datos.

## Capabilities

### New Capabilities
- `animal-genealogy-tree`: Visualización de relaciones genealógicas de un animal en un árbol interactivo. Incluye datos de padres, abuelos, hijos y hermanos, con estilización condicional basada en el estado del animal.

### Modified Capabilities
- `animal-detail`: Se modifica para incluir un nuevo botón de acción que permite acceder al árbol genealógico. La visibilidad del botón depende de la existencia de padres o hijos.

## Approach

1. **Backend**:
   - Crear el endpoint `GET /api/animales/{id}/arbol-genealogico` en `AnimalController`.
   - Implementar lógica para recuperar padres, abuelos, hijos y hermanos desde la base de datos.
   - Incluir estados (`activo`, `estado_general`) en la respuesta para permitir estilización en el frontend.

2. **Frontend**:
   - Agregar botón "Árbol Genealógico" en el `page-header` de `AnimalDetail.js`.
   - Implementar lógica para mostrar el botón solo si el animal tiene padres **o** hijos.
   - Crear un modal Bootstrap con el árbol genealógico usando cards y conectores CSS.
   - Estilizar animales según su estado (`activo`, `estado_general`).
   - Hacer clickeables los cards para redirigir al detalle de cada animal.

3. **Integración**:
   - Conectar el botón del frontend con el nuevo endpoint.
   - Validar la respuesta del endpoint y renderizar el árbol en el modal.

## Affected Areas

| Area                                      | Impact     | Description                                                                                     |
|-------------------------------------------|------------|-------------------------------------------------------------------------------------------------|
| `api/controllers/AnimalController.php`    | Modified   | Nuevo método `arbolGenealogico()` para recuperar datos genealógicos.                          |
| `api/routes/web.php`                      | Modified   | Nueva ruta `GET /api/animales/{id}/arbol-genealogico`.                                          |
| `public/js/pages/animales/AnimalDetail.js`| Modified   | Agregar botón y modal para el árbol genealógico. Lógica de visibilidad del botón.              |

## Risks

| Risk                                      | Likelihood | Mitigation                                                                                     |
|-------------------------------------------|------------|-------------------------------------------------------------------------------------------------|
| Rendimiento del endpoint con árboles grandes | Medium     | Optimizar consultas SQL con índices en `madre_id` y `padre_id`. Limitar profundidad a 3 niveles. |
| Complejidad visual del árbol              | Medium     | Usar CSS simple para conectores. Validar diseño con usuarios antes de implementar.              |
| Inconsistencia en datos genealógicos      | Low        | Validar datos en la base de datos antes de implementar.                                         |
| Conflictos con otros módulos              | Low        | Asegurar que el endpoint y el modal no interfieran con funcionalidades existentes.              |

## Rollback Plan

1. **Backend**:
   - Eliminar la ruta `GET /api/animales/{id}/arbol-genealogico` de `api/routes/web.php`.
   - Eliminar el método `arbolGenealogico()` de `AnimalController.php`.

2. **Frontend**:
   - Eliminar el botón "Árbol Genealógico" y el modal de `AnimalDetail.js`.
   - Revertir cualquier cambio en el CSS relacionado con el árbol.

3. **Validación**:
   - Verificar que no queden referencias al endpoint o al modal en el código.
   - Asegurar que el detalle del animal funcione sin errores.

## Dependencies
- **Base de datos**: Los campos `madre_id`, `padre_id`, `activo` y `estado_general` deben estar correctamente poblados en la tabla `animales`.
- **Frontend**: Bootstrap 5.3 y FontAwesome deben estar disponibles para estilizar el modal y los conectores.

## Success Criteria
- [ ] El botón "Árbol Genealógico" aparece en el detalle del animal **solo** si el animal tiene padres **o** hijos.
- [ ] El modal muestra correctamente el árbol genealógico con 3 niveles (abuelos → padres → animal actual → hijos).
- [ ] Los animales muertos aparecen en gris y los vendidos en rojo.
- [ ] Los cards del árbol son clickeables y redirigen al detalle del animal correspondiente.
- [ ] El endpoint `GET /api/animales/{id}/arbol-genealogico` devuelve datos consistentes y sin errores.
- [ ] No hay regresiones en funcionalidades existentes del detalle del animal.