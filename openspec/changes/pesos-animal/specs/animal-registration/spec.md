# Animal Registration — Weight & Price Spec

## Purpose

Add entry weight and price-per-kg fields to the animal registration flow, enabling future inventory valuation and profit calculations.

## Requirements

### Requirement: Register Entry Weight

The system MUST accept `peso_entrada` (decimal, kg) as a required field when registering a new animal. The value MUST be positive and MUST NOT exceed 2000 kg. The field SHALL use a numeric input with up to 2 decimal places.

#### Scenario: Happy path — register animal with valid weight

- GIVEN the user is on the animal registration form
- WHEN they enter `peso_entrada = 350.50` and submit
- THEN the animal is created with `peso_entrada = 350.50`

#### Scenario: Edge case — weight is zero

- GIVEN the user is on the animal registration form
- WHEN they enter `peso_entrada = 0`
- THEN the system SHALL reject with "Entry weight must be greater than zero"

#### Scenario: Edge case — weight exceeds maximum

- GIVEN the user is on the animal registration form
- WHEN they enter `peso_entrada = 2500`
- THEN the system SHALL reject with "Entry weight must not exceed 2000 kg"

#### Scenario: Edge case — empty weight

- GIVEN the user is on the animal registration form
- WHEN they leave `peso_entrada` blank and submit
- THEN the system SHALL reject with "Entry weight is required"

### Requirement: Register Price per kg

The system MUST accept `precio_kg` (decimal) as a required field when registering a new animal. The value MUST be positive. The field SHALL use a currency-style numeric input with up to 2 decimal places.

#### Scenario: Happy path — register animal with valid price

- GIVEN the user is on the animal registration form
- WHEN they enter `precio_kg = 4.50` and submit
- THEN the animal is created with `precio_kg = 4.50`

#### Scenario: Edge case — price is zero

- GIVEN the user is on the animal registration form
- WHEN they enter `precio_kg = 0`
- THEN the system SHALL reject with "Price per kg must be greater than zero"

#### Scenario: Edge case — empty price

- GIVEN the user is on the animal registration form
- WHEN they leave `precio_kg` blank and submit
- THEN the system SHALL reject with "Price per kg is required"

### Requirement: View Entry Weight

The system MUST display `peso_entrada` in the animal detail view and the animal list view. The value SHALL be formatted as "XXX.XX kg".

#### Scenario: Happy path — weight shown in detail

- GIVEN an animal exists with `peso_entrada = 350.50`
- WHEN the user opens the animal detail
- THEN they see "350.50 kg" displayed

#### Scenario: Happy path — weight shown in list

- GIVEN animals exist with varying weights
- WHEN the user views the animal list
- THEN each row SHALL show the `peso_entrada` in the "Peso Entrada" column

### Requirement: View Price per kg

The system MUST display `precio_kg` in the animal detail view and the animal list view. The value SHALL be formatted as "$X.XX" using the configured locale currency format.

#### Scenario: Happy path — price shown in detail

- GIVEN an animal exists with `precio_kg = 4.50`
- WHEN the user opens the animal detail
- THEN they see "$4.50" displayed (or equivalent locale format)

#### Scenario: Happy path — price shown in list

- GIVEN animals exist with varying prices
- WHEN the user views the animal list
- THEN each row SHALL show the `precio_kg` in a "Precio/Kg" column
