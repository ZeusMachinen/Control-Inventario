# Diagnóstico de Celo Specification

## Purpose

Registrar la detección de celo (estro) en hembras bovinas. Captura fechas, síntomas observados, y comportamiento del animal durante el período de celo. Para hembras sin celo previo, el sistema sugiere la transición al siguiente paso del flujo reproductivo.

## Requirements

### Requirement: Validación del Animal

El sistema **MUST** validar que el animal destino cumple las siguientes condiciones antes de registrar un diagnóstico de celo:
- Sexo igual a `Hembra`
- `estado_general` igual a `Activo`
- Edad mínima de 15 meses al momento del registro

#### Scenario: Hembra adulta activa registra celo exitosamente

- GIVEN un animal con sexo `Hembra`, `estado_general = Activo`, y edad ≥ 15 meses
- WHEN el usuario envía un POST a `/api/reproduccion/celos` con `animal_id` y `fecha_inicio` válidos
- THEN el sistema registra el diagnóstico de celo
- AND retorna el registro creado con código 201

#### Scenario: Ternero menor a 15 meses es rechazado

- GIVEN un animal con edad < 15 meses, independientemente de su sexo
- WHEN el usuario intenta registrar un diagnóstico de celo para ese animal
- THEN el sistema rechaza la operación
- AND retorna un error indicando que la edad mínima es 15 meses

#### Scenario: Macho es rechazado

- GIVEN un animal con sexo `Macho`
- WHEN el usuario intenta registrar un diagnóstico de celo para ese animal
- THEN el sistema rechaza la operación
- AND retorna un error indicando que solo hembras pueden tener diagnóstico de celo

### Requirement: Registro de Síntomas y Comportamiento

El sistema **SHOULD** permitir registrar síntomas y comportamiento observados durante el celo (e.g., inquietud, monta a otros animales, secreción vulvar, etc.).

#### Scenario: Diagnóstico de celo con síntomas detallados

- GIVEN un animal que cumple las condiciones para registro de celo
- WHEN el usuario envía el formulario incluyendo campos de `sintomas` y `comportamiento`
- THEN el sistema almacena esos datos junto con el registro de diagnóstico de celo

### Requirement: Primer Celo del Animal

Si es el primer diagnóstico de celo registrado para un animal, el sistema **SHOULD** indicar que el animal está listo para la transición a servicio.

#### Scenario: Primer celo detectado sugiere servicio

- GIVEN un animal sin diagnósticos de celo previos
- WHEN se registra exitosamente su primer diagnóstico de celo
- THEN el sistema retorna una sugerencia en la respuesta indicando que el animal está listo para registrar un servicio
