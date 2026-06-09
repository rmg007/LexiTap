Review the current chat session and extract anything worth persisting. Update the relevant files below. Do NOT update a file if nothing in this session applies to it.

---

## Step 1 — Triage

Scan the full conversation. Identify:

- **Decisions made** — architectural, product, tooling, policy (e.g. "use X not Y", "defer Z until pre-launch")
- **Bugs found or fixed** — especially fragile areas, root causes, gotchas
- **Patterns learned** — API quirks, library behaviour, workarounds that will recur
- **Rules added or changed** — anything that should govern future agent behaviour
- **Completed work** — shipped features, migrations, deployments
- **Open questions / deferred work** — explicit deferrals or unresolved decisions
- **High-risk paths discovered** — new areas that need confirmation before editing

Ignore: routine implementation steps, exploratory dead-ends with no lasting lesson, anything already accurately reflected in existing docs.

---

## Step 2 — Write a session note (if warranted)

If the session contains decisions, bugs, or patterns worth remembering, create a new file:

```
memory/YYYY-MM-DD_<slug>.md
```

Use today's date. Slug = short kebab description (e.g. `2026-06-09_branch-rename`).

Format:

```markdown
## Session: <Title> (<date>)

**What happened:** 1–3 sentence summary.

**Decisions:**
- …

**Bugs / gotchas:**
- …

**Patterns / lessons:**
- …

**Deferred:**
- …
```

Only include sections that have content. No empty sections.

Then add an index entry in `memory/MEMORY.md` at the top of the file (below the header), following the existing format:

```markdown
## 🔧 Session: <Title> (<date>)

**[<Title> (<date>)](<filename>.md)** — one-line summary. Key outcomes. ✅/⚠️ as appropriate.
```

---

## Step 3 — Update CLAUDE.md (only if rules changed)

Update CLAUDE.md when:
- A new "never do X" or "always do Y" rule was established
- A high-risk path was discovered (add to the High-Risk Paths table + `.claude/settings.json` deny list)
- A forbidden pattern was added or clarified
- A tech stack decision changed
- The release process changed

Do NOT update CLAUDE.md for routine work, bug fixes that changed nothing architectural, or anything already accurately described.

Update the `*Last updated*` line at the bottom when you write.

---

## Step 4 — Update AGENTS.md (only if code patterns or schema changed)

Update AGENTS.md when:
- Database schema changed
- A new code pattern was established or an old one invalidated
- Payment/entitlement behaviour changed
- A new invariant was discovered that agents must respect

---

## Step 5 — Update ROADMAP.md (only if features shipped or deferred)

If the session completed a roadmap item or explicitly deferred one:
- Mark complete in `ROADMAP.md` (root) and `lexitap-docs/02-product-definition/ROADMAP.md`
- Use the existing status token conventions

---

## Step 6 — Report

After all writes, output a concise summary:

```
## /snip results

**Session note:** memory/YYYY-MM-DD_<slug>.md (created / skipped)
**CLAUDE.md:** updated / unchanged
**AGENTS.md:** updated / unchanged
**ROADMAP.md:** updated / unchanged
**Other:** <any other files touched>

Key extractions:
- …
- …
```

Caveman mode. Terse. No filler.
