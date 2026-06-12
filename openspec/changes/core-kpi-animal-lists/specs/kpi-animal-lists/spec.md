# kpi-animal-lists Specification

## Purpose
Enable users to click on KPI stat-cards on the Rebaños page and see the list of animals (or rebaños) that contribute to each KPI value. This provides transparency and allows users to understand what's behind the numbers.

## Requirements

### Requirement: Backend endpoint returns animal names per KPI type

The system MUST provide a `GET /api/rebanos/kpis/{tipo}/animales` endpoint that returns animal names for the specified KPI type.

#### Supported `tipo` values:
- `activos`: Active animals (WHERE activo = 1)
- `nacidos`: All animals ever (no filter, all animals)
- `muertes`: Dead animals (WHERE estado_general = 'Muerto')
- `rebanos`: Active herds (returns rebano names instead of animal names)

#### Response format:
```json
{
  "data": ["Animal1", "Animal2", ...]
}
```

#### Scenario: Happy path - activos
- GIVEN the endpoint `/api/rebanos/kpis/activos/animales`
- WHEN called with valid auth
- THEN return HTTP 200 with array of animal names where activo = 1
- AND limit to 50 items

#### Scenario: Happy path - rebanos
- GIVEN the endpoint `/api/rebanos/kpis/rebanos/animales`
- WHEN called with valid auth
- THEN return HTTP 200 with array of rebano names where activo = 1
- AND limit to 50 items

#### Scenario: Invalid tipo
- GIVEN an invalid tipo value (e.g., `/api/rebanos/kpis/invalido/animales`)
- WHEN called
- THEN return HTTP 400 with error message

#### Scenario: Unauthorized
- GIVEN the endpoint without valid auth
- WHEN called
- THEN return HTTP 401

### Requirement: KPI stat-cards are clickable

Each KPI stat-card in RebanoList.js MUST be clickable and call the corresponding endpoint.

#### Mapping:
- `kpi-animales` → tipo `activos`
- `kpi-nacidos` → tipo `nacidos`
- `kpi-muertes` → tipo `muertes`
- `kpi-rebanos` → tipo `rebanos`

#### Scenario: Click on stat-card
- GIVEN the Rebaños page is loaded
- WHEN user clicks on the `kpi-animales` stat-card
- THEN call `/api/rebanos/kpis/activos/animales`
- AND show loading state

### Requirement: Modal displays animal list

The system MUST display the animal names in a Bootstrap inline modal using the existing pattern.

#### Scenario: Modal shows animal list
- GIVEN the endpoint returns `["Animal1", "Animal2"]`
- WHEN modal opens
- THEN show a modal with title "Animales Activos"
- AND list the animal names in a scrollable container
- AND show "Total: 2 animales"

#### Scenario: Modal shows empty state
- GIVEN the endpoint returns `[]`
- WHEN modal opens
- THEN show a modal with message "No hay animales"

#### Scenario: Modal shows error
- GIVEN the endpoint fails
- WHEN modal tries to open
- THEN show Toast.error with the error message
- AND do not show the modal

### Requirement: Result limit

The endpoint SHOULD limit results to 50 items to prevent large modals.

#### Scenario: More than 50 animals
- GIVEN there are 60 active animals
- WHEN calling `/api/rebanos/kpis/activos/animales`
- THEN return only the first 50 animal names
- AND do not indicate truncation (MVP)

### Requirement: Error handling

If the endpoint fails, the system MUST show a Toast error message using the existing Toast.error pattern.

#### Scenario: Network error
- GIVEN the endpoint call fails with network error
- WHEN trying to show modal
- THEN show Toast.error("Error al cargar animales")

#### Scenario: Server error
- GIVEN the endpoint returns HTTP 500
- WHEN trying to show modal
- THEN show Toast.error with the server error message