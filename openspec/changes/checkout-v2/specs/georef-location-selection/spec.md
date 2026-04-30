# Georef Location Selection Specification

## Purpose

Defines Argentine province and city dropdown behavior using the Georef API (`apis.datos.gob.ar`). Province/city data is fetched server-side with caching. Customer selects province → city dropdown populates. Georef IDs and labels are persisted on the order for address stability.

## Requirements

### Requirement: Province Dropdown

The system SHALL provide a province dropdown populated from the Georef API. The 24 Argentine provinces MUST be loaded server-side with Next.js caching. The dropdown MUST include a default "Seleccioná provincia" placeholder.

#### Scenario: Province dropdown loads successfully

- GIVEN the checkout form renders
- WHEN the province dropdown is displayed
- THEN it contains all 24 Argentine provinces from cached Georef data
- AND the default option is "Seleccioná provincia"

#### Scenario: Province dropdown fetch fails

- GIVEN the cached Georef province data is unavailable
- WHEN the checkout form renders
- THEN the dropdown shows an error state with a retry message
- AND the customer cannot submit the form until provinces load

### Requirement: City Dropdown

The city dropdown SHALL be dependent on the selected province. When a province is selected, the system MUST fetch cities (departamentos) for that province server-side. The city dropdown MUST be disabled until a province is selected.

#### Scenario: Province selected populates cities

- GIVEN the customer selects a province (e.g., "Córdoba")
- WHEN the city dropdown refreshes
- THEN it populates with departamentos for that province from cached Georef data
- AND the default option is "Seleccioná ciudad"

#### Scenario: Province changed resets city

- GIVEN the customer has selected a province and city
- WHEN the customer changes the province selection
- THEN the city dropdown is reset and re-fetched for the new province
- AND the previously selected city is cleared

#### Scenario: City fetch fails gracefully

- GIVEN the customer selects a province
- WHEN the city data fetch fails
- THEN the city dropdown shows a retry option
- AND the form displays a validation message: "No se pudieron cargar las ciudades"

### Requirement: Georef Data Persistence

The system MUST persist both Georef IDs and human-readable labels (province name, city name) on the order. This ensures address stability if Georef data changes later.

#### Scenario: Order stores province/city IDs and labels

- GIVEN a customer submits an order with province "Córdoba" (ID: "14") and city "Capital" (ID: "14021")
- WHEN the order is persisted
- THEN it stores both the Georef IDs and labels
- AND future Georef API changes do NOT affect the stored order address

### Requirement: Server-Side Caching

Province and city data MUST be fetched server-side using Next.js cache with revalidation. The system MUST NOT require the client to call Georef directly. City data for a province SHOULD be fetched via a server route/action.

#### Scenario: Province data cached

- GIVEN provinces have been fetched once
- WHEN a subsequent request needs province data
- THEN it is served from cache without a new Georef API call
- AND cache revalidates per the configured interval

#### Scenario: City data fetched per province

- GIVEN the customer selects a province
- WHEN the city dropdown needs data
- THEN the client calls a server route that returns cached departamentos for that province
- AND the client never calls Georef directly