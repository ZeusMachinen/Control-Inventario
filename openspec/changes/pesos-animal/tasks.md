# Tasks: Pesos — Peso de Entrada/Salida y Precio por kg

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120-180 (mostly additive, no new files) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Base de Datos

- [x] 1.1 Agregar columnas en `database/schema.sql` para `peso_entrada DECIMAL(10,2)`, `precio_kg DECIMAL(12,2)` en tabla `animales`
- [x] 1.2 Agregar columna en `database/schema.sql` para `peso_salida DECIMAL(10,2)` en tabla `ventas`

## Phase 2: API (Backend PHP)

- [x] 2.1 `AnimalController::store()` — aceptar peso_entrada y precio_kg opcionales en el INSERT
- [x] 2.2 `AnimalController::update()` — aceptar peso_entrada y precio_kg opcionales en el UPDATE
- [x] 2.3 `VentaController::store()` — aceptar peso_salida opcional en el INSERT

## Phase 3: Frontend — Formularios

- [x] 3.1 `AnimalForm.js` — agregar input numérico para peso_entrada (kg) y precio_kg ($/kg)
- [x] 3.2 `AnimalForm.js` — enviar peso_entrada y precio_kg en el payload
- [x] 3.3 `VentaForm.js` — agregar input numérico para peso_salida (kg)
- [x] 3.4 `VentaForm.js` — enviar peso_salida en el payload

## Phase 4: Frontend — Visualización

- [x] 4.1 `AnimalDetail.js` — mostrar peso_entrada y precio_kg si tienen valor
- [x] 4.2 `AnimalList.js` — agregar columnas "Peso Entrada" y "Precio/kg"
- [x] 4.3 `VentaList.js` — agregar columna "Peso Salida"
