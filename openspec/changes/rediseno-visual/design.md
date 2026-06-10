# Design: Rediseño Visual con Bootstrap 5 + FontAwesome

## Technical Approach

Migración progresiva del frontend vanilla JS SPA a **Bootstrap 5.3** (grid, componentes, utilidades) + **FontAwesome 6 Free** (iconos), manteniendo la paleta verde actual mediante overrides en `theme.css`. Sin build tools — todo via CDN. Se empieza por la sección Animales como template y se replica al resto.

---

## Architecture Decisions

### Decision: Bootstrap 5.3 via CDN

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| CDN | Sin build tools, ~50KB extra, pero zero config | ✅ Elegido |
| npm + bundler | Requiere webpack/vite, el proyecto no tiene build step | ❌ Descartado |
| Local files | Más control, pero mantener actualizaciones manualmente | ❌ Descartado |

### Decision: FontAwesome 6 Free — solo CSS (font-only)

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| font-only CSS | Sin CLS, más rápido, sin JS extra | ✅ Elegido |
| svg+js JS bundle | Más features (animación, stacking), pero causa layout shift | ❌ Descartado |

### Decision: Override vía CSS variables (no Sass)

El proyecto no tiene build step. Bootstrap 5 expone CSS variables globales (`--bs-primary`, `--bs-border-radius`, etc.). Creamos `theme.css` que las redefine **después** de cargar Bootstrap.

### Decision: Bootstrap JS via `data-bs-*` attributes

Bootstrap 5 JS se inicializa automáticamente con atributos `data-bs-*` en el HTML. No necesitamos JavaScript imperativo — el router SPA renderiza templates con esos atributos y Bootstrap los reconoce al hacer `document.querySelector` desde `afterRender()`.

### Decision: Migración progresiva por sección

No hacemos big bang. Animales primero → validamos → replicamos al resto. Cada sección se refactoriza COMPLETA (template + afterRender) en un mismo commit para evitar estados inconsistentes.

---

## Color Mapping: Variables actuales → Bootstrap overrides

| Variable actual | Valor | Bootstrap var | Clase |
|---|---|---|---|
| `--verde-principal` | `#2E7D32` | `--bs-primary` | `.btn-primary`, `.text-primary` |
| `--verde-hover` | `#388E3C` | hover state (btn-primary:hover) | |
| `--verde-claro` | `#A5D6A7` | `--bs-success-border-subtle` | |
| `--verde-bg` | `#E8F5E9` | `--bs-primary-bg-subtle` | |
| `--rojo` | `#D32F2F` | `--bs-danger` | `.btn-danger`, `.text-danger` |
| `--rojo-claro` | `#FFEBEE` | `--bs-danger-bg-subtle` | |
| `--naranja` | `#F57C00` | `--bs-warning` | `.btn-warning` |
| `--naranja-claro` | `#FFF3E0` | `--bs-warning-bg-subtle` | |
| `--azul` | `#1976D2` | `--bs-info` | `.btn-info` |
| `--azul-claro` | `#E3F2FD` | `--bs-info-bg-subtle` | |
| `--texto-principal` | `#1B1B1B` | `--bs-body-color` | |
| `--texto-secundario` | `#616161` | `--bs-secondary-color` | |
| `--gris-borde` | `#E0E0E0` | `--bs-border-color` | |
| `--gris-fondo` | `#F5F5F5` | `--bs-body-bg` | |
| `--border-radius` | `8px` | `--bs-border-radius` | |
| `--font-family` | `'Segoe UI', ...` | `--bs-body-font-family` | |
| `--shadow-sm` | `0 1px 3px...` | `--bs-box-shadow-sm` | |
| `--shadow-lg` | `0 10px 25px...` | `--bs-box-shadow-lg` | |

---

## Component Patterns Estandarizados

### Botones CRUD

| Acción | Clases Bootstrap | Icono FontAwesome |
|--------|-----------------|-------------------|
| Crear/Nuevo | `.btn.btn-primary` | `fa-plus` |
| Editar | `.btn.btn-outline-primary.btn-sm` | `fa-pen` |
| Eliminar | `.btn.btn-outline-danger.btn-sm` | `fa-trash` |
| Ver/Detalle | `.btn.btn-outline-secondary.btn-sm` | `fa-eye` |
| Mover | `.btn.btn-outline-info.btn-sm` | `fa-arrows-alt` |
| Volver | `.btn.btn-outline-secondary` | `fa-arrow-left` |
| Guardar | `.btn.btn-primary` | `fa-save` |
| Cancelar | `.btn.btn-secondary` | `fa-times` |

### Tablas (AnimalList y similares)

