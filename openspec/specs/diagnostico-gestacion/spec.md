# Diagnóstico de Gestación Specification

## Purpose

Registrar el diagnóstico de preñez (gestación) mediante métodos de palpación o ecografía. Cada diagnóstico se vincula a un servicio previo y registra un resultado Positivo o Negativo. El resultado determina si el animal permanece en estado `Prenada` o regresa a `Vacia`.

## Requirements

### Requirement: Validación del Servicio y Método

El sistema **MUST** validar que:
- El `servicio_id` existe y pertenece al mismo animal que el diagnóstico
- El método está en (`Palpación`, `Ecografía`)
- El resultado está en (`Positivo`, `Negativo`)

#### Scenario: Servicio inválido es rechazado

- GIVEN un `servicio_id` que no existe, o que pertenece a un animal diferente
- WHEN el usuario intenta registrar un diagnóstico de gestación con ese servicio
- THEN el sistema rechaza la operación
- AND retorna un error indicando que el servicio no es válido para ese animal

### Requirement: Actualización de Estado por Resultado

El sistema **MUST** actualizar `animales.estado_reproductivo` según el resultado del diagnóstico:
- Si `resultado = Positivo` → el estado se mantiene en `Prenada`
- Si `resultado = Negativo` → el estado cambia a `Vacia`

#### Scenario: Diagnóstico positivo confirma preñez

- GIVEN un animal en estado `Prenada` con un servicio registrado
- WHEN el usuario registra un diagnóstico de gestación con `resultado = Positivo`
- THEN el sistema crea el registro con resultado positivo
- AND `animales.estado_reproductivo` permanece `Prenada`

#### Scenario: Diagnóstico negativo revierte a Vacia

- GIVEN un animal en estado `Prenada` con un servicio registrado
- WHEN el usuario registra un diagnóstico de gestación con `resultado = Negativo`
- THEN el sistema crea el registro con resultado negativo
- AND `animales.estado_reproductivo` cambia a `Vacia`
