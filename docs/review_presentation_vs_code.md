# Review: Presentation vs. Code Alignment

**Date:** 2026-02-18
**Scope:** Compare the `elevare Legal and Property Management.pptx` presentation (17 slides) against the database schema in `db/migrations/` and `db/seeds/`.

---

## Overview

The presentation outlines a comprehensive Legal & Property Management SaaS platform for NRI (Non-Resident Indian) property owners. The codebase currently consists of a **PostgreSQL database schema** (two migrations + seed data), along with helper scripts and documentation. There is no application code (no backend API, no frontend, no mobile app) yet.

---

## Matched: Features Well-Covered by the Schema

### 1. Property Types — FULL MATCH

- **Presentation:** Apartments, Independent Houses/Villas/Bungalows, Plots (Residential/Commercial), Farmland/Agriculture
- **Schema:** `properties.property_type` supports `apartment`, `independent_house`, `villa`, `bungalow`, `plot`, `commercial`, `agricultural_land`; `usage_type` covers `residential`, `commercial`, `mixed`, `agricultural`

### 2. Legal Case Management — FULL MATCH

- **Presentation:** Dispute resolution (tenancy, boundary, association, builder defaults, encroachments), litigation management, out-of-court settlements
- **Schema:** `legal_cases.case_type` covers `tenancy_dispute`, `boundary_dispute`, `title_issue`, `poa_issue`, `inheritance`, `builder_default`, `association_issue`, `other`
- Case status tracking, priority levels, and `legal_case_updates` (chat-style history with visibility controls) are all present

### 3. PoA Governance — FULL MATCH

- **Presentation:** Specific limited-purpose PoA, strict audit trails, immediate revocation rights
- **Schema:** `powers_of_attorney` tracks scope, registration number, validity dates, status (`draft`/`active`/`revoked`/`expired`), revocation date and reason

### 4. Compliance & Audit Checks — FULL MATCH

- **Presentation:** OC/CC, Mutation, Khata/Patta, Encumbrance Certificates, Tax, Zoning, PoA validity, Document hygiene
- **Schema:** `compliance_checks.check_type` supports all of the above: `oc_cc`, `mutation`, `khata_patta`, `tax`, `encumbrance`, `zoning`, `poa_validity`, `document_hygiene`

### 5. Tenancy Management — FULL MATCH

- **Presentation:** Tenant onboarding, rent collection, agreement management, eviction handling
- **Schema:** `tenants` (with KYC, emergency contacts), `tenancies` (lease terms, security deposit, status including `under_dispute`), `rent_payments` (due dates, partial payments, overdue tracking)

### 6. Inspections with Geo-Tagging — FULL MATCH

- **Presentation:** Geo-tagged visual inspection reports, periodic visits, photographic evidence of possession
- **Schema:** `inspections` (routine/handover/move_in/move_out/compliance/emergency, with lat/long), `inspection_media` (photo/video/document with lat/long and capture timestamps)

### 7. Maintenance & Repairs — FULL MATCH

- **Presentation:** Repairs, painting, civil works, priority handling
- **Schema:** `maintenance_requests` covers plumbing, electrical, civil, cleaning, painting, security with priority levels and cost tracking

### 8. Support / Service Desk — FULL MATCH

- **Presentation:** 24/7 service desk, in-app ticket creation, emergency response, transparent resolution timelines
- **Schema:** `support_tickets` (general/legal/maintenance/billing/technical/emergency), `ticket_messages` (internal/external), SLA fields (`first_response_due_at`, `resolved_due_at`, `first_response_at`)

### 9. Document Vault — FULL MATCH

- **Presentation:** Secure document vault access
- **Schema:** `documents` covers sale_deed, ec, tax_receipt, poa, rental_agreement, id_proof, legal_notice, court_order, inspection_report; includes SHA-256 checksum, sensitivity flag, and expiry tracking

### 10. Multi-Channel Notifications — FULL MATCH

- **Presentation:** Real-time notifications, instant updates
- **Schema:** `notifications.channel` supports `in_app`, `email`, `sms`, `push`, `whatsapp`

### 11. Subscription Tiers — FULL MATCH

