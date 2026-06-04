# Design: Renovación del Sistema de Reproducción — Flujo Completo

## Technical Approach

Reemplazar la tabla monolítica `ciclos_celo` por 4 tablas independientes (`diagnosticos_celo`, `servicios`, `diagnosticos_gestacion`, `partos`) conectadas por FK a `animales` y secuencialmente entre sí. Un nuevo `ReproduccionController` maneja todos los endpoints siguiendo el patrón estático del proyecto (mismos helpers, mismos `Response::json()`). La máquina de estados para `animales.estado_reproductivo` se implementa en cada endpoint del controlador. Migración one-shot desde `ciclos_celo` antes del deploy.

## Architecture Decisions

### D1: DB Triggers vs Application-Level State

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| DB triggers | Siempre consistente, transparente para el código | ❌ Lógica oculta, difícil debuggear, rompe separación de responsabilidades |
| Application-level | Explícito, testeable, centralizado en el controller | ✅ Mismo patrón existente — CeloController ya actualiza `estado_reproductivo` manualmente |

**Decisión**: Application-level. Cada endpoint `store{Evento}()` actualiza `animales.estado_reproductivo` explícitamente con una query al final del método.

### D2: Single Controller vs Multiple Controllers

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| 1 `ReproduccionController` | Un archivo, cohesión del dominio, menos imports | ✅ Sigue el patrón del proyecto (un controller por dominio) |
| 4 controllers separados | SRP estricto, más archivos, más rutas | ❌ Overkill para el tamaño actual del proyecto |

**Decisión**: `ReproduccionController` con métodos agrupados por evento: `storeCelo()`, `storeServicio()`, `storeDiagnosticoGestacion()`, `storeParto()`, etc.

### D3: Representación de Crías Múltiples

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| JSON column `crias` en `partos` | Simple, sin tabla pivote, el proyecto ya usa JSON | ✅ Suficiente — rara vez se consultan crías individualmente |
| Tabla pivote `parto_crias` | Normalizado, consultable por cría | ❌ Overkill, más queries joins para poco beneficio actual |

**Decisión**: Columna `crias` (JSON) en `partos` con estructura `[{cantidad, sexo, peso_promedio, observaciones}]`.

### D4: Eliminación Física vs Lógica

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| DELETE físico | Simple, mismo patrón existente | ✅ Consistente con el resto del proyecto |
| Soft-delete (activo/deleted_at) | Trazabilidad de eliminaciones | ❌ Out of scope, se puede agregar después |

**Decisión**: DELETE físico. Los eventos reproductivos son datos operativos, no financieros.

## Data Flow

```
Usuario → [Frontend SPA] → POST /api/reproduccion/{evento}
                                │
                     ReproduccionController::store{Evento}()
                                │
     ┌───────────────────────────┤
     │ 1. Validar: animal existe, Hembra, activo, edad≥15, estado_general=Activo
     │ 2. Validar reglas del evento (ej: servicio requiere diagnóstico_celo_id)
     │ 3. INSERT en tabla del evento
     │ 4. Actualizar animales.estado_reproductivo según máquina de estados
     │ 5. Si es parto → INSERT cría(s) en animales + asignar madre_id
     └─ Response::json(nuevo_registro)

Máquina de estados (explícita en cada endpoint):

  Vacia ──[diagnóstico_celo + servicio]──→ Prenada
  Prenada ──[diagnóstico_gestación negativo]──→ Vacia
  Prenada ──[parto]──→ Lactando
  Lactando ──[destete manual]──→ Vacia (out of scope — fase futura)

  Diagnóstico de celo sin servicio → sin cambio de estado
```

### Relaciones entre tablas

```
diagnosticos_celo (1) ──→ servicios (1) ──→ diagnosticos_gestacion (1) ──→ partos (1..n)
       │                      │                       │                        │
       └── FK animal_id ──────┴── FK animal_id ───────┴── FK animal_id ───────┴── FK animal_id
                                                                                    └── cria(s) → INSERT en animales
```

Cada paso es opcional (puede haber celo sin servicio, servicio sin diagnóstico, etc). La FK entre eventos es nullable para permitir flujo incompleto.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `database/schema.sql` | Modify | Reemplazar `ciclos_celo` (líneas 159-175) por 4 tablas nuevas |
| `database/migracion_reproduccion.sql` | Create | Migración one-shot de `ciclos_celo` a nuevo schema |
| `api/controllers/CeloController.php` | Delete | Reemplazado por `ReproduccionController` |
| `api/controllers/ReproduccionController.php` | Create | CRUD 4 eventos + máquina de estados (~350 líneas) |
| `api/routes/web.php` | Modify | Reemplazar 7 rutas `/api/celos/*` por 12+ rutas `/api/reproduccion/*` |
| `api/controllers/AnimalController.php` | Modify | `celos()` → `reproduccion()` usando nuevas tablas con JOINs |
| `api/controllers/EstadisticaController.php` | Modify | Queries de `reproduccion()` apuntan a tablas nuevas |
| `public/js/pages/reproduccion/CeloList.js` | Rewrite | Timeline visual con los 4 eventos encadenados |
| `public/js/pages/reproduccion/CeloForm.js` | Delete | Dividido en 4 formularios específicos |
| `public/js/pages/reproduccion/DiagnosticoCeloForm.js` | Create | Formulario detección de celo |
| `public/js/pages/reproduccion/ServicioForm.js` | Create | Formulario servicio (monta/IA/TE, reproductor) |
| `public/js/pages/reproduccion/DiagnosticoGestacionForm.js` | Create | Formulario diagnóstico preñez |
| `public/js/pages/reproduccion/PartoForm.js` | Create | Formulario parto + registro de cría(s) |
| `public/js/app.js` | Modify | Nuevas rutas `#/reproduccion`, `#/reproduccion/*/nuevo` |
| `public/index.html` | Modify | Cargar 4 nuevos JS de formularios, remover CeloForm.js |
| `public/js/components/Sidebar.js` | Modify | `#/celos` → `#/reproduccion` |
| `public/js/pages/animales/AnimalDetail.js` | Modify | Historial con datos de las 4 tablas |
| `public/js/pages/estadisticas/DashboardStats.js` | Modify | KPIs desde nuevas tablas |

