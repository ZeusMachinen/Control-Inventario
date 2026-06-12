# Archive Report: Árbol Genealógico

**Status**: ✅ COMPLETED

## Summary
Implementación del Árbol Genealógico en el detalle de animales. El cambio permite visualizar en un modal las relaciones genealógicas (padres, abuelos, hijos, hermanos) de cualquier animal, con estilos diferenciados para animales muertos (gris) y vendidos (rojo).

## Artifacts
- `openspec/changes/arbol-genealogico/proposal.md`
- `openspec/changes/arbol-genealogico/spec.md`
- `openspec/changes/arbol-genealogico/design.md`
- `openspec/changes/arbol-genealogico/tasks.md`
- `openspec/changes/arbol-genealogico/verify-report.md`

## Files Modified
- `api/controllers/AnimalController.php` — método `arbolGenealogico()`
- `api/routes/web.php` — ruta `GET /api/animales/{id}/arbol-genealogico`
- `public/js/pages/animales/AnimalDetail.js` — botón condicional + modal + CSS

## Next Steps
- A futuro: permitir edición de relaciones desde el árbol
- A futuro: expandir a nietos (profundidad > 3 niveles)
- A futuro: corregir `storeParto` para setear `padre_id` en las crías