- **Presentation:** Basic, Premium (Enhanced Control), Comprehensive (Ultimate Peace of Mind)
- **Seed data:** Basic (₹14,999/mo), Comprehensive (₹29,999/mo), Premium (₹49,999/mo)
- Invoicing with line items for subscription, legal_service, maintenance, inspection

### 12. Multi-Stakeholder Roles — FULL MATCH

- **Presentation:** Property Owners, Legal Managers, Operations Managers, Account Managers, Support Agents, Field Inspectors
- **Seed data:** All 8 roles: `owner`, `legal_manager`, `ops_manager`, `account_manager`, `support_agent`, `inspector`, `viewer`, `admin`
- `property_team_assignments` maps team members to properties by role

### 13. Platform & Session Management — FULL MATCH

- **Presentation:** iOS/Android App, web platform, 256-bit encryption
- **Schema:** `app_sessions` (web/ios/android), `device_registrations` (push tokens, locale, timezone), `organization_memberships` for multi-tenant access

### 14. Full Audit Trail — FULL MATCH

- **Schema:** `audit_logs` tracks actor, action, entity, metadata (JSONB), IP address, user agent

---

## Gaps: Features in the Presentation Not Fully Covered by Code

| # | Presentation Feature | Gap Description | Severity |
|---|---|---|---|
| 1 | **Annual Legal Audit Framework** (Slide 6) | Structured annual audit cycle with property-type-specific checklists described in presentation. `compliance_checks` covers individual checks but lacks an "audit cycle" or "audit schedule" concept to group checks into annual reviews. | Medium |
| 2 | **Expense Dashboard / Financial Tracking** (Slide 13) | Presentation promises "financial dashboard & expense tracking." No general property expense table exists beyond `maintenance_requests.actual_cost` and `invoices`. Property taxes, utility bills, association dues, and ad-hoc expenses lack dedicated tracking. | Medium |
| 3 | **Construction Oversight** (Slide 12) | Listed as a service under Property Management operations. No table for construction projects, milestones, or oversight workflow. | Low |
| 4 | **Escalation Matrix** (Slide 8) | Presentation mentions "Defined escalation matrix" for emergencies. No escalation rules or SLA-escalation workflow tables exist (SLA fields are present on tickets but no escalation logic). | Low |
| 5 | **Live Chat** (Slide 13) | Presentation promises "Live chat with support agents." `ticket_messages` supports async messaging but there is no real-time chat infrastructure in the schema. | Low |
| 6 | **Association Dues / Sinking Fund** (Slide 16) | Apartment audit checklist mentions tracking association dues, special assessments, and sinking fund. No dedicated tables for these recurring property-level obligations. | Low |
| 7 | **Revenue Record Granularity** (Slides 3–4) | Extensive discussion about Patta/RTC/Adangal/Pahani for farmland and plots. `compliance_checks` can track high-level status but has no columns for survey numbers, cultivation records, or state-specific revenue record fields. | Low |
| 8 | **Termination / Document Handover Protocol** (Slide 8) | Mentioned under "What if I want to terminate?" No formal handover workflow table. | Low |

---

## Summary Assessment

| Aspect | Rating |
|---|---|
| Core domain coverage | **Strong** — all major business domains from the presentation have corresponding schema tables |
| Property type coverage | **Complete** — all 4 property categories represented |
| Legal workflow coverage | **Complete** — case types, PoA governance, and compliance checks align precisely |
| Operations coverage | **Complete** — tenancy, inspections, maintenance, support desk all modeled |
| Technology platform coverage | **Foundation laid** — session management, device registration, notifications ready for app development |
| Financial model coverage | **Mostly complete** — subscriptions and invoicing present; property-level expense tracking is a gap |
| Schema quality | **Well-structured** — proper use of UUIDs, audit timestamps, foreign keys, indexes, check constraints, triggers, and data integrity constraints |

---

## Conclusion

The database schema is a solid foundation that faithfully covers approximately 90% of the features described in the presentation. The gaps are mostly in secondary workflow features (annual audit scheduling, expense dashboards, construction oversight) rather than core domain areas. No code contradicts the presentation — the alignment is strong where coverage exists.

The primary next step is building the **application layer** (backend API, frontend, mobile app), as no application code exists yet. The schema is well-positioned to support that development.
