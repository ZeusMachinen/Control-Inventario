## Exploration: Sistema de Reproducción — Flujo Completo

### Current State

El sistema actual de reproducción es extremadamente minimalista: una sola tabla `ciclos_celo` maneja todo el ciclo reproductivo como un evento único.

**Base de datos — `ciclos_celo`**:
```
id, animal_id, fecha_inicio, fecha_fin, servicio_realizado (TINYINT 0/1),
fecha_posible_servicio, observaciones, usuario_id, created_at, updated_at
```
- FK a `animales(id)` con ON DELETE CASCADE
- FK a `usuarios(id)` con ON DELETE CASCADE
- Índices en `animal_id` y `fecha_inicio`
- No hay tabla de servicios, diagnósticos de gestación, ni partos
- El `servicio_realizado` es binario (0/1): no guarda tipo de servicio ni reproductor

**Backend — `CeloController.php`** (205 líneas, CRUD + activos + próximos):
- `index()`: SELECT con JOIN a animales, filtrado por usuario_id
- `store()`: valida que el animal sea Hembra, edad ≥ 15 meses (vía `CalculadorEdad`), inserta. Si `servicio_realizado=1`, actualiza `animales.estado_reproductivo = 'Prenada'`
- `update()`: actualiza campos dinámicos, si marca servicio → Prenada
- `destroy()`: DELETE físico del registro
- `activos()`: WHERE fecha_fin IS NULL AND servicio_realizado = 0
- `proximos()`: WHERE fecha_posible_servicio >= CURDATE()
- NO existe manejo de parto, diagnóstico de preñez, ni cría automática

**Frontend — `CeloForm.js` + `CeloList.js`**:
- Formulario simple: seleccionar hembra (edad_min=15), fecha, checkbox servicio, observaciones
- Listado con tabla: animal, inicio, fin, servicio (badge ✅/⏳), próximo servicio, acciones (marcar servicio, eliminar)
- Sin concepto de diagnóstico de preñez, parto, ni registro de cría

**Reglas de negocio existentes**:
- Edad mínima 15 meses para primer celo (en backend + frontend vía query param)
- Solo Hembras pueden tener celo
- `servicio_realizado = 1` → animal pasa a `estado_reproductivo = 'Prenada'`
- Etapas: Ternero (≤12 meses), Novillo (13-24), Adulto (24+)
- Constantes globales: `CELO_CICLO_DIAS = 21`, `GESTACION_DIAS = 283`
- Los terneros (≤12 meses) NO participan del ciclo reproductivo
- scope por `usuario_id` en todas las tablas

**Patrón de código del proyecto**:
- Controllers estáticos sin DI (ej: `class CeloController`)
- `require_once` de helpers vía autoloader `spl_autoload_register`
- `usuarioId()` privado que llama `AuthMiddleware::ejecutar()->sub`
- `Database::query()`, `queryOne()`, `execute()`, `lastInsertId()` para PDO
- `Response::json()` / `Response::error()` / `Response::paginar()`
- `Validator` con reglas: `requerido|numerico|fecha|enum|max|min`
- `json_decode(file_get_contents('php://input'), true)` para request body
- Frontend: objetos JS con `render()`/`afterRender()`, registrados en `app.js`
- Router SPA basado en hash

**Archivos adicionales que tocan reproducción**:
- `AnimalDetail.js` — historial de celos del animal vía `GET /api/animales/{id}/celos`
- `DashboardStats.js` — KPIs vía `GET /api/estadisticas/reproduccion`
- `Sidebar.js` — link `#/celos` en sección Sanidad
- `index.html` — carga `CeloList.js` y `CeloForm.js`

### Affected Areas

- **`database/schema.sql`** — Tabla `ciclos_celo` (líneas 159-175) será reemplazada por 4 nuevas tablas: `diagnosticos_celo`, `servicios`, `diagnosticos_gestacion`, `partos`
- **`api/config/app.php`** — Constantes `CELO_CICLO_DIAS` y `GESTACION_DIAS` se usan desde `CalculadorEdad`
- **`api/helpers/CalculadorEdad.php`** — `proximoCelo()` y `fechaParto()` se usan; se podrían extender con nuevos cálculos
- **`api/controllers/CeloController.php`** — Será reemplazado/refactorizado a `ReproduccionController` o dividido en múltiples controladores
- **`api/routes/web.php`** — Las 7 rutas de `/api/celos/*` serán reemplazadas por nuevas rutas del flujo completo
- **`public/js/pages/reproduccion/CeloForm.js`** — Reemplazado por nuevos formularios (Diagnóstico de Celo, Servicio, Diagnóstico Gestación, Parto)
- **`public/js/pages/reproduccion/CeloList.js`** — Reemplazado por una vista de timeline/flujo completo
- **`public/js/app.js`** — Registro de rutas (`/celos`, `/celos/nuevo`) y afterRender hooks
- **`public/index.html`** — Scripts a cargar (`CeloList.js`, `CeloForm.js`)
- **`public/js/components/Sidebar.js`** — El link `#/celos` podría renombrarse a `#/reproduccion`
- **`public/js/pages/animales/AnimalDetail.js`** — Sección de historial de celos (líneas 120-131) actualizada para nuevo schema
- **`public/js/pages/estadisticas/DashboardStats.js`** — KPIs de reproducción a actualizar
- **`api/controllers/EstadisticaController.php`** — Método `reproduccion()` (líneas 140-170) a actualizar con nuevas tablas
- **`api/controllers/AnimalController.php`** — Método `celos()` (líneas 348-359) a actualizar; lógica de creación de cría al registrar parto
- **`api/helpers/Validator.php`** — Podría necesitar nuevas reglas (ej: `entero_positivo`)
- **`database/seeds.sql`** — Datos demo de `ciclos_celo` a migrar

