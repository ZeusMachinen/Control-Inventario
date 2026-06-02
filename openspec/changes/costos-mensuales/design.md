# Design: Costos Mensuales por Cabeza

## Reglas de Negocio (actualizadas)

1. **Terneros no pagan**: solo Novillos (>12 meses) y Adultos (>24 meses) cuentan para headcount
2. **Movimiento a mitad de mes**: el animal cuenta en el rebaño ORIGEN hasta fin de mes, en el DESTINO desde el mes siguiente
3. **Primer mes completo**: si el rebaño se crea el 12 feb, marzo es el primer mes completo
4. **Animales nuevos**: si se agregan en mayo, cuentan desde junio (siguiente mes completo)

## Algoritmo de Headcount Mensual

Para un mes M (ej: 2026-03-01):
1. Obtener todos los animales del usuario activos en ese momento:
   - `fecha_nacimiento < 2026-04-01` (existen antes del mes siguiente)
   - `fecha_salida IS NULL OR fecha_salida >= 2026-03-01` (no se fueron antes)
2. Calcular etapa en la FECHA del headcount (no hoy):
   - Usar edad al `2026-03-01` → si es ≤12 meses → Ternero → no cuenta
3. Determinar rebaño al INICIO del mes:
   - Si tiene movimientos registrados, usar el movimiento más reciente ANTES del mes
   - Si no tiene movimientos, usar rebano_id actual
   - Si se movió DURANTE el mes → cuenta en el ORIGEN

## Helper Nuevo
Agregar `CalculadorEdad::calcularHasta(string $fechaNacimiento, string $fechaReferencia): array`
Calcula edad como `calcular()` pero contra `$fechaReferencia` en lugar de `new \DateTime()`.

## Tablas Nuevas

### `costos_mensuales`
```sql
CREATE TABLE costos_mensuales (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rebano_id   INT UNSIGNED NOT NULL,
  mes         DATE NOT NULL,              -- siempre día 01
  tipo        ENUM('gasto','inversion') NOT NULL,
  concepto    VARCHAR(255) NOT NULL,
  monto       DECIMAL(12,2) NOT NULL,
  cabezas     INT UNSIGNED NOT NULL DEFAULT 0,
  referencia_tabla VARCHAR(50) NULL,      -- 'medicamentos','vacunaciones','ventas','gastos'
  referencia_id    INT UNSIGNED NULL,
  usuario_id  INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rebano_id) REFERENCES rebanos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_costos_rebano_mes ON costos_mensuales(rebano_id, mes);
```

### `conteo_mensual_rebano` (caché)
```sql
CREATE TABLE conteo_mensual_rebano (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rebano_id   INT UNSIGNED NOT NULL,
  mes         DATE NOT NULL,
  cabezas     INT UNSIGNED NOT NULL DEFAULT 0,
  usuario_id  INT UNSIGNED NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rebano_mes (rebano_id, mes),
  FOREIGN KEY (rebano_id) REFERENCES rebanos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

## Orígenes Automáticos

| Evento | Tabla | Tipo | Concepto |
|--------|-------|------|----------|
| Med refreshed con precio>0 | medicamentos | inversion | "Compra de {nombre} (x{stock})" |
| Vacuna con costo_vet | vacunaciones | inversion | "Vacunación {fecha}: {med}" |
| Compra de animal (ventas tipo Transferencia) | ventas | inversion | "Compra de {animal}" |
| Gasto manual 'mantenimiento' | gastos | gasto | descripción |
| Gasto manual 'medicamentos' | gastos | inversion | descripción |
| Gasto manual 'compras' | gastos | inversion | descripción |

## Rutas

```
GET    /api/rebanos/{id}/costos           → tabla costos del rebaño
GET    /api/rebanos/{id}/costos/cabezas   → headcount histórico
POST   /api/rebanos/{id}/costos/recalcular → recalcular headcount
```

## UI

Botón `💰 Costos` en RebanoList → modal con tabla:
| Mes | Cabezas | Gastos ($) | Inversiones ($) | Total ($) | Costo/Cabeza |
