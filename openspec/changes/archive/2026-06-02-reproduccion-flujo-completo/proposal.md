# Proposal: Renovación del Sistema de Reproducción

## Intent
Reemplazar la tabla monolítica `ciclos_celo` por un flujo completo de 4 eventos (Celo → Servicio → Diagnóstico de Preñez → Parto) con tablas separadas, trazabilidad real, y auto-creación de crías.

## Scope

### In Scope
- 4 nuevas tablas: diagnosticos_celo, servicios, diagnosticos_gestacion, partos
- Nuevo ReproduccionController con endpoints por cada evento
- Frontend con 4 formularios + timeline visual
- Auto-creación de cría al registrar parto (INSERT en animales)
- Máquina de estados: estado_reproductivo del animal se sincroniza automáticamente
- Migración de datos existentes de ciclos_celo a nuevo schema
- Sidebar: renombrar #/celos a #/reproduccion

### Out of Scope
- Reportes avanzados de reproducción (tasa de concepción, % preñez)
- Notificaciones de celo/próximos servicios
- Módulo de genética/evaluación de reproductores
- Integración con veterinarios externos

## Capabilities

### New Capabilities
- `diagnostico-celo`: registro de detección de celo con síntomas, fechas, comportamiento
- `servicio`: registro de monta natural, IA o TE, vinculado a reproductor
- `diagnostico-gestacion`: diagnóstico de preñez por palpación o ecografía
- `parto`: registro de parto con auto-creación de cría(s)

### Modified Capabilities
None - this replaces the existing ciclos_celo functionality entirely.

## Approach
Refactor completo con 4 tablas separadas, nuevo ReproduccionController, y frontend modular. Migrar datos existentes de ciclos_celo. Máquina de estados explícita en backend para estado_reproductivo.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| database/schema.sql | Modified | Reemplazar tabla ciclos_celo por 4 nuevas |
| api/controllers/CeloController.php | Removed | Reemplazado por ReproduccionController |
| api/controllers/ReproduccionController.php | New | Controlador con endpoints por evento |
| api/routes/web.php | Modified | Nuevas rutas de reproducción |
| public/js/pages/reproduccion/ | Modified | 4 formularios + timeline |
| public/js/app.js | Modified | Nuevas rutas SPA |
| public/js/components/Sidebar.js | Modified | Link #/reproduccion |
| public/js/pages/animales/AnimalDetail.js | Modified | Historial actualizado |
| public/js/pages/estadisticas/DashboardStats.js | Modified | KPIs actualizados |
| api/helpers/CalculadorEdad.php | Extended | CalcularEdad para nuevo flujo |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migración datos existentes sin tipo servicio ni reproductor | High | Valores por defecto + documentar pérdida granularidad |
| Complejidad frontend (1 form → 4) | Medium | Timeline claro, UI progresiva, pruebas manuales |
| Estado reproductivo inconsistente | Medium | Máquina de estados explícita, validación en cada endpoint |
| Animales vendidos/muertos reciben eventos | Low | Validar estado_general en todos los endpoints nuevos |

## Rollback Plan
1. Backup DB antes de migrar
2. No dropear ciclos_celo hasta verificar datos migrados
3. Mantener rutas viejas de /api/celos hasta nuevo sistema estable

## Dependencies
- Migraciones SQL ejecutadas (ya están)
- Ninguna externa

## Success Criteria
- [ ] 4 tablas nuevas creadas con FKs e índices
- [ ] CRUD funcional para cada evento desde frontend
- [ ] Auto-creación de cría al registrar parto
- [ ] estado_reproductivo se actualiza correctamente en cada evento
- [ ] Sidebar muestra #/reproduccion
- [ ] Datos de ciclos_celo migrados sin pérdida