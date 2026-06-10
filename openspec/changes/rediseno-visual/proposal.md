# Proposal: Rediseño Visual del Frontend

## Intent

El frontend actual del sistema **Control-Inventario** utiliza emojis como iconos, inline styles en JavaScript, y carece de animaciones o micro-interacciones. Esto genera:
- **Inconsistencia visual**: Dificulta la mantenibilidad y escalabilidad del código.
- **Experiencia de usuario obsoleta**: Falta de feedback visual (ej. estados de carga, transiciones).
- **Técnica deuda**: Mezcla de responsabilidades (estilos en JS) y falta de reutilización.

Este rediseño busca modernizar la interfaz sin alterar la lógica de negocio, mejorando la coherencia visual y la experiencia de usuario mediante **Bootstrap 5 + FontAwesome**, overrideando la paleta de colores existente.


## Scope

### In Scope
- Reemplazar **todos los emojis** por iconos de **FontAwesome** (CDN).
- Agregar **Bootstrap 5** (CSS + JS bundle) via CDN.
- Crear `public/css/theme.css` con overrides de Bootstrap para mantener la paleta verde actual.
- Reemplazar inline styles por clases utilitarias de Bootstrap.
- Refactorizar la sección **Animales** como template (AnimalList, AnimalForm, AnimalDetail).
- Replicar el patrón de refactorización al resto de secciones: Rebaños, Vacunación, Reproducción, Ventas, Compras, Gastos.
- Estandarizar botones de CRUD (editar, eliminar, ver, crear) usando clases Bootstrap + FontAwesome.
- Micro-interacciones: toasts Bootstrap, spinners, tooltips, transiciones.


### Out of Scope
- Cambiar la **paleta de colores** (se mantiene el verde `#2E7D32`).
- Migrar a frameworks como **React** o **Vue**.
- Modificar lógica de negocio o backend.
- Rediseñar reportes o gráficos (ej. Chart.js).


## Capabilities

> **No hay cambios en las capacidades funcionales del sistema**. Este cambio es puramente visual y de UI.

### New Capabilities
- None

### Modified Capabilities
- None


## Approach

1. **Fundación**
   - Agregar **Bootstrap 5 CSS + JS** y **FontAwesome CDN** en `public/index.html`.
   - Crear `public/css/theme.css` con overrides de variables Bootstrap (`$primary`, `$success`, etc.) para mantener la paleta verde original.
   - Limpiar/adoptar `public/css/components.css`: los componentes Bootstrap reemplazan la mayoría, solo mantener utilidades específicas del proyecto.
   - Ajustar `public/css/layout.css` para integrar grid Bootstrap.

2. **Template Animales**
   - Refactorizar `AnimalList.js`, `AnimalForm.js`, `AnimalDetail.js`:
     - Reemplazar emojis por iconos FontAwesome.
     - Migrar tablas → `.table.table-hover`, formularios → `.form-control`, botones → `.btn.btn-*`, modales → `.modal`
     - Eliminar inline styles usando clases Bootstrap (`.d-flex`, `.gap-*`, `.mt-*`, etc.).
     - Agregar transiciones y micro-interacciones.

3. **Replicar**
   - Aplicar el mismo patrón a: Rebaños, Vacunación, Reproducción, Ventas, Compras, Gastos.

4. **Micro-interacciones**
   - Toast Bootstrap para feedback de acciones CRUD.
   - Spinner Bootstrap en botones durante envíos.
   - Tooltips Bootstrap para iconos.
   - Transiciones de página con fade.


## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `public/index.html` | Modified | Agregar Bootstrap 5 + FontAwesome CDN. |
| `public/css/theme.css` | New | Override de variables Bootstrap para paleta verde. |
| `public/css/components.css` | Modified | Limpiar componentes que Bootstrap ya cubre. |
| `public/css/layout.css` | Modified | Integrar con grid Bootstrap. |
| `public/css/responsive.css` | Modified | Bootstrap cubre responsive, limpiar lo duplicado. |
| `public/js/pages/animales/AnimalList.js` | Modified | Emojis → FontAwesome, inline styles → Bootstrap. |
| `public/js/pages/animales/AnimalForm.js` | Modified | Idem. |
| `public/js/pages/animales/AnimalDetail.js` | Modified | Idem. |
| `public/js/components/Sidebar.js` | Modified | Emojis → FontAwesome, layout Bootstrap. |
| `public/js/components/Navbar.js` | Modified | Emojis → FontAwesome. |
| `public/js/layouts/MainLayout.js` | Modified | Layout base con Bootstrap. |
| Secciones restantes (15+ archivos JS) | Modified | Replicar patrón. |


## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Conflicto Bootstrap vs estilos actuales** | Medium | Crear `theme.css` con overrides ANTES de refactorizar secciones. Probar en Animales primero. |
| **Bundle tamaño** (~50KB extra) | Low | Bootstrap 5 es liviano; aceptable para una app de gestión. |
| **JS Bootstrap interfiera con router SPA** | Low | Bootstrap JS se inicializa con `data-bs-*` atributos, no interfiere con hash routing. |
| **Inconsistencia durante migración progresiva** | Medium | Refactorizar por sección completa (no mezclar old/new en misma página). |


## Rollback Plan

1. **Revertir commits** en el branch `Redesign`.
2. Si el revert falla: copiar archivos afectados desde `main`.
3. Remover Bootstrap CDN y FontAwesome CDN de `index.html`.
4. Eliminar `public/css/theme.css`.
5. Verificar funcionalidad en cada sección.


## Dependencies
- **Bootstrap 5 CDN** (CSS + JS bundle)
- **FontAwesome 6 Free CDN** (font-only, no SVG JS para evitar CLS)
- **Navegadores modernos** (Bootstrap 5 es compatible con Chrome, Firefox, Edge, Safari)


## Success Criteria
- [ ] Todos los emojis reemplazados por iconos FontAwesome.
- [ ] Inline styles eliminados en un 90% de los archivos JS.
- [ ] Botones CRUD estandarizados con Bootstrap + FontAwesome en todas las secciones.
- [ ] `theme.css` creado y la paleta verde original se mantiene.
- [ ] Toasts Bootstrap funcionando para feedback de acciones.
- [ ] Responsive visualmente consistente en mobile y desktop.
- [ ] Secciones Animales, Rebaños, Vacunación, Reproducción, Ventas, Compras, Gastos refactorizadas.