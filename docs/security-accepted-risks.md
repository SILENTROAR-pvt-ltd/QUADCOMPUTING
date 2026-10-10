# Security Accepted Risks: Next.js Framework Advisories

- **Package**: `next@14.2.35`
- **Status**: Vulnerabilities flagged in `npm audit` have no patched release on the `14.x` branch.
- **Mitigations In Place**:
  1. `images.unoptimized: true` configured in `next.config.mjs`, with external image host patterns (`remotePatterns`) removed, neutralizing server-side Image Optimizer SSRF and RCE attack surfaces.
  2. Handler-level authentication and business-scoping guards (`requireHost`, `requireAdmin`, `validateGuestAccess`) applied across all route handlers in addition to Edge middleware route protection.
- **Remediation Plan**:
  - Upgrade to the latest supported Next.js major release (15/16) on the staging environment following the pilot phase.
  - **Owner**: Core Engineering Lead
  - **Target Date**: End of Phase 2 (post-pilot stabilization)
