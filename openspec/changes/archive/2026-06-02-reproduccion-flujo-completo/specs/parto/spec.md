# Parto Specification

## Purpose

Registrar el parto de una hembra bovina. El sistema crea automáticamente una o más crías en la tabla `animales`, heredando el rebaño de la madre y actualizando su estado reproductivo a `Lactando`. El parto puede vincularse opcionalmente a un diagnóstico de gestación previo.

## Requirements

### Requirement: Validación de la Madre

El sistema **MUST** validar que el animal es `Hembra` y su `estado_reproductivo` es `Prenada` antes de registrar un parto.

#### Scenario: Intento de parto en animal no preñado es rechazado

- GIVEN un animal Hembra con `estado_reproductivo ≠ Prenada`
- WHEN el usuario intenta registrar un parto para ese animal
- THEN el sistema rechaza la operación
- AND retorna un error indicando que el animal no está en estado de preñez

### Requirement: Creación de Crías

Al registrar un parto, el sistema **MUST** crear una o más crías en la tabla `animales`. Cada cría **MUST** heredar el `rebano_id` de la madre. Las crías se crean con: nombre, sexo, fecha_nacimiento (fecha del parto), peso, `rebano_id = madre.rebano_id`, `madre_id = id de la madre`.

#### Scenario: Parto exitoso con una cría

- GIVEN un animal Hembra en estado `Prenada`
- WHEN el usuario registra un parto con datos de una cría (nombre, sexo, peso)
- THEN el sistema crea el registro de parto
- AND crea un nuevo registro en `animales` con `madre_id` y `rebano_id` heredado
- AND `animales.estado_reproductivo` de la madre cambia a `Lactando`

#### Scenario: Parto con múltiples crías (gemelos)

- GIVEN un animal Hembra en estado `Prenada`
- WHEN el usuario registra un parto con datos de dos o más crías
- THEN el sistema crea el registro de parto
- AND crea N registros en `animales`, cada uno con `madre_id` y `rebano_id` heredado
- AND `animales.estado_reproductivo` de la madre cambia a `Lactando`

### Requirement: Actualización del Estado de la Madre

Al registrar un parto exitosamente, el sistema **MUST** actualizar `animales.estado_reproductivo` de la madre a `Lactando`.

#### Scenario: Madre cambia a Lactando post-parto

- GIVEN un animal Hembra en estado `Prenada`
- WHEN se registra un parto exitosamente
- THEN `animales.estado_reproductivo` cambia a `Lactando`

### Requirement: Parto sin Diagnóstico de Gestación

El sistema **SHOULD** permitir registrar un parto sin diagnóstico de gestación previo.

#### Scenario: Parto sin diagnóstico de gestación

- GIVEN un animal Hembra en estado `Prenada` sin diagnóstico de gestación registrado
- WHEN el usuario registra un parto sin asociar `diagnostico_gestacion_id`
- THEN el sistema crea el parto con `diagnostico_gestacion_id = NULL`
- AND las crías se crean y la madre pasa a `Lactando` normalmente
