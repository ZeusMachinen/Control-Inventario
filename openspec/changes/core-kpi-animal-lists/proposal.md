# Proposal: core-kpi-animal-lists

## Intent

The **Rebaños** page currently displays 4 KPIs (Animales Activos, Nacidos Totales, Muertes, Rebaños Activos) as static numbers. The user wants to **click on any KPI** and see a **modal with the list of animals** that contribute to that number. This improves transparency and allows quick verification of the data behind the KPIs.

This is the **first of 3 chained changes** for Control-Inventario, focusing **only on the Rebaños page**. Dashboard KPIs are explicitly excluded per user request.


## Scope

### In Scope
- **Backend endpoint**: `GET /api/rebanos/kpis/{tipo}/animales` to return animal names for a given KPI type (activos, nacidos, muertes, rebanos_activos).
- **Frontend click handler**: Add `onclick` event to each KPI stat-card in `RebanoList.js`.
- **Bootstrap modal**: Display animal names in a simple list (limit to top 50 for MVP).
- **Follow existing patterns**: Reuse the Bootstrap modal inline pattern already used in `RebanoListPage.verEstadisticas()`.

### Out of Scope
- **Dashboard KPIs**: Explicitly excluded per user request.
- **KPIs on other pages**: Inactivos and Ventas KPIs are part of separate changes.
- **Search/filter inside the modal**: Not required for MVP.
- **Pagination**: Limit to top 50 animals for simplicity.
- **Design changes**: No UI/UX redesign; follow existing patterns.


## Capabilities

### New Capabilities
- `kpi-animal-lists`: Returns the list of animals behind a KPI counter (e.g., activos, nacidos, muertes, rebanos_activos). This capability covers both the backend endpoint and the frontend modal display.

### Modified Capabilities
- None. This change introduces **new behavior** without modifying existing spec-level requirements.


## Approach

1. **Backend**:
   - Add a new endpoint `GET /api/rebanos/kpis/{tipo}/animales` to `RebanoController.php`.
   - The endpoint returns a JSON array of animal names for the given KPI type.
   - Limit results to the top 50 animals for simplicity.

2. **Frontend**:
   - Add an `onclick` handler to each KPI stat-card in `RebanoList.js`.
   - The handler calls the new endpoint and displays the results in a Bootstrap modal.
   - Reuse the existing Bootstrap modal inline pattern from `RebanoListPage.verEstadisticas()`.


## Affected Areas

| Area                                      | Impact       | Description                                                                                     |
|-------------------------------------------|--------------|-------------------------------------------------------------------------------------------------|
| `api/controllers/RebanoController.php`    | Modified     | Add new endpoint `GET /api/rebanos/kpis/{tipo}/animales`.                                      |
| `public/js/pages/rebanos/RebanoList.js`   | Modified     | Add click handler to KPI stat-cards and modal display logic.                                   |
| `public/js/utils/ui.js`                   | None         | Reuse existing Bootstrap modal pattern; no changes required.                                   |
| `Dashboard.js`                            | None         | Explicitly excluded per user request.                                                          |


## Risks

| Risk                                      | Likelihood | Mitigation                                                                                     |
|-------------------------------------------|------------|-------------------------------------------------------------------------------------------------|
| **Backend performance**: Slow queries for large datasets. | Medium      | Limit results to top 50 animals. Optimize SQL queries in the new endpoint.                   |
| **Frontend breaking changes**: Conflicts with existing modal patterns. | Low         | Reuse existing Bootstrap modal pattern from `RebanoListPage.verEstadisticas()`.               |
| **Inconsistent data**: Animal lists do not match KPI counters. | Medium      | Ensure the new endpoint uses the same query logic as the existing KPI counter endpoint.       |
| **Security**: Unauthorized access to animal lists.       | Low         | Apply the same authentication middleware as the existing KPI endpoint.                        |


## Rollback Plan

1. **Backend**:
   - Remove the new endpoint `GET /api/rebanos/kpis/{tipo}/animales` from `RebanoController.php`.

2. **Frontend**:
   - Remove the `onclick` handler from KPI stat-cards in `RebanoList.js`.
   - Remove the modal display logic.

3. **Verification**:
   - Ensure KPI counters still display correctly.
   - Ensure no JavaScript errors are thrown.


## Dependencies
- **Existing modal pattern**: Relies on the Bootstrap modal inline pattern already used in `RebanoListPage.verEstadisticas()`.
- **Authentication middleware**: Uses the same middleware as the existing KPI endpoint to ensure consistency.


## Success Criteria
- [ ] **Backend**: New endpoint `GET /api/rebanos/kpis/{tipo}/animales` returns animal names for each KPI type (activos, nacidos, muertes, rebanos_activos).
- [ ] **Frontend**: Clicking any KPI stat-card opens a modal with the list of animals.
- [ ] **Consistency**: Animal lists match the KPI counters displayed on the page.
- [ ] **No regressions**: Existing KPI counters and modal patterns remain unaffected.