# ADR 0001: Business and Branch Model

Status: Accepted

## Decision

`businesses` represents a legal entity or brand parent. `locations` represents each physical operating property and maps to the domain concept `PropertyBranch`.

## Consequences

- A host can own multiple business entities.
- Each business can own multiple locations.
- Catalog items attach to a `PropertyBranch`/location.
- Provisioning must create the host profile, business parent, and one or more locations in one transaction.
