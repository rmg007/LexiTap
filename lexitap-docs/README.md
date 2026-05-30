---
title: LexiTap Docs Index
category: index
status: active
updated: 2026-05-24
priority: P0
tags: [index, docs, overview]
---

# LexiTap Docs — Full Product Documentation

Full research and product documentation. 8 categories, 41 non-README documents. This is the single canonical doc layer. Load from category READMEs, not directly from this index.

## Category Index

| Category | Path | Documents | Status |
|----------|------|-----------|--------|
| Discovery and Strategy | [./01-discovery-strategy/](./01-discovery-strategy/) | 5 | active |
| Product Definition | [./02-product-definition/](./02-product-definition/) | 6 | active |
| UX and Design | [./03-ux-design/](./03-ux-design/) | 5 | active |
| Technical Architecture | [./04-technical-architecture/](./04-technical-architecture/) | 7 | active |
| Engineering Process | [./05-engineering-process/](./05-engineering-process/) | 7 | active |
| Content and Data | [./06-content-data/](./06-content-data/) | 3 | active |
| Operations and Compliance | [./07-operations-compliance/](./07-operations-compliance/) | 5 | active |
| Financial and Legal | [./08-financial-legal/](./08-financial-legal/) | 4 | active |

## Status Token Legend

| Token | Meaning |
|-------|---------|
| planned | not yet written |
| draft | in progress |
| active | complete and current |
| archived | superseded |

## Canonical Source Map — "Which Doc Wins?"

When two docs conflict, this table determines precedence. Docs lower in the stack are authoritative for their concern; higher-level docs provide context.

| Concern | Canonical source | Defers to |
|---------|-----------------|-----------|
| Audience and out-of-scope | `02-product-definition/OUT_OF_SCOPE.md`, `PRODUCT_REQUIREMENTS_DOCUMENT.md` | Root `AGENTS.md` hard rules |
| Phase sequencing and milestones | `02-product-definition/ROADMAP.md` (canonical); root `ROADMAP.md` = at-a-glance mirror | — |
| UX behavior and flows | `03-ux-design/USER_FLOWS.md` and `screens/*.md` | `PRODUCT_REQUIREMENTS_DOCUMENT.md` for scope |
| Visual / design tokens | `03-ux-design/DESIGN_SYSTEM.md` | — |
| Database columns and invariants | `04-technical-architecture/DATABASE_SCHEMA.md` | Root `AGENTS.md` hard rules |
| Runtime type shapes | `04-technical-architecture/DATA_MODELS.md` | `DATABASE_SCHEMA.md` for column names |
| Cloud/API/RPC contracts | `04-technical-architecture/API_CONTRACT.md` | `SECURITY_MODEL.md` for trust rules |
| Trust and entitlement authority | `04-technical-architecture/SECURITY_MODEL.md` | Root `AGENTS.md` hard rules |
| Revenue compliance risk | `08-financial-legal/MONETIZATION_COMPLIANCE.md` | `SECURITY_MODEL.md` for technical boundary |
| Engineering agent rules | Root `AGENTS.md` → `05-engineering-process/AGENTS_CLAUDE.md` → `CODING_STANDARDS.md` | — |
| Content pipeline and sourcing | `06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md`, `SEED_DATA_SPEC.md` | `AGENTS.md` on no-TextInput rule |
| Analytics event taxonomy | `07-operations-compliance/ANALYTICS_PLAN.md` | `DATABASE_SCHEMA.md` for `event_log` invariants |

**Conflict resolution rule:** if a screen spec conflicts with `DATABASE_SCHEMA.md`, the schema wins. If both conflict with `AGENTS.md`, `AGENTS.md` wins. Screen specs can be more restrictive but never less restrictive than schema or security model.
