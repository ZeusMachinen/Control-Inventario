# Tasks: Rediseño Visual

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2000+ |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (Foundation + Layout) → PR2 (Animales) → PR3 (Replicar + Micro) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + Layout/Sidebar/Navbar | PR 1 | CDNs, theme.css, layout migration. ~400-500 lines |
| 2 | Template Animales | PR 2 | AnimalList/Form/Detail → Bootstrap + FA. ~400-500 lines |
| 3 | Replicar + Micro-interacciones | PR 3 | Resto de secciones + toasts/spinners. ~600-800 lines |

---

## Phase 1: Foundation

- [x] 1.1 Agregar Bootstrap 5.3 CSS + JS bundle y FontAwesome 6 CSS CDN a `public/index.html`
- [x] 1.2 Crear `public/css/theme.css` con overrides de variables Bootstrap para paleta verde (#2E7D32)
- [x] 1.3 Limpiar `public/css/components.css`: remover lo que Bootstrap ya cubre (botones, modales, cards)
- [x] 1.4 Simplificar `public/css/layout.css`: integrar con grid Bootstrap
- [x] 1.5 Limpiar `public/css/responsive.css`: Bootstrap responsive lo cubre

## Phase 2: Layout + Sidebar + Navbar

- [x] 2.1 Migrar `public/js/layouts/MainLayout.js` a estructura Bootstrap (d-flex, vh-100, overflow)
- [x] 2.2 Refactorizar `public/js/components/Sidebar.js`: emojis → FontAwesome, nav Bootstrap `.nav.flex-column`
- [x] 2.3 Refactorizar `public/js/components/Navbar.js`: emojis → FontAwesome, navbar Bootstrap `.navbar.navbar-light`

## Phase 3: Template Animales

- [x] 3.1 Refactorizar `public/js/pages/animales/AnimalList.js`: tabla → `.table.table-hover`, filtros → Bootstrap grid, botones → `.btn-outline-*` + FontAwesome, eliminar inline styles
- [x] 3.2 Refactorizar `public/js/pages/animales/AnimalForm.js`: formulario → `.row.g-3` + `.form-control`, botones estandarizados, eliminar inline styles
- [x] 3.3 Refactorizar `public/js/pages/animales/AnimalDetail.js`: cards → `.card`, timeline → Bootstrap, emojis → FontAwesome

## Phase 4: Replicar al resto de secciones

- [ ] 4.1 Refactorizar `Dashboard.js` + `DashboardStats.js` — emojis → FA, cards Bootstrap
- [ ] 4.2 Refactorizar `Sidebar.js` ya hecho (fase 2)
- [ ] 4.3 Refactorizar sección Rebaños (RebanoList, RebanoDetail, RebanoForm, CostosRebanoPage)
- [ ] 4.4 Refactorizar sección Vacunación (VacunacionList, VacunacionForm, MedicamentoList)
- [ ] 4.5 Refactorizar sección Reproducción (ReproduccionPage + forms de diagnóstico/servicio/parto)
- [ ] 4.6 Refactorizar sección Ventas (VentaList, VentaForm, VentaDetail, CompaniaList, CompaniaForm)
- [ ] 4.7 Refactorizar sección Compras (CompraList, CompraForm, CompraDetail)
- [ ] 4.8 Refactorizar GastosPage + HistorialPage + Login

## Phase 5: Micro-interacciones

- [ ] 5.1 Reemplazar `alert()` nativo por toasts Bootstrap en todas las páginas
- [ ] 5.2 Agregar spinner Bootstrap en botones durante envíos de formularios
- [ ] 5.3 Agregar tooltips Bootstrap en botones de acción (editar, eliminar, ver)
- [ ] 5.4 Agregar transiciones suaves entre páginas (fade al cargar contenido)
