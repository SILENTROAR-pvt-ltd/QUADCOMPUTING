# P8: social-guest

**Purpose**: lobby, chat, invitations, reviews, offers, photo vault, call-staff

## Sequence Diagram
```mermaid
sequenceDiagram
  participant UI
  participant API
  participant DB
  UI->>API: (Pipeline Flow)
  API->>DB: Read/Write
```

## File List
(Static analysis approximation)

## Names Used
(Refer to naming-drift.md)

## External APIs / Stores
(Refer to state-and-data-sources.md)

## Failure Points
- JUDGMENT: Needs manual review of atomic operations and error handling in social-guest routes.

## Status
- OVERALL: PARTIAL / STUB

## Tests
- Refer to vitest summary in inventory-loc.md