```html
<div class="table-responsive">
  <table class="table table-hover align-middle mb-0">
    <thead class="table-light">
      <tr>
        <th class="sortable" onclick="...">Nombre</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody id="tabla-body">
      <!-- rows -->
    </tbody>
  </table>
</div>
```

### Formularios (AnimalForm y similares)

```html
<form id="animal-form" onsubmit="return Page.guardar(event)">
  <div class="row g-3">
    <div class="col-md-6">
      <label class="form-label">Nombre *</label>
      <input type="text" class="form-control" id="animal-nombre" required>
    </div>
  </div>
  <div class="mt-4 d-flex gap-2 justify-content-end">
    <button type="button" class="btn btn-outline-secondary" onclick="history.back()">
      <i class="fas fa-times"></i> Cancelar
    </button>
    <button type="submit" class="btn btn-primary">
      <i class="fas fa-save"></i> Guardar
    </button>
  </div>
</form>
```

### Modales

```html
<div class="modal fade" id="miModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Título</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">...</div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary">Aceptar</button>
      </div>
    </div>
  </div>
</div>
```

### Layout (MainLayout)

```html
<div class="app-shell d-flex">
  <!-- Sidebar: col-auto con width fijo -->
  <aside class="sidebar bg-white border-end vh-100 position-fixed" id="sidebar">
    ...con Bootstrap nav flex-column
  </aside>
  <!-- Main: flex-grow-1 con margin-left del sidebar -->
  <div class="main-content flex-grow-1" style="margin-left: 260px">
    <nav class="navbar navbar-light bg-white border-bottom px-3">
      ...navbar Bootstrap
    </nav>
    <main class="p-4">
      ${contenidoHtml}
    </main>
  </div>
</div>
```

---

## File Changes

| File | Acción | Descripción |
|------|--------|-------------|
| `public/index.html` | Modify | Agregar Bootstrap 5 CSS+JS CDN, FontAwesome CDN |
| `public/css/theme.css` | **Create** | Override de variables Bootstrap para paleta verde |
| `public/css/variables.css` | Keep (ref) | Mantener como referencia, `theme.css` la reemplaza |
| `public/css/components.css` | Modify | Limpiar: mantener solo utilidades propias no cubiertas por Bootstrap |
| `public/css/layout.css` | Modify | Simplificar, Bootstrap grid + flex reemplaza layout custom |
| `public/css/responsive.css` | Modify | Bootstrap responsive lo cubre, limpiar duplicación |
| `public/js/layouts/MainLayout.js` | Modify | Migrar a layout Bootstrap |
| `public/js/components/Sidebar.js` | Modify | Sidebar con nav Bootstrap + FontAwesome |
| `public/js/components/Navbar.js` | Modify | Navbar Bootstrap + FontAwesome |
| `public/js/pages/animales/AnimalList.js` | Modify | **Template**: tabla Bootstrap, botones FontAwesome, sin emojis |
| `public/js/pages/animales/AnimalForm.js` | Modify | Formulario Bootstrap grid, sin emojis |
| `public/js/pages/animales/AnimalDetail.js` | Modify | Cards Bootstrap, timeline, sin emojis |
| Resto de páginas JS (~15 archivos) | Modify | Replicar patrón de Animales |

---

## Migration Plan

### Fase 1: Fundación (1 commit)
1. `public/index.html` — agregar Bootstrap 5 CSS + JS bundle + FontAwesome CSS
2. Crear `public/css/theme.css` con overrides de paleta
3. Ajustar `layout.css` y `components.css` — limpiar lo que Bootstrap ya cubre

### Fase 2: Layout + Sidebar + Navbar (1 commit)
4. `MainLayout.js` — migrar a grid Bootstrap
5. `Sidebar.js` — emojis → FontAwesome, nav Bootstrap
6. `Navbar.js` — emojis → FontAwesome, navbar Bootstrap

### Fase 3: Template Animales (1 commit)
7. `AnimalList.js` — tabla Bootstrap + botones estandarizados + FontAwesome
8. `AnimalForm.js` — formulario Bootstrap grid
9. `AnimalDetail.js` — cards Bootstrap + timeline

### Fase 4: Replicar (N commits, uno por sección)
10-17. Rebaños, Vacunación, Reproducción, Ventas, Compras, Gastos, etc.

---

## Open Questions

- [ ] **Alert() nativo**: Reemplazar por toasts Bootstrap o mantener `alert()` para errores críticos? → Decisión: los toasts Bootstrap reemplazan `alert()` para feedback de acciones, mantener `alert()` solo para confirmaciones destructivas.
- [ ] **Inicialización Bootstrap JS**: Los componentes modales y toasts Bootstrap necesitan `new bootstrap.Modal()` o `data-bs-toggle`. Como el HTML se inyecta dinámicamente, hay que llamar al constructor en `afterRender()` para modales dinámicos.
