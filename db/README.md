# Database Foundation (PostgreSQL)

This directory contains the first-pass PostgreSQL schema for the Elevare Web + Mobile platform.

## Structure

- `migrations/0001_initial_schema.sql`: Core schema for:
  - Identity & role-based access
  - Properties, ownership and addresses
  - Legal cases, compliance checks and PoA governance
  - Tenancy, inspections, maintenance
  - Tickets/chat-style updates and notifications
  - Subscription plans and invoicing
  - Document vault and audit logs
- `migrations/0002_foundation_refinements.sql`: Additive hardening for:
  - Organization memberships (multi-tenant access model)
  - Session/device registration support for web + mobile auth
  - Property team assignment mapping
  - Data quality constraints for financial tables
  - Ticket SLA fields for service desk workflows
- `seeds/001_seed_roles_and_plans.sql`: Starter seed data for roles and subscription plans.

## How to apply

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0002_foundation_refinements.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seeds/001_seed_roles_and_plans.sql
```

## Notes

- UUID primary keys use `gen_random_uuid()` from `pgcrypto`.
- Every mutable table includes `updated_at` and trigger-driven update stamping.
- Domain statuses use `CHECK` constraints to keep v1 simple and explicit.
- Emails are case-insensitive (`citext`) to avoid duplicate-account edge cases.
- This schema is intentionally normalized for shared web/mobile APIs and can be extended with materialized views for analytics.
