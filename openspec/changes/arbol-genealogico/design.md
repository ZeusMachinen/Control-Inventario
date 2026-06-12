# Design: Árbol Genealógico en Detalle de Animal

## 1. Arquitectura del Endpoint

### Ubicación
Método `arbolGenealogico(string $id): void` en `api/controllers/AnimalController.php`.

### Flujo

```
recibir $id
  → usuarioId() → (int)AuthMiddleware::ejecutar()->sub
  → queryOne animal + rebano_nombre FROM animales LEFT JOIN rebanos
  → 404 si !animal
  → si madre_id → queryOne madre
  → si padre_id → queryOne padre
  → si madre existe y tiene madre_id → queryOne abuela_materna
  → si madre existe y tiene padre_id → queryOne abuelo_materno
  → si padre existe y tiene madre_id → queryOne abuela_paterna
  → si padre existe y tiene padre_id → queryOne abuelo_paterno
  → query hijos: WHERE (madre_id = :id OR padre_id = :id) AND usuario_id = :uid ORDER BY fecha_nacimiento DESC
  → query hermanos: WHERE (madre_id = :madre OR padre_id = :padre) AND usuario_id = :uid AND id != :id ORDER BY fecha_nacimiento DESC
  → stats: total_hijos=count(hijos), total_hermanos=count(hermanos), tiene_padres=bool(madre_id||padre_id), tiene_hijos=bool(total_hijos>0)
  → Response::json($resultado)
```

## 2. Queries SQL

### Animal actual más rebaño
```sql
SELECT a.*, r.nombre as rebano_nombre
FROM animales a
LEFT JOIN rebanos r ON r.id = a.rebano_id
WHERE a.id = :id AND a.usuario_id = :uid
```

### Obtener un ancestro por ID
```sql
SELECT id, nombre, sexo, etapa, estado_general, activo, foto, rebano_id,
       (SELECT nombre FROM rebanos WHERE id = a.rebano_id) as rebano_nombre
FROM animales a
WHERE id = :id AND usuario_id = :uid
```

### Hijos (madre_id OR padre_id)
```sql
SELECT a.id, a.nombre, a.sexo, a.etapa, a.estado_general, a.activo,
       a.fecha_nacimiento, a.foto, a.peso_entrada,
       r.nombre as rebano_nombre
FROM animales a
LEFT JOIN rebanos r ON r.id = a.rebano_id
WHERE (a.madre_id = :id OR a.padre_id = :id)
  AND a.usuario_id = :uid
ORDER BY a.fecha_nacimiento DESC
```

### Hermanos (misma madre o mismo padre)
```sql
SELECT a.id, a.nombre, a.sexo, a.etapa, a.estado_general, a.activo,
       a.fecha_nacimiento, a.foto,
       r.nombre as rebano_nombre
FROM animales a
LEFT JOIN rebanos r ON r.id = a.rebano_id
WHERE (a.madre_id = :madre OR a.padre_id = :padre)
  AND a.usuario_id = :uid
  AND a.id != :id
ORDER BY a.fecha_nacimiento DESC
```

**Nota**: Si `madre_id` del animal es NULL, la condición `a.madre_id = :madre` con `:madre = NULL` no matchea nada (SQL NULL != NULL). En PHP, si madre_id es null, simplemente no incluimos esa parte del OR.

## 3. Ruta

```php
'GET|/api/animales/{id}/arbol-genealogico' => ['AnimalController', 'arbolGenealogico', true],
```

**Posición en web.php**: después de la línea de `hijos` y `baja`, antes de las rutas de rebaños. Importante que esté **después** de `/api/animales/historial` (ruta literal) para que el router secuencial la resuelva correctamente.

## 4. Diseño Frontend

### Botón en page-header (AnimalDetail.js)

En el `render()`, en el bloque del `page-header`, agregar entre Dar de Baja y Volver:

```javascript
${(a.madre_id || a.padre_id) ? `
  <button class="btn btn-outline-success" onclick="AnimalDetailPage.abrirArbolGenealogico(${a.id})">
    <i class="fas fa-tree"></i> Árbol Genealógico
  </button>
` : ''}
```

Además, si no tiene padres pero tiene hijos (se detecta después de cargar), mostrar el botón igual. Mejor: siempre detección en `cargarHistoriales`:

```javascript
// Variable de instancia
arbolVisible: false,

// En afterRender, cargar hijos como hasta ahora, y si tiene hijos:
this.arbolVisible = (hijos.length > 0);
// Actualizar visibilidad del botón

// En render(), condicionar el botón:
${(a.madre_id || a.padre_id || this.arbolVisible) ? `...` : ''}
```

### Función abrirArbolGenealogico(id)

