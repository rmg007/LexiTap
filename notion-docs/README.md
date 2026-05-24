# LexiTap — Notion Docs Index

**14 documents. Load SESSION_STATE.md first. Everything else is on-demand.**

Agent entry point: always start with `SESSION_STATE.md`. It tells you what's decided, what's open, and what to load next. You do not need to load all 14 docs — SESSION_STATE.md will route you.

---

## Document Map

| # | File | Category | Status | When to Load |
|---|------|----------|--------|--------------|
| 1 | [SESSION_STATE.md](./SESSION_STATE.md) | strategy | **active** | Always — load first |
| 2 | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | strategy | active | After session state; has full doc index |
| 3 | [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) | agent-docs | active | Before every coding task |
| 4 | [ARCHITECTURE.md](./ARCHITECTURE.md) | agent-docs | active | When touching new components or layers |
| 5 | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | technical | active | Any DB/schema/migration work |
| 6 | [CONTENT_PIPELINE_ARCHITECTURE.md](./CONTENT_PIPELINE_ARCHITECTURE.md) | technical | active | Track A (content CLI) work |
| 7 | [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) | strategy | active | Pricing, positioning, scope decisions |
| 8 | [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | strategy | active | Phase planning, timelines |
| 9 | [PLANNING_BACKLOG.md](./PLANNING_BACKLOG.md) | strategy | active | Checking triggers, planning next work |
| 10 | [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) | strategy | draft | Positioning/feature decisions; pairs with PRODUCT_STRATEGY.md |
| 11 | [BRAND_IDENTITY.md](./BRAND_IDENTITY.md) | marketing | active | Marketing copy, visual design, App Store |
| 12 | [WEBSITE_TEACHER_REFERRAL.md](./WEBSITE_TEACHER_REFERRAL.md) | marketing | active | Website, teacher referral, IAP integration |
| 13 | [MEMORY_DOCUMENTATION_ARCHITECTURE.md](./MEMORY_DOCUMENTATION_ARCHITECTURE.md) | agent-docs | **planned** | Designing the memory system only — NOT YET BUILT |
| 14 | [SESSION_STATE_V1_HISTORICAL.md](./SESSION_STATE_V1_HISTORICAL.md) | strategy | **archived** | Historical research only — DO NOT load in normal sessions |

---

## Status Tokens

| Token | Meaning |
|-------|---------|
| `active` | Current, accurate, load freely |
| `draft` | In progress — content is being added (Competitive Analysis) |
| `planned` | Specified but not yet built (Memory Architecture) |
| `archived` | Superseded — do not load unless researching history |

---

## Searchability Notes

- All files have YAML frontmatter with `tags` for keyword filtering
- All H1 headings are emoji-free — `grep` works directly on section names
- Files >300 lines have a Table of Contents immediately after the frontmatter
- Cross-references use relative paths (e.g., `./AGENTS_MOBILE_CONVENTIONS.md`), not Notion URLs
- `status: archived` files should be excluded from default agent search scopes

---

## Key Constraints (Quick Reference)

- No `TextInput` in quiz flows — tap only
- No hardcoded secrets — `.env` in dev, EAS secrets in production
- No web app at launch — mobile-first only
- No AI chatbot at MVP
- No specific word count commitments in copy
- SRS must have forgiveness mechanics before Phase 1 ships
- All DB queries on active words must filter `WHERE deleted_at IS NULL`
- `quiz_attempts` and `event_log` are append-only — never UPDATE or DELETE
- Target audience: global ESL learners only (non-native English speakers)
- American-student vocab is a separate product — not LexiTap, not this chat
