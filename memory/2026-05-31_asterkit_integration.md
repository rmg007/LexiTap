# AsterKit Rules Integration — 2026-05-31

**What:** Extracted all configuration, rules, preferences, and patterns from AsterKit (privacy-first period tracker) and integrated into LexiTap's CLAUDE.md and .claude/settings.json.

**Why:** Both projects share similar patterns (offline-first, privacy constraints, solo operator, multi-year codebase). Proven AsterKit workflows prevent work loss, ensure docs stay accurate, and streamline agent operations.

## What Was Added

### CLAUDE.md Expansions
- **Caveman mode** (default terse communication, ~75% token reduction)
- **Configuration in repo, not home folder** (everything in `.claude/`, no `~/.claude/projects/...`)
- **Agent workflow rules:** one task per session, memory in committed repo, feed raw data not summaries
- **High-Risk Paths** — confirmation required before editing: `mobile/src/infrastructure/db/`, `mobile/src/domain/srs/`, `mobile/src/application/paywall/`, `mobile/src/utils/storage.ts`, `mobile/app.config.ts`, `.env*`
- **Documentation rule:** every change must leave relevant docs accurate; test before moving on
- **Never lose work:** hard rules on PR merging, unpushed commits, pushed-commit frequency; Stop hook warns when HEAD ahead of upstream
- **Forbidden patterns:** analytics SDKs in production, crash SDKs (dev-only OK), persistent console.log, hardcoded secrets
- **Tech stack + storage model** documented
- **Release process** (JS fixes → EAS Update same-day; native → 5–6 weeks store review)

### .claude/settings.json (NEW)
- **Model:** Sonnet
- **Effort level:** high
- **Hooks:**
  - **Stop:** Reminds to update CLAUDE.md/AGENTS.md; warns if commits unpushed
  - **SessionStart:** Confirms git repo ready
- **Deny list:** Database, SRS, paywall, storage, app.config, .env files require confirmation before edit

### Adapted From AsterKit (Not Directly Ported)
- **Code-review-graph MCP:** Not added (LexiTap doesn't use; can be added if helpful)
- **17 custom slash commands:** Not ported (LexiTap's needs are different); can create project-specific ones
- **MCP servers:** Not added yet; can be configured per need

## Decision: What Fit, What Didn't

| AsterKit Pattern | LexiTap Fit | Why |
|---|---|---|
| Caveman mode | ✓ | Same audience (Ryan); same terse preference |
| Config in repo | ✓ | Same solo operator, laptop switching pattern |
| Hooks (Stop, SessionStart) | ✓ | Universal safeguards |
| Deny list for high-risk files | ✓ | Adapted to LexiTap's app structure (no native code, but DB/SRS/paywall critical) |
| Documentation rule | ✓ | Prevents agent hallucination; same risk |
| Never-lose-work rules | ✓ | Universal protection |
| Code-review-graph MCP | ✗ | LexiTap doesn't have it; can be added if useful |
| 17 custom commands | ✗ | AsterKit-specific (`/ship-ios`, `/crashes`, etc.); LexiTap will create its own as needed |
| Monorepo structure | ✗ | LexiTap is looser (content-tool, mobile, lexitap-docs); not a pnpm workspace |
| EAS versioning complexity | ✗ | Simplified for LexiTap (Expo managed, not bare workflow) |

## Clarifications Applied

After reviewing against LexiTap's actual architecture:

| Issue | Fix |
|-------|-----|
| Release Process assumed OTA for all fixes | Split into pre-release (store only) + post-release (OTA for JS fixes) |
| Secrets guidance vague | Clarified: local `.env` (dev) vs. EAS secrets (production builds) |
| Storage Model overstated | Kept as-is; matches AGENTS.md; implementation gaps are separate tasks |
| High-Risk Paths over-gated? | Kept focused; don't gate entire infrastructure layer |

Commits: `fd4c79b` (Release Process + Secrets clarification)

## Next Steps

1. **Test the hooks** — end a session and verify the Stop hook runs
2. **Try the deny list** — attempt to edit `mobile/src/infrastructure/db/` and confirm it requires approval
3. **Create project-specific commands** if needed (e.g., `/build-words-db`, `/deploy`, etc.) — add to `.claude/commands/`

## Files Modified
- `CLAUDE.md` — expanded from minimal redirect to full agent rulebook
- `.claude/settings.json` — created (shared, non-local config)
- This file — decision log

## Files NOT Modified
- `AGENTS.md` — preserved as-is (architecture rules still canonical)
- `.claude/settings.local.json` — preserved (user-local overrides, if any)
