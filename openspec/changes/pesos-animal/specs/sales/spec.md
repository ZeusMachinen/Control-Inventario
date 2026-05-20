# Sales — Exit Weight Spec

## Purpose

Add exit weight field to the sale creation flow, enabling future profit calculation by comparing entry vs exit weight.

## Requirements

### Requirement: Register Exit Weight

The system MUST accept `peso_salida` (decimal, kg) as a required field when creating a sale. The value MUST be positive. For sales linked to an existing animal, the value MUST NOT exceed that animal's `peso_entrada`. The field SHALL use a numeric input with up to 2 decimal places.

#### Scenario: Happy path — create sale with valid exit weight

- GIVEN an animal exists with `peso_entrada = 350.50`
- WHEN the user creates a sale for that animal with `peso_salida = 340.00`
- THEN the sale is created with `peso_salida = 340.00`

#### Scenario: Edge case — exit weight exceeds entry weight

- GIVEN an animal exists with `peso_entrada = 350.50`
- WHEN the user creates a sale with `peso_salida = 360.00`
- THEN the system SHALL reject with "Exit weight must not exceed the animal's entry weight (350.50 kg)"

#### Scenario: Edge case — exit weight is zero

- GIVEN the user is on the sale creation form
- WHEN they enter `peso_salida = 0`
- THEN the system SHALL reject with "Exit weight must be greater than zero"

#### Scenario: Edge case — empty exit weight

- GIVEN the user is on the sale creation form
- WHEN they leave `peso_salida` blank and submit
- THEN the system SHALL reject with "Exit weight is required"

#### Scenario: Edge case — sale without linked animal

- GIVEN the user is creating a sale NOT linked to an existing animal
- WHEN they enter `peso_salida = 500.00`
- THEN the system SHALL accept the value (the entry-weight consistency check only applies when an animal is linked)

### Requirement: View Exit Weight

The system MUST display `peso_salida` in the sales list view. The value SHALL be formatted as "XXX.XX kg".

#### Scenario: Happy path — exit weight shown in sales list

- GIVEN a sale exists with `peso_salida = 340.00`
- WHEN the user views the sales list
- THEN they see "340.00 kg" in the "Peso Salida" column

#### Scenario: Edge case — sale without exit weight

- GIVEN a sale exists with no `peso_salida` (nullable allowed for legacy data)
- WHEN the user views the sales list
- THEN the cell SHALL display "—" (dash) instead of a formatted value
