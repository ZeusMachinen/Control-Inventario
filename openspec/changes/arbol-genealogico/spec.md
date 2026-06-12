# Spec: Árbol Genealógico en Detalle de Animal

## 1. Endpoint: GET /api/animales/{id}/arbol-genealogico

**URL**: `GET /api/animales/{id}/arbol-genealogico`
**Auth**: JWT requerido, filtrado por `usuario_id`
**Params**: `id` — ID del animal (path param, entero)

### Respuesta exitosa (200)

```json
{
  "data": {
    "animal": {
      "id": 1,
      "nombre": "Lola",
      "sexo": "Hembra",
      "etapa": "Adulto",
      "estado_general": "Activo",
      "activo": 1,
      "foto": null,
      "rebano_nombre": "Rebaño Principal",
      "madre_id": 2,
      "padre_id": 3
    },
    "padres": {
      "madre": {
        "id": 2,
        "nombre": "Maggie",
        "sexo": "Hembra",
        "etapa": "Adulto",
        "estado_general": "Muerto",
        "activo": 0,
        "foto": null,
        "rebano_nombre": "Rebaño Principal"
      },
      "padre": {
        "id": 3,
        "nombre": "Toro",
        "sexo": "Macho",
        "etapa": "Adulto",
        "estado_general": "Activo",
        "activo": 1,
        "foto": null,
        "rebano_nombre": "Rebaño Norte"
      }
    },
    "abuelos": {
      "maternos": {
        "madre": { "id": 6, "nombre": "Abuela M", "sexo": "Hembra", "etapa": "Adulto", "estado_general": "Muerto", "activo": 0 },
        "padre": { "id": 7, "nombre": "Abuelo M", "sexo": "Macho", "etapa": "Adulto", "estado_general": "Activo", "activo": 1 }
      },
      "paternos": {
        "madre": { "id": 8, "nombre": "Abuela P", "sexo": "Hembra", "etapa": "Adulto", "estado_general": "Activo", "activo": 1 },
        "padre": null
      }
    },
    "hijos": [
      {
        "id": 4,
        "nombre": "Ternerito",
        "sexo": "Macho",
        "etapa": "Ternero",
        "estado_general": "Activo",
        "activo": 1,
        "fecha_nacimiento": "2025-06-01",
        "foto": null
      }
    ],
    "hermanos": [
      {
        "id": 5,
        "nombre": "Ternerita",
        "sexo": "Hembra",
        "etapa": "Ternero",
        "estado_general": "Activo",
        "activo": 1,
        "fecha_nacimiento": "2025-06-01"
      }
    ],
    "stats": {
      "total_hijos": 3,
      "total_hermanos": 2,
      "tiene_padres": true,
      "tiene_hijos": true
    }
  }
}
```

### Respuesta error (404)

Si el animal no existe o no pertenece al usuario autenticado:

```json
{
  "error": "Animal no encontrado"
}
```

### Lógica del endpoint

1. Obtener animal actual con `madre_id`, `padre_id`, `rebano_nombre` (JOIN a rebanos)
2. Si no existe o `usuario_id` no coincide → 404
3. Obtener madre por `madre_id` (si existe)
4. Obtener padre por `padre_id` (si existe)
5. Si madre existe:
   - Obtener abuelos maternos (madre de la madre, padre de la madre)
6. Si padre existe:
   - Obtener abuelos paternos (madre del padre, padre del padre)
7. Obtener hijos: `SELECT ... FROM animales WHERE (madre_id = :id OR padre_id = :id) AND usuario_id = :uid ORDER BY fecha_nacimiento DESC`
8. Obtener hermanos: `SELECT ... FROM animales WHERE (madre_id = :madre OR padre_id = :padre) AND usuario_id = :uid AND id != :id ORDER BY fecha_nacimiento DESC`
9. Calcular stats: total_hijos (count), total_hermanos (count), tiene_padres (madre_id o padre_id != null), tiene_hijos (total_hijos > 0)

### Índices

Los índices ya existen en el schema:
- `idx_animales_usuario ON animales(usuario_id)` — cubre el filtro de usuario
- Las FK `madre_id` y `padre_id` ya tienen índices implícitos por ser FK

---

## 2. Modal Árbol Genealógico (Frontend)

### Trigger
- Botón "Árbol Genealógico" en el `page-header` de `AnimalDetail.js`
- Posición: al lado de Editar y Dar de Baja (antes de Volver)

### Visibilidad del botón
- El botón se renderiza SOLO si:
  - `a.madre_id || a.padre_id` (tiene padres), O
  - El endpoint `/api/animales/{id}/hijos` devuelve datos (tiene hijos)
- Determinación: en `cargarHistoriales()`, cuando se cargan los hijos, guardar si hay hijos en una variable. En el `render()`, condicionar según `madre_id/padre_id` o el estado de hijos.
- Alternativa: el endpoint `arbol-genealogico` ya devuelve `stats.tiene_padres` y `stats.tiene_hijos` → podemos usar esa respuesta para decidir visibilidad. Pero eso requeriría cargar el endpoint antes de mostrar el botón.
- **Decisión**: usar `madre_id || padre_id` para padres + resultado de `/hijos` para hijos. Ambos datos ya están disponibles cuando el detalle se renderiza.

