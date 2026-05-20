# SDD Proposal: `pesos-animal`

## Intent
Agregar campos de **peso** y **precio por kg** al registro de animales y ventas para habilitar el cálculo automático de valorización de inventario y ganancias en las operaciones de compra/venta.

## Scope
### In Scope
- **Tabla `animales`**: Agregar `peso_entrada` (decimal, kg) y `precio_kg` (decimal, precio por kg).
- **Tabla `ventas`**: Agregar `peso_salida` (decimal, kg).
- **Formulario de registro de animales** (`AnimalForm.js`): Agregar campos para `peso_entrada` y `precio_kg`.
- **Vista de detalle de animal** (`AnimalDetail.js`): Mostrar `peso_entrada` y `precio_kg`.
- **Lista de animales** (`AnimalList.js`): Mostrar `peso_entrada` y `precio_kg`.
- **Formulario de ventas** (`VentaForm.js`): Agregar campo para `peso_salida`.
- **Lista de ventas** (`VentaList.js`): Mostrar `peso_salida`.
- **Controladores** (`AnimalController.php`, `VentaController.php`): Validar y persistir los nuevos campos.

### Out of Scope
- Cálculo automático de ganancias o valorización de inventario (se abordará en un cambio futuro).
- Modificaciones en reportes o dashboards.
- Migración de datos existentes.

## Approach
1. **Base de datos**: Extender las tablas `animales` y `ventas` con los nuevos campos, siguiendo el patrón existente en `companias`.
2. **Backend**: Actualizar `AnimalController.php` y `VentaController.php` para validar y persistir los nuevos campos.
3. **Frontend**: Modificar los formularios y vistas para incluir los nuevos campos, con validación básica (ej: valores positivos).

## Capabilities
### New Capabilities
- **`animal:register:weight`**: Registrar el peso de entrada de un animal al momento de su ingreso.
- **`animal:register:price_per_kg`**: Registrar el precio por kg de un animal al momento de su ingreso.
- **`animal:view:weight`**: Visualizar el peso de entrada de un animal en su detalle y lista.
- **`animal:view:price_per_kg`**: Visualizar el precio por kg de un animal en su detalle y lista.
- **`sale:register:exit_weight`**: Registrar el peso de salida de un animal al momento de su venta.
- **`sale:view:exit_weight`**: Visualizar el peso de salida de una venta en su detalle y lista.

### Modified Capabilities
*Ninguna. Todos los cambios introducen nuevas capacidades.*

## Risks
- **Validación de datos**: Los campos `peso_entrada`, `precio_kg` y `peso_salida` deben ser positivos y realistas (ej: `peso_entrada` < 2000 kg).
- **Consistencia**: Asegurar que `peso_salida` ≤ `peso_entrada` en ventas para evitar errores lógicos.

## Testing
- **Backend**: Pruebas unitarias para validar los nuevos campos en `AnimalController.php` y `VentaController.php`.
- **Frontend**: Pruebas manuales para verificar la visualización y persistencia de los nuevos campos en formularios y listas.
- **Base de datos**: Verificar que los nuevos campos se creen correctamente y acepten valores válidos.