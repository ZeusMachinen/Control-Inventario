# Design: core-kpi-animal-lists

## Technical Approach
Add a new backend endpoint and frontend click handlers to make KPI stat-cards interactive. When clicked, each KPI card will fetch the list of animals (or rebaños) behind that KPI and display them in a Bootstrap modal.

## Architecture Decisions

### Decision: New endpoint for animal lists
**Choice**: Create `GET /api/rebanos/kpis/{tipo}/animales`
**Alternatives considered**:
- Modify existing `/api/rebanos/kpis` to include animal lists
- Create 4 separate endpoints (one per tipo)
**Rationale**: New endpoint keeps the existing KPI endpoint fast and simple. Single endpoint with tipo parameter is clean and extensible.

### Decision: Inline modal pattern
**Choice**: Reuse the existing Bootstrap inline modal pattern (inline div with `style="background:rgba(0,0,0,0.5)"`)
**Alternatives considered**:
- Use Bootstrap modal JS initialization
- Create a reusable modal component
**Rationale**: Matches the existing pattern in the codebase (see `RebanoListPage.verEstadisticas()`). No new dependencies.

### Decision: Click handlers on stat-cards
**Choice**: Add onclick handlers directly to stat-card divs
**Alternatives considered**:
- Event delegation on the stats-grid container
- Wrap stat-cards in button elements
**Rationale**: Direct onclick handlers are simplest and match the existing pattern. The stat-cards already have unique IDs.

### Decision: Limit results to 50
**Choice**: Limit endpoint results to 50 items
**Alternatives considered**:
- No limit (return all)
- Pagination in modal
**Rationale**: Prevents huge modals that could freeze the browser. MVP doesn't need pagination.

## Data Flow

    User click on stat-card
            │
            ▼
    Frontend: call GET /api/rebanos/kpis/{tipo}/animales
            │
            ▼
    Backend: query database for animal/rebano names
            │
            ▼
    Frontend: render modal with animal list

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `api/controllers/RebanoController.php` | Modify | Add `kpisAnimales()` method for new endpoint |
| `api/routes/web.php` | Modify | Register new route |
| `public/js/pages/rebanos/RebanoList.js` | Modify | Add click handlers to stat-cards, modal template |
| `public/js/utils/ui.js` | No change | Reuse existing Toast.error pattern |

## Interfaces / Contracts

### New Endpoint: `GET /api/rebanos/kpis/{tipo}/animales`

**Request**:
```http
GET /api/rebanos/kpis/activos/animales
Authorization: Bearer {token}
```

**Response (success)**:
```json
{
  "data": ["Animal1", "Animal2", "Animal3"]
}
```

**Response (error)**:
```json
{
  "error": "Tipo inválido"
}
```

**Supported `tipo` values**: `activos`, `nacidos`, `muertes`, `rebanos`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Backend endpoint logic | Test each tipo query returns correct animal names |
| Integration | Endpoint returns correct format | Test HTTP 200, 400, 401 responses |
| E2E | Modal shows animal list | Test click on stat-card opens modal with correct content |

## Migration / Rollout
No migration required. The change is additive and doesn't affect existing functionality.

## Open Questions
- Should we add a "Showing 50 of X" message in the modal for truncated results? (Deferred to future iteration)