### Estructura del modal

Modal Bootstrap de tamaño `modal-lg` con:

```
┌────────────────────────────────────────────────┐
│  Árbol Genealógico — Lola              [Cerrar] │
├────────────────────────────────────────────────┤
│                                                │
│    [Abuela M]    [Abuelo M]  │  [Abuela P]  —  │  ← Abuelos
│         │            │       │      │           │
│         └─────┬──────┘       └──┬───┘           │
│               │                │               │
│            [Maggie]          [Toro]             │  ← Padres
│               │                │               │
│               └───────┬────────┘               │
│                       │                        │
│                    [★ Lola]                    │  ← Animal actual
│                       │                        │
│                  ┌────┴────┐                   │
│               [Ternerito] [Ternerita]          │  ← Hijos
│                                                │
├────────────────────────────────────────────────┤
│                                      [Cerrar]  │
└────────────────────────────────────────────────┘
```

### Card de animal

Cada animal se renderiza como un `<a>` (link) con clase `card`:

```
┌─────────────────────┐
│  [icono sexo]       │
│  Nombre             │
│  [etapa badge]      │
│  [estado badge]     │
└─────────────────────┘
```

- Icono sexo: `<i class="fas fa-venus text-danger"></i>` para Hembra, `<i class="fas fa-mars text-primary"></i>` para Macho
- Etapa badge: `<span class="badge bg-primary">Adulto</span>`
- Estado badge: según `estado_general`:
  - `Activo` → badge bg-success "Activo"
  - `Muerto` → badge bg-secondary "Muerto"
  - `Vendido` → badge bg-danger "Vendido"

### Estilos por estado

- **Activo** (por defecto): card normal, sin modificaciones
- **Muerto**: card con clase `bg-secondary` y `text-white`, opacidad reducida (`.opacity-75`)
- **Vendido**: card con clase `bg-danger` y `text-white`, opacidad reducida (`.opacity-75`)

### Conectores CSS

Usar flexbox + pseudo-elementos `::before` y `::after` para dibujar líneas conectoras entre niveles:

```css
.arbol-nodo {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.arbol-conector-vertical {
  width: 2px;
  height: 30px;
  background: #adb5bd;
}
.arbol-conector-horizontal {
  height: 2px;
  flex: 1;
  background: #adb5bd;
}
```

### Loader

Mientras el endpoint responde, mostrar en el body del modal:
```html
<div class="text-center py-5">
  <div class="spinner-border text-primary" role="status"></div>
  <p class="mt-2 text-secondary">Cargando árbol genealógico...</p>
</div>
```

### Error handling

Si el endpoint falla, mostrar:
```html
<div class="alert alert-danger mb-0">
  <i class="fas fa-exclamation-triangle me-2"></i>Error al cargar el árbol genealógico
</div>
```

---

## 3. Reglas de negocio

| Regla | Comportamiento |
|-------|---------------|
| Sin madre | `padres.madre` = null, `abuelos.maternos` = null |
| Sin padre | `padres.padre` = null, `abuelos.paternos` = null |
| Madre sin madre conocida | `abuelos.maternos.madre` = null |
| Madre sin padre conocido | `abuelos.maternos.padre` = null |
| Hijos (madre o padre) | UNION de `madre_id = :id` y `padre_id = :id`, sin duplicados |
| Hermanos | Misma madre O mismo padre, excluyendo al animal actual |
| Animal inactivo | Se incluye en el árbol, se estiliza según estado |
| Sin hijos | `hijos` = [], `stats.total_hijos` = 0, `stats.tiene_hijos` = false |
| Sin hermanos | `hermanos` = [], `stats.total_hermanos` = 0 |
| Cambio de rebaño | No afecta al árbol (se usa el rebaño actual del animal) |

---

## 4. Criterios de aceptación

- [ ] `GET /api/animales/{id}/arbol-genealogico` devuelve estructura completa incluyendo padres, abuelos, hijos, hermanos y stats
- [ ] Si el animal no existe o no es del usuario → 404
- [ ] Hijos incluyen tanto los vinculados por `madre_id` como por `padre_id`
- [ ] Las relaciones nulas se devuelven como `null` (no ocultan el resto del árbol)
- [ ] Botón "Árbol Genealógico" visible solo cuando el animal tiene padres o hijos
- [ ] Modal abre con loader y renderiza el árbol al recibir datos
- [ ] Cards de animales muertos en gris, vendidos en rojo
- [ ] Cada card es clickeable y navega a `/animales/{id}`
- [ ] Conectores CSS visibles entre niveles
- [ ] No hay regresiones en el detalle de animal existente (editar, baja, hijos, historiales)

---

## 5. Archivos afectados

| Archivo | Acción | Estimación |
|---------|--------|-----------|
| `api/controllers/AnimalController.php` | + método `arbolGenealogico()` | ~70 líneas |
| `api/routes/web.php` | + 1 ruta | ~3 líneas |
| `public/js/pages/animales/AnimalDetail.js` | + botón condicional + modal + estilos | ~200 líneas |
| **Total** | | **~273 líneas** |