```javascript
async abrirArbolGenealogico(id) {
  // Crear modal con loader
  const modalHtml = `
    <div class="modal fade d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)this.remove()">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-tree me-2"></i>Árbol Genealógico</h5>
            <button class="btn-close" onclick="this.closest('.modal').remove()"></button>
          </div>
          <div class="modal-body" id="arbol-body">
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2 text-secondary">Cargando árbol genealógico...</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" onclick="this.closest('.modal').remove()">
              <i class="fas fa-times"></i> Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div);

  try {
    const { data: res } = await API.get(`/animales/${id}/arbol-genealogico`);
    const d = res.data || {};
    document.getElementById('arbol-body').innerHTML = AnimalDetailPage.renderArbol(d);
    // Actualizar título con nombre del animal
    const titleEl = div.querySelector('.modal-title');
    if (titleEl && d.animal) titleEl.innerHTML = `<i class="fas fa-tree me-2"></i>Árbol Genealógico — ${d.animal.nombre}`;
  } catch (e) {
    document.getElementById('arbol-body').innerHTML = `
      <div class="alert alert-danger mb-0">
        <i class="fas fa-exclamation-triangle me-2"></i>Error al cargar el árbol genealógico
      </div>`;
  }
}
```

### Función renderArbol(datos)

```javascript
renderArbol(d) {
  const { animal, padres, abuelos, hijos, hermanos, stats } = d;

  const cardAnimal = (a, destacado = false, extraClass = '') => {
    if (!a) return `<div class="card text-center p-3 bg-light border-dashed">
      <div class="text-secondary small">— No registrado</div>
    </div>`;

    const claseEstado = a.estado_general === 'Muerto' ? 'bg-secondary text-white opacity-75'
      : a.estado_general === 'Vendido' ? 'bg-danger text-white opacity-75'
      : '';
    const icono = a.sexo === 'Hembra' ? 'fa-venus text-danger' : 'fa-mars text-primary';
    const claseDestacado = destacado ? 'border border-2 border-success' : '';

    return `<a href="#/animales/${a.id}" class="card text-center text-decoration-none p-3 ${claseEstado} ${claseDestacado}" style="min-width:140px;color:${claseEstado ? 'white' : 'var(--texto-principal)'}">
      <div style="font-size:1.5rem"><i class="fas ${icono}"></i></div>
      <div class="fw-semibold small mt-1">${a.nombre}</div>
      <div><span class="badge bg-primary" style="font-size:0.65rem">${a.etapa}</span></div>
      <div><span class="badge ${a.estado_general === 'Activo' ? 'bg-success' : a.estado_general === 'Muerto' ? 'bg-secondary' : 'bg-danger'}" style="font-size:0.6rem">${a.estado_general}</span></div>
    </a>`;
  };

  const conectorV = () => `<div class="arbol-conector-v"></div>`;
  const nivelDoble = (izq, der, labelIzq, labelDer) => `
    <div class="arbol-nivel-doble">
      <div class="arbol-col">
        ${labelIzq ? `<div class="text-secondary small mb-1">${labelIzq}</div>` : ''}
        ${cardAnimal(izq)}
      </div>
      <div class="arbol-conector-h-container">
        <div class="arbol-conector-h"></div>
      </div>
      <div class="arbol-col">
        ${labelDer ? `<div class="text-secondary small mb-1">${labelDer}</div>` : ''}
        ${cardAnimal(der)}
      </div>
    </div>
  `;

  // Render árbol completo
  return `
    <div class="arbol-container">
      ${/* Abuelos */''}
      <div class="arbol-nivel">
        ${nivelDoble(
          abuelos?.maternos?.madre, abuelos?.maternos?.padre,
          'Abuela Materna', 'Abuelo Materno'
        )}
        <div class="arbol-conector-h-container">
          <div class="arbol-conector-h"></div>
        </div>
        ${nivelDoble(
          abuelos?.paternos?.madre, abuelos?.paternos?.padre,
          'Abuela Paterna', 'Abuelo Paterno'
        )}
      </div>

      ${conectorV()}

      ${/* Padres */''}
      <div class="arbol-nivel">
        ${nivelDoble(padres?.madre, padres?.padre, 'Madre', 'Padre')}
      </div>

      ${conectorV()}

      ${/* Animal actual */''}
      <div class="arbol-nivel-center">
        ${cardAnimal(animal, true)}
      </div>

      ${stats?.tiene_hijos ? conectorV() : ''}

      ${/* Hijos */''}
      ${stats?.tiene_hijos ? `
        <div class="arbol-nivel-hijos">
          ${(hijos || []).map(h => `
            <div class="arbol-col-hijo">
              ${cardAnimal(h)}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${/* Stats */''}
      <div class="text-center mt-3 text-secondary small">
        ${stats?.total_hijos > 0 ? `${stats.total_hijos} hijo(s) · ` : ''}
        ${stats?.total_hermanos > 0 ? `${stats.total_hermanos} hermano(s)` : ''}
        ${!stats?.total_hijos && !stats?.total_hermanos ? 'Sin relaciones registradas' : ''}
      </div>
    </div>
  `;
}
```

### CSS para conectores

Agregar en el template del modal, o en el `page-header` del detalle:

```css
<style>
.arbol-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 1rem 0;
}
.arbol-nivel {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  width: 100%;
}
.arbol-nivel-doble {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.arbol-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 140px;
}
.arbol-conector-v {
  width: 2px;
  height: 30px;
  background: #adb5bd;
  margin: 4px auto;
}
.arbol-conector-h-container {
  display: flex;
  align-items: center;
  min-width: 20px;
}
.arbol-conector-h {
  height: 2px;
  flex: 1;
  background: #adb5bd;
  min-width: 20px;
}
.arbol-nivel-center {
  display: flex;
  justify-content: center;
}
.arbol-nivel-hijos {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.arbol-col-hijo {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.border-dashed {
  border: 1px dashed #adb5bd !important;
}
</style>
```

### Lógica de visibilidad del botón (definitiva)

En `AnimalDetail.js`:

1. En `render()`: mostrar el botón si `a.madre_id || a.padre_id` (datos ya disponibles)
2. En `cargarHistoriales()`: después de cargar hijos, si hay hijos y el botón no se mostró aún, mostrarlo:
   ```javascript
   if (hijos.length > 0 && !a.madre_id && !a.padre_id) {
     // Mostrar botón que estaba oculto
     document.getElementById('btn-arbol').classList.remove('d-none');
   }
   ```

Mejor aún: simplificar renderizando **siempre** el botón en el HTML pero oculto con clase `d-none`, y mostrarlo desde `cargarHistoriales()` cuando se confirme que hay hijos:

```javascript
// En render():
`<button class="btn btn-outline-success ${(!a.madre_id && !a.padre_id) ? 'd-none' : ''}" id="btn-arbol" onclick="AnimalDetailPage.abrirArbolGenealogico(${a.id})">
  <i class="fas fa-tree"></i> Árbol Genealógico
</button>`

// En cargarHistoriales(), después de obtener hijos:
const btnArbol = document.getElementById('btn-arbol');
if (btnArbol && btnArbol.classList.contains('d-none') && hijos.length > 0) {
  btnArbol.classList.remove('d-none');
}
```

## 5. Contrato API (estructura exacta)

```typescript
interface ArbolGenealogicoResponse {
  data: {
    animal: AnimalNode;
    padres: {
      madre: AnimalNode | null;
      padre: AnimalNode | null;
    };
    abuelos: {
      maternos: { madre: AnimalNode | null; padre: AnimalNode | null } | null;
      paternos: { madre: AnimalNode | null; padre: AnimalNode | null } | null;
    };
    hijos: AnimalNode[];
    hermanos: AnimalNode[];
    stats: {
      total_hijos: number;
      total_hermanos: number;
      tiene_padres: boolean;
      tiene_hijos: boolean;
    };
  };
}

interface AnimalNode {
  id: number;
  nombre: string;
  sexo: 'Macho' | 'Hembra';
  etapa: 'Ternero' | 'Novillo' | 'Adulto';
  estado_general: 'Activo' | 'Vendido' | 'Muerto';
  activo: 0 | 1;
  foto: string | null;
  rebano_nombre: string | null;
  fecha_nacimiento?: string;  // solo para hijos/hermanos
  peso_entrada?: number | null;
}
```

## 6. Consideraciones de rendimiento

| Aspecto | Detalle |
|---------|---------|
| Profundidad | 2 niveles arriba (abuelos), 1 nivel abajo (hijos) |
| Límite hijos | Sin límite explícito — se renderizan todos en grid wrap |
| Queries | 1 + hasta 7 queries individuales (todas indexadas por PK o FK) |
| Filtro usuario | Todas las queries incluyen `usuario_id = :uid` |
| Worst case | Toro con 300 hijos → ~300 cards en el modal (scroll) |
| Optimización | Si hay >50 hijos, considerar paginación futura (fuera de scope ahora) |

## 7. Archivos y cambios

| Archivo | Cambio |
|---------|--------|
| `api/controllers/AnimalController.php` | + método `arbolGenealogico($id)` (~70 líneas) |
| `api/routes/web.php` | + 1 ruta después de `/api/animales/{id}/baja` (~1 línea) |
| `public/js/pages/animales/AnimalDetail.js` | + botón condicional + modal + estilos CSS + funciones renderArbol/abrirArbolGenealogico (~200 líneas) |