### Approaches

1. **Refactor completo con tablas separadas y nuevo controlador**
   - Crear 4 tablas nuevas: `diagnosticos_celo`, `servicios`, `diagnosticos_gestacion`, `partos`
   - Nuevo `ReproduccionController` con endpoints por cada entidad
   - Migrar datos de `ciclos_celo` → `diagnosticos_celo`
   - Frontend con timeline visual del flujo completo
   - Pros: Separación clara de responsabilidades, cada evento es su propia entidad, consultas simples, escalable a futuro, modelo fiel al dominio
   - Cons: Mayor cantidad de archivos nuevos, migración de datos existentes, más curvas de aprendizaje
   - Effort: High

2. **Evolución incremental sobre `ciclos_celo` + nuevas tablas auxiliares**
   - Agregar columnas a `ciclos_celo`: `tipo_servicio`, `reproductor_id`, `fecha_diagnostico`, `resultado_diagnostico`, `fecha_parto`, `cria_id`
   - Crear solo las tablas estrictamente necesarias (ej: `partos` para la cría)
   - Extender `CeloController` con nuevos métodos
   - Pros: Menos archivos nuevos, backwards compatibility casi total, cambios más graduales
   - Cons: Tabla monolítica con columnas condicionales, consultas más complejas (muchos NULLs), mezcla de conceptos, difícil de mantener a largo plazo, viola 1ra forma normal
   - Effort: Medium

### Recommendation

**Enfoque 1: Refactor completo con tablas separadas.**

El sistema actual es demasiado simple (una tabla, un TINYINT, cero trazabilidad). El usuario pide explícitamente un flujo de 4 eventos bien diferenciados con su propia data. Forzar eso en una sola tabla termina en una columna de NULLs y consultas con `CASE WHEN` que son difíciles de mantener. Cada evento tiene su propio conjunto de datos:

| Evento | Datos propios |
|--------|--------------|
| Celo | síntomas, comportamiento, fecha_inicio, fecha_fin |
| Servicio | tipo (monta/IA/TE), reproductor_id (toro/semen), observaciones |
| Diagnóstico | método (palpación/ecografía), resultado (positivo/negativo), fecha |
| Parto | fecha, crías (cantidad, sexo, peso), complicaciones |

Además, el frontend gana claridad: cada paso del flujo es una pantalla/paso distinto, y el timeline visual es directo desde 4 tablas.

**Estrategia recomendada específica:**
1. Renombrar ruta de sidebar de `#/celos` a `#/reproduccion` (más semántico)
2. Crear las 4 tablas nuevas con FKs a `animales` y `usuarios`
3. Tabla `servicios` con FK a `diagnosticos_celo` y `animales` (reproductor), columna `tipo` ENUM('Monta Natural','Inseminación Artificial','Transferencia de Embriones')
4. Tabla `partos` con columna `cria_ids` o tabla pivote para múltiples crías
5. Migrar registros existentes de `ciclos_celo` a `diagnosticos_celo` (los que tenían servicio → crear servicio vinculado)
6. Mantener `CalculadorEdad::proximoCelo()` y `fechaParto()` como helpers
7. Estado `estado_reproductivo` del animal se actualiza automáticamente con cada evento

### Risks

- **Migración de datos existentes**: Los registros actuales en `ciclos_celo` con `servicio_realizado=1` no tienen tipo de servicio ni reproductor. Habrá que migrarlos con valores por defecto y documentar la pérdida de granularidad.
- **Complejidad frontend**: Pasar de 1 formulario a ~4 formularios + timeline visual es un salto significativo. Asegurar que la UX no abrume al usuario.
- **Regla de edad mínima**: Verificar que la edad mínima de 15 meses se aplique consistentemente en todos los puntos de entrada del nuevo flujo (no solo en celo — también en servicio si es primera vez).
- **Estado del animal inconsistente**: Con múltiples tablas, hay que asegurar que el `estado_reproductivo` del animal se mantenga sincronizado (Vacia→Prenada→Lactando→Vacia). Una máquina de estados explícita en backend es recomendable.
- **Animales vendidos/muertos**: No deberían poder registrarse eventos reproductivos. Validar `estado_general` en cada endpoint.

### Ready for Proposal

**Sí** — el exploration está completo. La información es suficiente para pasar a propuesta.

El alcance es claro: reemplazar el modelo plano de `ciclos_celo` por un flujo de 4 eventos con tablas separadas, manteniendo las reglas de negocio existentes (edad mínima, terneros excluidos, scope por usuario) y migrando los datos actuales.

Recomendación al orquestador: pasar a `sdd-propose` con el nombre de cambio `reproduccion-flujo-completo`, indicando que se eligió el enfoque de refactor completo (Approach 1).
