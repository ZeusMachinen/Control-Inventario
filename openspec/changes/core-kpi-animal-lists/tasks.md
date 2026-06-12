# Tasks: core-kpi-animal-lists

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120-150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Backend Infrastructure

- [ ] 1.1 Add `kpisAnimales()` method to `RebanoController.php`
  - Handle 4 tipo values: `activos`, `nacidos`, `muertes`, `rebanos`
  - Each tipo has its own SQL query
  - Limit results to 50 items
  - Return `{ "data": [...] }` format

- [ ] 1.2 Register new route in `api/routes/web.php`
  - `GET|/api/rebanos/kpis/{tipo}/animales` → `['RebanoController', 'kpisAnimales', true]`

- [ ] 1.3 Test backend endpoint
  - Verify each tipo returns correct animal/rebano names
  - Verify 400 error for invalid tipo
  - Verify 401 error without auth

## Phase 2: Frontend Implementation

- [ ] 2.1 Add click handlers to stat-cards in `RebanoList.js`
  - `kpi-animales` → tipo `activos`
  - `kpi-nacidos` → tipo `nacidos`
  - `kpi-muertes` → tipo `muertes`
  - `kpi-rebanos` → tipo `rebanos`

- [ ] 2.2 Create modal template in `RebanoList.js`
  - Reuse existing inline modal pattern (like `verEstadisticas()`)
  - Show loading state while fetching
  - Show animal names in a scrollable list
  - Show "No hay animales" for empty state

- [ ] 2.3 Add error handling
  - Use existing `Toast.error()` for endpoint failures
  - Don't show modal if endpoint fails

## Phase 3: Testing

- [ ] 3.1 Test click on each stat-card
  - Verify modal opens
  - Verify correct endpoint is called
  - Verify animal list is displayed

- [ ] 3.2 Test empty state
  - Verify "No hay animales" message when endpoint returns empty array

- [ ] 3.3 Test error handling
  - Verify Toast.error shows when endpoint fails

## Phase 4: Cleanup

- [ ] 4.1 Verify no regressions
  - Existing KPIs still work
  - Existing modals still work
  - No console errors