# Archive Report: Pesos — Peso de Entrada/Salida y Precio por kg

## Status

**Change**: pesos-animal
**Status**: COMPLETED ✅
**Date**: 2026-05-20

## Summary

Se implementaron campos de peso y precio en el registro de animales y ventas del sistema Control-Inventario.

### Delivered

| Capability | Status | Notes |
|---|---|---|
| `animal:register:weight` | ✅ | peso_entrada (kg) en formulario de registro |
| `animal:register:price_per_kg` | ✅ | precio_kg ($/kg) en formulario de registro |
| `animal:view:weight` | ✅ | Visible en detalle y listado |
| `animal:view:price_per_kg` | ✅ | Visible en detalle y listado |
| `sale:register:exit_weight` | ✅ | peso_salida (kg) en formulario de venta |
| `sale:view:exit_weight` | ✅ | Columna en listado de ventas |

### Files Modified

| File | Change |
|------|--------|
| `database/schema.sql` | +peso_entrada DECIMAL(10,2), +precio_kg DECIMAL(12,2) en animales; +peso_salida DECIMAL(10,2) en ventas |
| `api/controllers/AnimalController.php` | Store/update aceptan peso_entrada y precio_kg |
| `api/controllers/VentaController.php` | Store acepta peso_salida |
| `public/js/pages/animales/AnimalForm.js` | Inputs para peso_entrada y precio_kg |
| `public/js/pages/animales/AnimalDetail.js` | Muestra peso_entrada y precio_kg |
| `public/js/pages/animales/AnimalList.js` | Columnas "Peso Entrada" y "Precio/kg" |
| `public/js/pages/ventas/VentaForm.js` | Input para peso_salida |
| `public/js/pages/ventas/VentaList.js` | Columna "Peso Salida" |

### Spec Sync Notes

Los specs generados durante la fase `sdd-spec` describen los campos como **required** con validaciones (máx 2000 kg, comparación peso entrada/salida, rechazar cero). La implementación real los trata como **opcionales/nullables** según la decisión de diseño. Esto es intencional (YAGNI para MVP). Los specs deberían actualizarse si se formalizan como documento de referencia.

### Artifacts

| Artifact | Location |
|----------|----------|
| Proposal | `openspec/changes/pesos-animal/proposal.md` / Engram `sdd/pesos-animal/proposal` |
| Spec | `openspec/changes/pesos-animal/specs/` / Engram `sdd/pesos-animal/spec` |
| Design | `openspec/changes/pesos-animal/design.md` / Engram `sdd/pesos-animal/design` |
| Tasks | `openspec/changes/pesos-animal/tasks.md` / Engram `sdd/pesos-animal/tasks` |
| Apply Progress | Engram `sdd/pesos-animal/apply-progress` |
| Verify Report | `openspec/changes/pesos-animal/verify-report.md` / Engram `sdd/pesos-animal/verify-report` |
| Archive Report | `openspec/changes/pesos-animal/archive-report.md` / Engram `sdd/pesos-animal/archive-report` |

## Next Steps

- Correr las migraciones ALTER TABLE en la base de datos real
- Probar manualmente desde el navegador
