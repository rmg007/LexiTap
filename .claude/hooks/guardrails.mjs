#!/usr/bin/env node
/**
 * LexiTap PreToolUse guardrail hook.
 *
 * Enforces the AGENTS.md "hard rules" + hard-won session lessons as ACTUAL
 * blocks at the tool-call boundary — not just prose an agent can ignore.
 * Registered in .claude/settings.json (PreToolUse, matcher Bash|Edit|Write|MultiEdit).
 *
 * Mechanism: reads the PreToolUse event JSON on stdin.
 *   exit 2  → BLOCK the tool call; stderr text is shown to the agent.
 *   exit 0  → allow.
 * Fails OPEN: any internal error → exit 0. A bug in this hook must never
 * block legitimate work.
 *
 * Travels in the repo (no per-machine plugin install) — same enforcement
 * everywhere, which is the whole point of "all config lives in the repo".
 */

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  try {
    run(JSON.parse(raw || '{}'));
  } catch {
    process.exit(0); // never block on a parse/internal error
  }
});

function block(msg) {
  process.stderr.write(`⛔ LexiTap guardrail — ${msg}\n`);
  process.exit(2);
}

function run(ev) {
  const tool = ev.tool_name;
  const input = ev.tool_input || {};

  if (tool === 'Bash') return checkBash(input.command || '');
  if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') {
    return checkFileWrite(input.file_path || '', contentOf(tool, input));
  }
  process.exit(0);
}

function checkBash(cmd) {
  // Never commit secrets. (CLAUDE.md / AGENTS.md: .env is never committed.)
  if (/git\s+add\b[^&|;]*\.env(?!\.example)\b/.test(cmd)) {
    block('refusing to `git add` a .env file — secrets are never committed. Stage explicit non-secret paths instead.');
  }
  // Hard-won lesson (memory: concurrent-session entanglement): never broad-add.
  if (/git\s+add\s+(-A|--all|\.)(\s|$)/.test(cmd)) {
    block('`git add -A` / `git add .` is forbidden — it entangles concurrent sessions and risks staging secrets/scratch. Stage explicit paths.');
  }
  if (/git\s+commit\s+(-[a-z]*a[a-z]*\b|--all\b)/.test(cmd)) {
    block('`git commit -a` is forbidden — it stages everything. Use `git add <paths>` then `git commit`.');
  }
  // Destructive git ops (2026-06-11 GitHub-workflow hardening). The server-side
  // ruleset `protect-main` is the real gate for main; these give fast local
  // feedback and also cover non-main refs. NOTE: whole-command scan — a commit
  // message quoting these literals must go through `git commit -F <file>`.
  if (/git\s+push\b[^&|;]*(--force(?!-with-lease|-if-includes)\b|\s-f\b|\s\+\S+)/.test(cmd)) {
    block('force-push is forbidden — it rewrites shared history (the protect-main ruleset blocks it server-side too). If a branch truly needs it, use --force-with-lease on a NON-main branch with Ryan’s explicit go-ahead.');
  }
  if (/git\s+push\b[^&|;]*(--delete\s+main\b|\s:main\b)/.test(cmd)) {
    block('deleting the main ref is forbidden.');
  }
  if (/git\s+branch\s+-[a-zA-Z]*D[a-zA-Z]*\b/.test(cmd)) {
    block('`git branch -D` force-deletes possibly-unmerged work — use `git branch -d` (refuses unmerged). If -d refuses, the branch may hold real work (or be a squash-merge false negative): check `git log main..<branch>` and ask Ryan.');
  }
  if (/git\s+worktree\s+remove\b[^&|;]*(--force\b|\s-f\b)/.test(cmd)) {
    block('`git worktree remove --force` destroys uncommitted work in the worktree — inspect/commit it first, then remove without --force. A dirty worktree may be an ACTIVE parallel session.');
  }
  if (/git\s+stash\s+(clear\b|drop\b)/.test(cmd)) {
    block('`git stash clear`/`drop` destroys stashed work — inspect with `git stash show -p` first and get Ryan’s confirmation. Better: never leave work in a stash (commit to a branch).');
  }
  process.exit(0);
}

function checkFileWrite(file, text) {
  // Passive-recognition UX: no TextInput in quiz/assessment screens. (AGENTS.md)
  const passiveUx =
    /presentation\/screens\/QuizScreen\.tsx$/.test(file) ||
    /presentation\/screens\/quiz\//.test(file) ||
    /presentation\/components\/assessments\//.test(file);
  if (passiveUx && /\bTextInput\b/.test(text)) {
    block(`TextInput is forbidden in ${file} — passive recognition only (tap/drag/match/classify). See AGENTS.md.`);
  }

  // Parameterized SQL only — never string-interpolate in db query functions. (AGENTS.md)
  if (/infrastructure\/db\//.test(file) && /(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|\bFROM\b|\bWHERE\b|\bVALUES\b)[^`'"\n]*\$\{/i.test(text)) {
    block(`interpolated SQL detected in ${file} — use parameterized queries (\`?\` placeholders), never \`\${...}\`. See AGENTS.md.`);
  }

  // No emoji in the mobile app UI source. (Ryan, 2026-06-10: hard rule.)
  // Emoji-as-icons render inconsistently across platforms/OS versions and fail
  // the Figma design-system "emoji 0" gate. Use the Icon component
  // (src/presentation/components/Icon.tsx — authentic Lucide glyphs) instead.
  // Scope: mobile src/ + app/ .ts(x), excluding tests. Pictographic ranges ONLY
  // — the `→`/`↔` arrows (U+2190–21FF) and `─` box-drawing (U+2500) used in
  // caveman-mode comments are deliberately NOT matched.
  const mobileUiSource = /mobile\/(src|app)\/.*\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file);
  if (mobileUiSource) {
    // Pictographic emoji ranges: misc-symbols/dingbats (2600–27BF, incl ✓✕♪❄),
    // misc-symbols-and-arrows (2B00–2BFF, incl ⭐), symbols & pictographs +
    // emoji (1F300–1FAFF, incl 🔥📚📖), and the FE0F variation selector.
    // Excludes 2190–21FF (→ ↔) and 2500–257F (─) by design.
    const emoji = text.match(/[\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F300}-\u{1FAFF}\u{FE0F}]/u);
    if (emoji) {
      block(
        `emoji "${emoji[0]}" (U+${emoji[0].codePointAt(0).toString(16).toUpperCase()}) is forbidden in ${file} — no emoji in the app UI. Use the Icon component (Lucide glyphs) or plain text. (Hard rule.)`,
      );
    }
  }

  process.exit(0);
}

function contentOf(tool, input) {
  if (tool === 'Write') return input.content || '';
  if (tool === 'Edit') return input.new_string || '';
  if (tool === 'MultiEdit') return (input.edits || []).map((e) => e.new_string || '').join('\n');
  return '';
}
