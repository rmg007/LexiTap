# Memory and Documentation Architecture

---
title: Memory and Documentation Architecture
category: agent-docs
status: planned
phase: 0
priority: P0
updated: 2026-05-22
load_order: 13
tags: [memory, documentation, architecture, sqlite, markdown, bm25, audit, plans, decisions, constraints, retrieval]
---

> Load order: 13 of 14. PLANNED — NOT YET IMPLEMENTED. Load only when designing the memory system itself. Do not treat as existing infrastructure — nothing in this doc has been built yet.

## Table of Contents

- [Core Principles](#core-principles)
- [Why This Design](#why-this-design)
- [Directory Structure](#directory-structure)
- [Memory File Format](#memory-file-format)
- [Memory Operations](#memory-operations)
- [Deletion Policy](#deletion-policy-when-each-type-applies)
- [Retrieval Strategy](#retrieval-strategy)
- [Agent Access Modes](#agent-access-modes)
- [Layered Defense (Claude Code Era)](#layered-defense-claude-code-era)
- [Audit Log Format](#audit-log-format)
- [Plan Files (YAML)](#plan-files-yaml)
- [Migration Triggers](#migration-triggers-when-to-build-custom-agent)
- [Schema Versioning](#schema-versioning)
- [Validation Rules](#validation-rules)
- [Rebuild Procedure](#rebuild-procedure-rebuildmd)
- [What This Doc Specifies vs Defers](#what-this-document-specifies-vs-defers)
- [Implementation Phases](#implementation-phases-when-to-build)
- [Key Anti-Patterns](#key-anti-patterns-things-to-not-do)
- [Open Questions](#open-questions-for-future-resolution)
- [Success Criteria](#success-criteria)

---

# LexiTap Memory and Documentation Architecture

**Status:** Planning (not yet implemented — build begins Phase 1 Week 1)

**Purpose:** Specify how project memory, documentation, and agent context are stored and accessed over a 20-year horizon.

**Constraint:** Designed to work with Claude Code today, evolve to custom local agent in ~12 months.

---

## Core Principles

1. **Markdown is canonical.** All decisions, constraints, conventions, and bug fixes live as markdown files with YAML frontmatter. The database is a rebuildable index, never the source of truth.
2. **Tools are swappable.** Storage backend, search engine, and agent runtime can all be replaced without losing data. Interfaces define contracts; implementations are pluggable.
3. **Enforcement is layered.** No single mechanism is trusted absolutely. Multiple defenses catch drift at different stages.
4. **The right path is the easy path.** Tooling makes correct memory operations easier than incorrect ones. Path of least resistance wins.
5. **Recovery is always possible.** Markdown survives any backend failure. Index can be rebuilt from scratch at any time.
6. **Future-proof formats.** No proprietary formats, no vendor lock-in, no tools that might die before the project does.

---

## Why This Design

### Why not Notion?

Proprietary format, vendor lock-in, API may change or disappear. Notion is excellent for human collaboration but unsuitable as canonical agent memory.

### Why not pure markdown (Gemini/ChatGPT default)?

Does not scale beyond a few hundred entries. No structured search. Agents waste context loading entire files. No way to track relationships, supersession, or audit history.

### Why not pure database?

Vendor lock-in to the DB engine. Hard to read without tooling. Schema migrations risky over 20 years. Hard to inspect, debug, or hand off to humans or different agents.

### Why markdown + database hybrid?

- Markdown: portable, human-readable, AI-readable forever
- Database: fast search, structured queries, derivable from markdown
- Markdown survives anything; database is convenience
- Combination provides both longevity and performance

---

## Directory Structure

```
project-root/
│
├── docs/                              # Architecture, ADRs (stable reference)
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   ├── REBUILD.md                     # How to rebuild from scratch
│   └── adr/                           # Architecture Decision Records
│       ├── 001-clean-architecture.md
│       ├── 002-offline-first.md
│       ├── 003-cloud-sync-free.md
│       └── 004-memory-architecture.md
│
├── plans/                             # Phase task lists (YAML)
│   ├── schema.yaml                    # Plan schema definition + version
│   ├── 001-phase-1-mobile-mvp.yaml
│   ├── 002-phase-1-cloud-sync.yaml
│   └── 003-phase-2-validation.yaml
│
├── memory/                            # Project memory (canonical: MD, index: DB)
│   ├── decisions/                     # Decisions made
│   ├── constraints/                   # Limitations discovered
│   ├── conventions/                   # Established patterns
│   ├── bug-fixes/                     # Bugs + root causes
│   ├── preferences/                   # User preferences
│   ├── gotchas/                       # Surprises, library quirks
│   ├── archive/                       # Old/superseded memories
│   ├── audit.log                      # Append-only operation log
│   ├── index.db                       # Rebuildable SQLite index
│   └── retrieval/                     # Pluggable retrieval implementations
│       ├── interface.ts               # Contract definition
│       └── sqlite-bm25.ts             # Default implementation
│
├── scripts/
│   ├── memory-detect-mode.sh          # Detect access capability
│   ├── memory-write.ts                # Create memory entry
│   ├── memory-search.ts               # Query memory
│   ├── memory-update.ts               # Modify existing entry
│   ├── memory-delete.ts               # Soft/hard delete + archive
│   ├── memory-validate.ts             # Consistency check
│   ├── memory-rebuild.ts              # Rebuild index from markdown
│   └── memory-test-rebuild.ts         # Quarterly insurance test
│
├── .git/hooks/
│   ├── pre-commit                     # Catches drift at commit time
│   └── pre-push                       # Runs rebuild test before push
│
├── CLAUDE.md                          # Agent instructions
└── src/                               # Application code (LexiTap itself)
```

---

## Memory File Format

All memory entries are markdown files with YAML frontmatter.

### Example:

```markdown
---
id: 2026-05-22-cloud-sync-free
type: decision
created: 2026-05-22T13:00:00Z
updated: 2026-05-22T13:00:00Z
confidence: 5
tags: [cloud-sync, pricing, supabase, phase-1]
related_files:
  - docs/adr/003-cloud-sync-free.md
  - plans/002-phase-1-cloud-sync.yaml
supersedes: null
superseded_by: null
status: active
---

# Decision: Cloud Sync is FREE for All Users

## Summary
Cloud sync will be included free for all users, not gated behind a paywall.

## Context
User can export word lists, but export does NOT include progress data.
Losing device = losing months of progress = churn.

## Rationale
- Market standard (Duolingo, Quizlet, Anki)
- Cost: $0/month until 50K users, $25/month after
- Retention > server cost

## Consequences
- +1 week to Phase 1 timeline
- Supabase backend required
- Privacy policy needed before App Store submission

## Status
Active — confirmed by user 2026-05-22
```

### YAML Frontmatter Schema

| Field | Type | Required | Description |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| id | string | yes | Filename-safe ID, format: YYYY-MM-DD-slug |  |  |  |
| type | enum | yes | decision \ | constraint \ | convention \ | bug_fix \ |
| created | ISO 8601 | yes | When first written |  |  |  |
| updated | ISO 8601 | yes | Last modification time |  |  |  |
| confidence | 1-5 | yes | How certain we are (5 = locked in) |  |  |  |
| tags | string[] | no | Free-form tags for filtering |  |  |  |
| related_files | string[] | no | Paths to related project files |  |  |  |
| supersedes | string \ | null | no | ID of memory this replaces |  |  |
| superseded_by | string \ | null | no | ID of memory that replaced this |  |  |
| status | enum | yes | active \ | superseded \ | archived \ | obsolete |

---

## Memory Operations

Four core operations: write, search, update, delete.

### write_memory

Creates a new memory entry.

**Inputs:**

- type (required)
- title (required, used to generate ID)
- summary (required, 1-3 sentences)
- details (optional, full context)
- tags (optional)
- confidence (optional, default 5)
- related_files (optional)

**Behavior:**

1. Generate ID from date + slug of title
2. Validate frontmatter schema
3. Create markdown file in correct subdirectory
4. Update index DB
5. Append to audit.log
6. Return ID and file path

**Atomic guarantee:** File + index + audit happen together or all roll back.

### search_memory

Returns top-K relevant memories for a query.

**Inputs:**

- query (required)
- type (optional filter)
- tags (optional filter)
- limit (optional, default 5)
- include_archived (optional, default false)

**Behavior:**

1. Query index DB using BM25 (full-text search)
2. Apply filters (type, tags, status)
3. Return top K results with file paths, summaries, and relevance scores
4. Agent reads full markdown for top hits as needed

### update_memory

Modifies an existing memory entry.

**Inputs:**

- id (required)
- changes (required, partial frontmatter or body)
- reason (required, why the update)

**Behavior:**

1. Load existing markdown file
2. Apply changes to frontmatter and/or body
3. Update `updated` timestamp
4. Re-index in DB
5. Append to audit.log with reason

### delete_memory

Three types of deletion. None are silent.

**Inputs:**

- id (required)
- type: soft | hard | archive (required)
- reason (required)
- replacement_id (required if type=soft)

**Behavior by type:**

**soft (supersession):**

- File remains in place
- Status changed to `superseded`
- `superseded_by` field set to replacement_id
- New replacement memory's `supersedes` field set to this ID
- Excluded from default search
- Findable with `--include-superseded`

**archive:**

- File moved to `memory/archive/<type>/`
- Status changed to `archived`
- Index entry updated
- Excluded from default search
- Findable with `--include-archived`

**hard (rare, requires extra confirmation):**

- File physically removed
- Index entry removed
- Audit log entry retained permanently
- Reserved for: PII leaks, duplicates, junk
- Recoverable only via git history

---

## Deletion Policy (When Each Type Applies)

### Soft delete (supersession) — Most Common

- New decision overrides this one
- Constraint no longer applies (library upgraded, etc.)
- Convention changed
- Bug fix superseded by better fix

### Archive

- Memory is older than 1 year AND
- Has not been retrieved in 6+ months AND
- Is not referenced by active memories or plans

### Hard delete (rare)

- Duplicate of an existing memory (consolidate first)
- Junk created by agent error (no real content)
- PII or sensitive data leaked into memory
- Pre-launch test data cleanup

### Never delete

- Decisions still referenced by code
- Constraints still affecting current work
- Conventions still in active use
- ADRs in `docs/adr/` (immutable by design)

---

## Retrieval Strategy

### Default: BM25 via SQLite FTS5

- Built into SQLite, zero extra dependencies
- Excellent for keyword/identifier queries
- Fast at scale (sub-millisecond for thousands of entries)
- Sufficient for solo project up to several thousand memories

### Future enhancement: Hybrid (BM25 + embeddings)

- Add only if BM25 retrieval quality degrades
- Trigger: Manual evaluation shows <50% relevant top-K results
- Embedding provider: OpenAI text-embedding-3-small (cheap, no infra)
- Combine: take top 3 from each, deduplicate, return top 5
- Skip Reciprocal Rank Fusion until proven necessary

### Retrieval is behind an interface

```tsx
interface MemoryRetriever {
  search(query: string, options?: SearchOptions): Promise<MemoryHit[]>;
  rebuild(): Promise<void>;
}
```

Swap implementations without changing application code.

---

## Agent Access Modes

The agent detects its capability mode at the start of each task and uses the appropriate workflow.

### Mode Detection

Script: `scripts/memory-detect-mode.sh`

Returns one of:

- **full** — Native tool calls available (custom agent runtime)
- **scripts** — CLI scripts available (current Claude Code reality)
- **manual** — No tooling (broken or uninstalled state)

### Mode "full" (Year 2+ — Local Agent)

When the user's local agent is built (~12 months from now), the agent has direct tool access:

```
Agent calls write_memory(record)
  → Tool internally creates markdown + updates index atomically
  → Agent cannot bypass the tool
```

**Enforcement:** Hard. Tools enforce contract. Agent cannot drift.

### Mode "scripts" (Year 1 — Claude Code)

Claude Code's built-in tools (Write, Edit, Bash) cannot be replaced. Instead:

```
Agent runs: npm run memory:write -- --type=decision --title="..."
  → Script creates markdown + updates index
  → Agent could bypass and write files directly
```

**Enforcement:** Soft. Guidance + verification + git hooks + rebuild test.

### Mode "manual" (Fallback Only)

If tooling is missing or broken:

```
Agent must STOP and report to user:
  "Memory tooling unavailable. Required scripts missing.
   Should I (a) help install tooling, or (b) proceed without memory tracking?"
```

Agent does NOT write to memory/ directly under any circumstances in this mode.

### Migration Between Modes

When user builds local agent (Year 2):

1. Add new mode detection branch
2. [CLAUDE.md](../CLAUDE.md) gains new conditional section
3. Markdown files remain unchanged (canonical)
4. Index DB remains unchanged (rebuildable)
5. Only the agent runtime changes

The data layer survives the agent layer transition.

---

## Layered Defense (Claude Code Era)

Since Claude Code provides soft enforcement at best, five layers catch drift.

### Layer 1: [CLAUDE.md](../CLAUDE.md) Guidance

Well-crafted instructions with:

- Negative patterns ("if you find yourself doing X, STOP")
- Self-check prompts ("verify before proceeding")
- Explicit fallback ("if uncertain, ask user")

Not enforcement, but moves the needle significantly.

### Layer 2: Path-of-Least-Resistance Tooling

`npm run memory:write` must be simpler than manual file creation.

If the script:

- Auto-generates the ID
- Pre-fills frontmatter
- Opens editor with template
- Validates on save
- Updates index automatically

Then Claude takes the easy path = the correct path.

### Layer 3: Git Pre-Commit Hook

Commits that touch `memory/` are validated:

- Frontmatter schema check
- Index consistency check
- Audit log updated check

Drift caught at commit time. Latest point where fixing is still cheap.

### Layer 4: Continuous Validation

`npm run memory:validate` runs after any memory-touching task:

- MD files ↔ index entries match
- All frontmatter valid
- No orphans, no zombies
- Naming conventions followed

Agent is instructed to run this after every memory operation.

### Layer 5: Rebuild Test (Insurance)

Weekly/monthly:

- Delete index DB
- Rebuild from markdown
- Run test queries
- Verify expected results

Proves canonical store remains canonical. Catches accumulated drift.

---

## Audit Log Format

Append-only file: `memory/audit.log`

```
2026-05-22T13:00:00Z | WRITE | id=2026-05-22-cloud-sync-free | agent=claude-code | source=task-001
2026-05-22T13:15:00Z | UPDATE | id=2026-05-22-cloud-sync-free | field=confidence | from=4 to=5 | reason=user confirmed
2026-05-22T14:00:00Z | DELETE | id=2026-05-20-old-decision | type=soft | reason=superseded by 2026-05-22-cloud-sync-free
2026-05-23T09:00:00Z | REBUILD | entries=247 | duration=1.2s
2026-05-23T09:00:01Z | VALIDATE | result=pass | checks=8
```

**Properties:**

- Append-only (never edit existing lines)
- One line per operation
- Pipe-delimited for easy parsing
- Retained indefinitely
- Reviewed manually monthly

---

## Plan Files (YAML)

Task plans are versioned YAML, not markdown. Different format because:

- Tasks have structured state (status, dependencies, estimates)
- YAML is naturally queryable
- Diffs are precise (what changed in this commit)
- Schema can evolve with versioning

### Example: `plans/001-phase-1-mobile-mvp.yaml`

```yaml
schema_version: 1
phase: 1
title: "Phase 1: Mobile MVP with Cloud Sync"
start_date: 2026-06-01
estimated_duration_weeks: 6
status: pending

tasks:
  - id: setup-expo-project
    title: "Set up Expo project"
    estimate_hours: 4
    depends_on: []
    instructions: |
      1. npx create-expo-app LexiTap
      2. Configure TypeScript strict mode
      3. Set up ESLint and Prettier
    acceptance_criteria:
      - Expo project scaffolded
      - TypeScript strict mode enabled
      - npm run lint passes
    status: pending
    related_memories: []

  - id: setup-supabase
    title: "Set up Supabase project"
    estimate_hours: 3
    depends_on: [setup-expo-project]
    instructions: |
      1. Create new Supabase project
      2. Set up auth providers (email + Google)
      3. Run initial migration
    acceptance_criteria:
      - Supabase project created
      - Auth providers configured
      - Migration applied successfully
    status: pending
    related_memories:
      - 2026-05-22-cloud-sync-free
      - 2026-05-22-supabase-backend
```

Plan files describe WHAT to do, not HOW the agent runs. Runtime-agnostic.

---

## Migration Triggers (When to Build Custom Agent)

Move from Claude Code ("scripts" mode) to custom local agent ("full" mode) when ANY of:

| Trigger | Reasoning |
| --- | --- |
| Drift detected in >20% of tasks | Soft enforcement insufficient |
| Validation fails repeatedly | Manual oversight not scaling |
| You hand off project to others | Can't rely on personal vigilance |
| Year 2+ and project is alive | Worth investment for remaining 18 years |
| Multiple agents working simultaneously | Need true concurrency control |

When any trigger fires:

1. Add new mode to detection script
2. Implement custom tool layer (Claude API or other)
3. Update [CLAUDE.md](../CLAUDE.md) with new mode
4. Markdown and index remain unchanged
5. Validation continues across both modes

---

## Schema Versioning

All structured formats are versioned for safe evolution.

### Memory file format

- Version stored in YAML frontmatter (`schema_version: 1`)
- Migration scripts when schema changes
- Old versions remain readable forever

### Plan file format

- Version stored at top of YAML (`schema_version: 1`)
- New versions add fields, never remove
- Backward compatible by design

### Index DB schema

- Version stored in `meta` table
- Rebuild script handles any version
- Never edit DB schema by hand

---

## Validation Rules

`npm run memory:validate` checks:

### File-level:

- [ ]  Every file in `memory/{type}/` has valid YAML frontmatter
- [ ]  Frontmatter conforms to schema
- [ ]  Filename matches `id` field
- [ ]  File location matches `type` field
- [ ]  ISO 8601 dates are valid

### Index-level:

- [ ]  Every markdown file has matching index entry
- [ ]  Every index entry points to existing file
- [ ]  No orphans (files without index, index without files)

### Relationship-level:

- [ ]  If `supersedes` set, target memory exists and has `superseded_by` pointing back
- [ ]  If `superseded_by` set, target memory exists and has `supersedes` pointing back
- [ ]  No circular supersession chains
- [ ]  `related_files` paths actually exist

### Audit-level:

- [ ]  Recent operations in audit.log have corresponding files or index changes
- [ ]  No file modifications without audit entries (caught by git diff)

On validation failure:

- Detailed error report with line numbers and file paths
- Suggested fixes where possible
- Exit code non-zero (blocks commits via pre-commit hook)

---

## Rebuild Procedure ([REBUILD.md](../docs/REBUILD.md))

The project must be rebuildable from markdown alone.

### Quick rebuild (index lost or corrupted):

```bash
rm memory/index.db
npm run memory:rebuild
npm run memory:validate
```

### Full migration (changing backends):

1. Implement new `MemoryRetriever` for target backend
2. Update `memory/retrieval/config.ts`
3. Run `npm run memory:rebuild`
4. Run `npm run memory:validate`
5. Old backend files can be deleted

### Year-2046 scenario (no Node.js, no SQLite, unknown future stack):

1. The markdown files remain readable in any tool
2. Read frontmatter with any YAML parser
3. Build a new index using whatever search tech exists then
4. The data has not been lost

The markdown is the truth. Everything else is reconstruction.

---

## What This Document Specifies vs Defers

### Specifies now:

- Memory format (markdown + YAML)
- Directory structure
- Operation contracts (write, search, update, delete)
- Deletion policy (three types)
- Validation rules
- Audit log format
- Plan file format
- Mode detection mechanism
- Layered defense for Claude Code era
- Migration triggers for local agent
- Schema versioning approach

### Defers:

- Actual script implementation (no code yet)
- Custom local agent design (Year 2 decision)
- Vector search integration (only if BM25 proves insufficient)
- Multi-user/concurrent access patterns (solo project for now)
- Compression of historical audit logs (future optimization)

---

## Implementation Phases (When to Build)

The memory system itself has a build sequence. It does NOT need to exist on day 1.

### Build Order:

**Phase 1 (Week 1 of LexiTap project):**

- `memory/` directory structure
- `memory-write.ts` script (basic version)
- `memory-search.ts` script (basic version)
- `memory-validate.ts` script
- Initial [CLAUDE.md](../CLAUDE.md) with memory section
- Pre-commit hook

**Phase 2 (Week 4-6, after first 20-30 memories accumulated):**

- `memory-rebuild.ts` script
- `memory-test-rebuild.ts` (insurance)
- Audit log review process
- First validation rules tuned to actual usage

**Phase 3 (Month 3-6, as patterns emerge):**

- `memory-update.ts` script (deferred until needed)
- `memory-delete.ts` script (deferred until first deletion needed)
- Archive workflow
- Hygiene sweep cadence established

**Phase 4 (Year 2, when local agent is built):**

- Custom tool layer for native API access
- Mode "full" detection added
- Migration path from "scripts" mode

**Right-sized at each phase. No premature scaffolding.**

---

## Key Anti-Patterns (Things to NOT Do)

### Don't write to memory/ files directly

Always use scripts or tools. Direct file writes bypass validation, indexing, and audit.

### Don't use Notion (or similar SaaS) as canonical store

Vendor lock-in is incompatible with 20-year longevity. Notion is fine for human collaboration ONLY.

### Don't add vector search prematurely

BM25 is sufficient until proven otherwise. Adding embeddings adds: API dependency, costs, complexity, drift on model upgrades.

### Don't keep raw chat transcripts

They pollute search and inflate storage. Summaries only.

### Don't trust the agent to remember the policy

Validation, hooks, and rebuild tests exist because agents will drift. Defense in depth.

### Don't edit audit.log

Append-only. Editing breaks the audit trail.

### Don't delete memories without explicit reason

Soft-delete with supersession is almost always correct. Hard delete is rare.

### Don't introduce schema changes without versioning

Bump schema_version. Provide migration. Old data must remain readable.

---

## Open Questions (For Future Resolution)

1. **Vector search threshold:** What objective metric triggers adding embeddings? (Manual eval of retrieval quality? User-reported missed results?)
2. **Audit log retention:** Indefinite retention will grow large. Compression strategy? Annual rollup files?
3. **Plan file evolution:** How do completed plans get archived? Move to `plans/completed/`?
4. **Concurrent agents (future):** If/when multiple agents work simultaneously, what's the locking strategy?
5. **Cross-project memory:** If you build other apps later, should they share memory infrastructure? Or stay isolated?

These are deferred. The system works without resolving them.

---

## Success Criteria

This architecture is successful if:

- [ ]  In Year 5, all decisions made in Year 1 are still searchable
- [ ]  In Year 10, the index can be rebuilt from scratch in under 5 minutes
- [ ]  In Year 20, the markdown files remain readable by any text editor
- [ ]  Migration from Claude Code to custom agent doesn't lose any data
- [ ]  New collaborators (human or AI) can understand the system from `docs/REBUILD.md` alone
- [ ]  Validation catches >90% of drift incidents within 24 hours
- [ ]  No proprietary format dependencies anywhere in the canonical store
- [ ]  System works whether agent is Claude, GPT, Gemini, or local LLM

---

## References & Inspiration

- Markdown as canonical: standard in technical writing, used by every major dev platform
- ADRs (Architecture Decision Records): Michael Nygard's pattern
- Hexagonal architecture (already used in LexiTap codebase): allows swapping implementations
- SQLite as derived store: pattern used by Plex, Apple Photos, many desktop apps
- BM25 + FTS5: native SQLite full-text search
- Memory-augmented agents: research pattern from MemGPT and similar systems
- Pre-commit hooks: standard Git practice for guard rails

---

## Document Status

- **Created:** 2026-05-22
- **Status:** Planning (specification only, no code written)
- **Implementation begins:** Week 1 of LexiTap Phase 1
- **Next review:** After first 30 memories accumulated (~Week 4)
- **Custom agent migration target:** ~12 months (Year 2)