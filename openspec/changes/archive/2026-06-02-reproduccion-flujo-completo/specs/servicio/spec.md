# Servicio Specification

## Purpose

Registrar el servicio (monta o inseminación) realizado a una hembra. Los tipos de servicio incluyen Monta Natural, Inseminación Artificial, y Transferencia de Embriones. El servicio puede vincularse opcionalmente a un diagnóstico de celo previo y a un reproductor del sistema o externo. Al registrarse, el sistema actualiza automáticamente el estado reproductivo del animal a `Prenada`.

## Requirements

### Requirement: Validación del Animal y Tipo de Servicio

El sistema **MUST** validar que:
- El animal es `Hembra` con `estado_general = Activo`
- El tipo de servicio está en (`Monta Natural`, `Inseminación Artificial`, `Transferencia de Embriones`)

#### Scenario: Servicio post-celo exitoso

- GIVEN un animal Hembra Activo con un diagnóstico de celo registrado
- WHEN el usuario registra un servicio vinculado a ese diagnóstico de celo
- THEN el sistema crea el registro de servicio con `diagnostico_celo_id` asignado
- AND actualiza `animales.estado_reproductivo = 'Prenada'`

#### Scenario: Servicio sin celo previo

- GIVEN un animal Hembra Activo sin diagnóstico de celo registrado
- WHEN el usuario registra un servicio para ese animal sin asociar a un diagnóstico de celo
- THEN el sistema crea el registro de servicio con `diagnostico_celo_id = NULL`
- AND actualiza `animales.estado_reproductivo = 'Prenada'`

### Requirement: Actualización del Estado Reproductivo

Al registrar un servicio exitosamente, el sistema **MUST** actualizar `animales.estado_reproductivo` a `Prenada`.

#### Scenario: Estado reproductivo cambia a Prenada

- GIVEN un animal en estado `Vacia`
- WHEN se registra un servicio exitosamente
- THEN el campo `estado_reproductivo` del animal cambia a `Prenada`

### Requirement: Reproductor Externo

El sistema **SHOULD** permitir registrar un reproductor externo mediante un nombre libre cuando no existe un toro registrado en el sistema.

#### Scenario: Servicio con reproductor externo

- GIVEN un animal Hembra Activo
- WHEN el usuario registra un servicio con `reproductor_nombre` en lugar de `reproductor_id`
- THEN el sistema crea el servicio con el nombre del reproductor externo almacenado
- AND no valida existencia del reproductor en la tabla animales

### Requirement: Asociación a Diagnóstico de Celo

El sistema **SHOULD** permitir asociar el servicio a un diagnóstico de celo existente mediante `diagnostico_celo_id`.

#### Scenario: Servicio vinculado a diagnóstico de celo

- GIVEN un diagnóstico de celo existente para el animal
- WHEN el usuario envía `diagnostico_celo_id` válido en el formulario de servicio
- THEN el sistema asocia el servicio a ese diagnóstico de celo mediante FK
