# Proposal: Agregar precio/kg y cálculo automático a botones de venta

## Why

El formulario de registro de animales (`AnimalForm.js`) ya tiene un sistema de cálculo automático entre peso × precio/kg = precio final. Sin embargo, los **tres puntos de venta** del sistema no tienen este comportamiento:

1. **Modal "Dar de Baja" → Venta** (`AnimalDetail.js`): Solo muestra peso de salida y precio de venta. El animal YA tiene `precio_kg` y `peso_entrada` en BD pero no se muestran ni se usan para calcular.
2. **Modal "Vender (N)"** (`AnimalList.js`): Solo muestra precio unitario y peso total del lote. No hay campo de precio/kg ni cálculo automático.
3. **Formulario standalone de venta** (`VentaForm.js`): Solo tiene precio y peso de salida. Sin precio/kg ni cálculo.

Esto genera inconsistencia en la UX y obliga al usuario a calcular manualmente el precio/kg o el precio final.

## What Changes

### Frontend (3 archivos)

| Archivo | Cambio |
|---------|--------|
| `public/js/pages/animales/AnimalDetail.js` | Agregar campo `precio_kg` y `peso_entrada` (read-only) al modal de baja/venta. Agregar funciones `calcularDesdePesoSalida()`, `calcularDesdePrecioKg()`, `calcularDesdePrecioVenta()` que repliquen la lógica de `AnimalForm.js`. |
| `public/js/pages/animales/AnimalList.js` | Agregar campo `precio_kg` al modal de venta múltiple. Agregar cálculo automático `precio_total = peso_total_lote × precio_kg`. |
| `public/js/pages/ventas/VentaForm.js` | Agregar campo `precio_kg` al formulario. Agregar cálculo automático entre peso_salida × precio_kg = precio. |

### Backend (2 archivos)

| Archivo | Cambio |
|---------|--------|
| `api/controllers/AnimalController.php` | `baja()`: aceptar `precio_kg` del payload y guardarlo en la tabla `ventas`. |
| `api/controllers/VentaController.php` | `store()`, `update()`, `ventaMultiple()`: aceptar `precio_kg` y persistirlo. |

### Base de datos

| Archivo | Cambio |
|---------|--------|
| `database/schema.sql` | Agregar columna `precio_kg DECIMAL(10,2) NULL` a la tabla `ventas`. |
| `database/migracion_venta_precio_kg.sql` | Nuevo script de migración para aplicar la columna en BD existentes. |

## Scope

### In scope
- Los 3 formularios de venta tendrán campo `precio_kg` con cálculo automático cruzado (precio/kg ↔ precio total)
- El backend aceptará y persistirá `precio_kg` en la tabla `ventas`
- La migración de BD agregará la columna sin afectar datos existentes

### Out of scope
- No se modifica el formulario de registro de animales (`AnimalForm.js`) — ya funciona bien
- No se cambia la lógica de negocio de cómo se distribuye el peso en venta múltiple
- No se modifica el dashboard ni reportes
- No se toca el flujo de "Muerte" en el modal de baja

## Risks

| Riesgo | Mitigación |
|--------|-----------|
| Migración de BD en producción | Columna nueva con `NULL` default, sin afectar registros existentes. Script separado para ejecución controlada. |
| Inconsistencia entre los 3 formularios | Usar exactamente la misma lógica de cálculo que `AnimalForm.js` en los 3. Extraer a helper si el código se repite 3 veces. |
| Backward compatibilidad del backend | `precio_kg` es opcional en todos los endpoints. Si no se envía, se guarda NULL. |
| Sin test framework | Verificación manual en los 3 flujos. |
| `VentaForm.js` es también usado para transferencias | El campo `precio_kg` solo aplica cuando `tipo === 'Venta'`. Para transferencias se oculta o deshabilita. |

## Dependencies

Ninguna externa. Todo es interno al proyecto.

## Verification

Verificación manual en 3 flujos:

1. **Baja → Venta**: Ir a detalle de animal, "Dar de Baja", seleccionar "Venta". Verificar que:
   - Muestra `peso_entrada` (read-only) y `precio_kg` del animal
   - Al ingresar `precio_kg` y `peso_salida`, calcula `precio_venta = peso_salida × precio_kg`
   - Al ingresar `precio_venta` y `peso_salida`, calcula `precio_kg = precio_venta / peso_salida`
   - Se guarda correctamente en BD

2. **Venta múltiple**: Seleccionar N animales, "Vender (N)". Verificar que:
   - Tiene campo `precio_kg`
   - Al ingresar `precio_kg` y `peso_total_lote`, calcula `precio_unitario = (peso_total_lote × precio_kg) / N`

3. **Formulario standalone**: Ir a `/ventas/nuevo`. Verificar que:
   - Tiene campo `precio_kg`
   - Cálculo cruzado entre `peso_salida × precio_kg = precio`
   - Se guarda en BD
