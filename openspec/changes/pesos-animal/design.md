# Design: Pesos — Peso de Entrada/Salida y Precio por kg

## Technical Approach

Agregar 3 columnas NULLABLE a la BD (`peso_entrada`, `precio_kg` en `animales`; `peso_salida` en `ventas`), exponerlas en la API como campos opcionales, y mostrar/editar desde el frontend SPA. Sin migración de datos ni cambios estructurales.

## Architecture Decisions

### Decision: Column Type Precision
| Option | Tradeoff |
|--------|----------|
| INT (kg sin decimales) | Menos preciso, no permite medios kilos |
| **DECIMAL(10,2)** | ✅ Coincide con `companias.peso_entrada`, permite hasta 99,999,999.99 kg |
| FLOAT | ❌ Riesgo de error de redondeo en operaciones financieras |

**Rationale**: Seguir el patrón existente en `companias`. `precio_kg` usa DECIMAL(12,2) como `companias.precio_venta`.

### Decision: Columnas NULLABLE
**Choice**: Todas las columnas nuevas aceptan NULL.
**Rationale**: Animales existentes no tienen peso registrado. El peso es opcional al crear un animal — el usuario puede pesarlo después.

### Decision: Sin tabla separada de pesajes
**Choice**: Guardar peso_entrada directo en `animales` y peso_salida en `ventas`.
**Alternatives considered**: Tabla `pesajes` con FK a animal y tipo (entrada/salida/intermedio).
**Rationale**: El MVP no necesita historial de múltiples pesajes por animal. Cuando lo necesite, se migra. YAGNI.

## Data Flow

```
Registro animal:
  AnimalForm.js ─POST /api/animales─→ AnimalController::store() ─INSERT─→ animales
       │ peso_entrada, precio_kg                        │ columnas nuevas
       └──── opcionales ────────────────────────────────┘

Venta:
  VentaForm.js ─POST /api/ventas─→ VentaController::store() ─INSERT─→ ventas
       │ peso_salida                                    │ columna nueva
       └──── opcional ──────────────────────────────────┘

Visualización:
  DB ─SELECT─→ Controller ─JSON─→ AnimalDetail.js / AnimalList.js / VentaList.js
                                    │ renderizan los nuevos campos si tienen valor
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `database/schema.sql` | Modify | `ALTER TABLE animales ADD COLUMN` peso_entrada, precio_kg; `ALTER TABLE ventas ADD COLUMN` peso_salida |
| `api/controllers/AnimalController.php` | Modify | Store/update aceptan peso_entrada y precio_kg como opcionales |
| `api/controllers/VentaController.php` | Modify | Store acepta peso_salida como opcional |
| `public/js/pages/animales/AnimalForm.js` | Modify | Inputs numéricos para peso_entrada y precio_kg |
| `public/js/pages/animales/AnimalDetail.js` | Modify | Mostrar peso_entrada y precio_kg si tienen valor |
| `public/js/pages/animales/AnimalList.js` | Modify | Columnas "Peso Entrada" y "Precio/kg" |
| `public/js/pages/ventas/VentaForm.js` | Modify | Input numérico para peso_salida |
| `public/js/pages/ventas/VentaList.js` | Modify | Columna "Peso Salida" |

## Interfaces / Contracts

### API Request — POST/PUT /api/animales
```json
{
  "nombre": "...",
  "peso_entrada": 450.50,
  "precio_kg": 3.20
}
```
Ambos opcionales. Si no se envían, DB guarda NULL.

### API Request — POST /api/ventas
```json
{
  "animal_id": 1,
  "precio": 150000,
  "peso_salida": 460.00
}
```
`peso_salida` opcional. Si no se envía, DB guarda NULL.

### API Response
Los campos se incluyen en las respuestas GET de animales (`peso_entrada`, `precio_kg`) y ventas (`peso_salida`) con valor `null` si no tienen dato.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Manual | Crear animal con/sin peso | Verificar que persiste y se muestra |
| Manual | Editar peso de animal | Verificar update |
| Manual | Venta con/sin peso_salida | Verificar que persiste y se muestra en lista |
| Visual | Listados | Verificar que columnas nuevas aparecen y muestran "-" cuando es null |

## Migration / Rollout

```sql
ALTER TABLE animales
  ADD COLUMN peso_entrada DECIMAL(10,2) NULL AFTER foto,
  ADD COLUMN precio_kg DECIMAL(12,2) NULL AFTER peso_entrada;

ALTER TABLE ventas
  ADD COLUMN peso_salida DECIMAL(10,2) NULL AFTER notas;
```

Rollback: `ALTER TABLE animales DROP COLUMN precio_kg, DROP COLUMN peso_entrada; ALTER TABLE ventas DROP COLUMN peso_salida;`
