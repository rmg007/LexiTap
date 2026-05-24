---
title: Technical Architecture
category: technical
status: active
updated: 2026-05-24
priority: P0
tags: [architecture, database, api, security, infrastructure, index]
---

# Technical Architecture — Document Index

System architecture, tech stack decisions, database schema, API contract, data models, infrastructure, and security model for LexiTap, at decision-grade depth.

| File | Title | Priority | Status | Description |
|------|-------|----------|--------|-------------|
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | System Architecture | P0 | active | Hexagonal/clean layers, the inward dependency rule, two-DB ATTACH strategy, offline-first data flow, app-agnostic design. |
| [TECH_STACK_DECISIONS.md](./TECH_STACK_DECISIONS.md) | Tech Stack Decision Doc | P0 | active | Decision records for Expo, TypeScript, expo-sqlite, Supabase, no-server, EAS, TTS, state libs — with alternatives rejected. |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Database Schema | P0 | active | Full v2.1 schema: every table, indexes, soft-delete + append-only rationale, ATTACH strategy, Supabase sync mirrors, migrations. |
| [API_CONTRACT.md](./API_CONTRACT.md) | API Contract and Supabase Interface | P1 | active | Supabase auth, sync push/pull, receipt/referral/promo RPCs, request/response shapes, error model, retry semantics. |
| [DATA_MODELS.md](./DATA_MODELS.md) | Data Models and Domain Entities | P1 | active | TypeScript domain types, repository interfaces (ports), and DB-row-to-domain mapping. |
| [INFRASTRUCTURE_DIAGRAM.md](./INFRASTRUCTURE_DIAGRAM.md) | Infrastructure Diagram | P2 | active | Component diagram (app, bundled DB, Supabase, EAS, content CLI, referral portal) and $144 budget constraints. |
| [SECURITY_MODEL.md](./SECURITY_MODEL.md) | Security Model | P0 | active | Secrets (.env + EAS), Supabase RLS policies, receipt validation, auth, data-at-rest, threat model for a $144 solo app. |