## Interfaces / Contracts

### API Endpoints (ReproduccionController)

```
GET    /api/reproduccion/celos                    → indexCelo()
POST   /api/reproduccion/celos                    → storeCelo()
GET    /api/reproduccion/celos/{id}               → showCelo()
PUT    /api/reproduccion/celos/{id}               → updateCelo()
DELETE /api/reproduccion/celos/{id}               → destroyCelo()
POST   /api/reproduccion/celos/{id}/servicio      → storeServicio()  [vinculado a diagnóstico de celo]
GET    /api/reproduccion/servicios                → indexServicio()
GET    /api/reproduccion/servicios/{id}           → showServicio()
POST   /api/reproduccion/servicios/{id}/diagnostico → storeDiagnosticoGestacion()
GET    /api/reproduccion/diagnosticos-gestacion   → indexDiagnosticoGestacion()
GET    /api/reproduccion/diagnosticos-gestacion/{id} → showDiagnosticoGestacion()
POST   /api/reproduccion/diagnosticos-gestacion/{id}/parto → storeParto()
GET    /api/reproduccion/partos                   → indexParto()
GET    /api/reproduccion/partos/{id}              → showParto()
GET    /api/reproduccion/timeline/{animal_id}     → timeline()       [4 eventos agregados]
```

### Máquina de Estados (contrato interno)

```php
// Cada método store{Evento} ejecuta al final:
Database::execute(
    'UPDATE animales SET estado_reproductivo = :estado WHERE id = :id',
    [':estado' => $nuevoEstado, ':id' => $animalId]
);
```

Transiciones válidas:

| Evento | Condición | Estado anterior | Nuevo estado |
|--------|-----------|-----------------|--------------|
| Celo + Servicio | servicio vinculado | Vacia | Prenada |
| Diagnóstico gestación | resultado=negativo | Prenada | Vacia |
| Parto | cría(s) registrada(s) | Prenada | Lactando |
| Destete (futuro) | N/A | Lactando | Vacia |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Máquina de estados (transiciones válidas e inválidas) | Tests de método con datos mock |
| Integration | Cada endpoint CREATE con animal válido/inválido | POST contra DB de test, verificar estado y respuesta |
| Integration | Migración de `ciclos_celo` a nuevo schema | Script SQL probado con datos representativos |
| E2E | Flujo completo: celo → servicio → diagnóstico → parto + cría | Front-to-back con datos reales, verificar cría creada |

Nota: el proyecto no tiene infraestructura de tests actualmente. Los tests listados son deseables pero dependen de setup previo (PHPUnit config, DB test). Priorizar pruebas manuales del flujo completo.

## Migration / Rollout

### Fase 1 — Base de datos
1. Ejecutar `database/migracion_reproduccion.sql` que:
   - Crea las 4 tablas nuevas
   - Migra cada registro de `ciclos_celo` a `diagnosticos_celo`
   - Los registros con `servicio_realizado=1` crean un servicio vinculado con `tipo='Monta Natural'` (default — pérdida de granularidad documentada)
   - Los registros migrados con servicio también crean diagnóstico de gestación si el animal está `Prenada` en la data actual
2. **NO dropear** `ciclos_celo` aún

### Fase 2 — Backend
3. Desplegar `ReproduccionController` con nuevas rutas
4. Las rutas viejas `/api/celos/*` se mantienen 1 semana como respaldo
5. Actualizar `AnimalController::celos()` y `EstadisticaController::reproduccion()`

### Fase 3 — Frontend
6. Desplegar timeline y 4 formularios nuevos
7. Renombrar sidebar `#/celos` → `#/reproduccion`
8. Actualizar `app.js` con nuevas rutas

### Fase 4 — Limpieza
9. Verificar datos migrados correctamente
10. Eliminar `CeloController.php` y `CeloForm.js`
11. Dropear tabla `ciclos_celo` (opcional — mantener como respaldo 1 ciclo)

### Rollback
- Restaurar schema.sql a versión anterior
- Revertir rutas y controller
- Mantener `ciclos_celo` intacta durante toda la migración

## Open Questions

- [ ] ¿Destete manual o automático? (Lactando → Vacia queda out of scope — requiere otro cambio)
- [ ] ¿Resetear `estado_reproductivo` a su valor anterior si se edita/elimina un servicio o diagnóstico? Actualmente el UPDATE es unidireccional
- [ ] Validación de edad mínima: ¿solo en primer celo, o también en cada nuevo celo si el animal ya tuvo cría? (la regla actual aplica siempre los 15 meses — puede bloquear hembras que ya parieron)
