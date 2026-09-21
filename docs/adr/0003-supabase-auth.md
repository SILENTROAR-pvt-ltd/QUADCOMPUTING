# ADR 0003: Authentication Provider

Status: Accepted

## Decision

Use Supabase Auth as the authentication provider.

## Consequences

- Host routes require a server-side Supabase session guard.
- Provisioning derives ownership from the authenticated user, never request input.
- RLS policies use the authenticated user identity.
- Server and browser Supabase clients will be introduced before production persistence.
