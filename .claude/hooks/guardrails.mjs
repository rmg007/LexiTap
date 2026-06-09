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

  process.exit(0);
}

function contentOf(tool, input) {
  if (tool === 'Write') return input.content || '';
  if (tool === 'Edit') return input.new_string || '';
  if (tool === 'MultiEdit') return (input.edits || []).map((e) => e.new_string || '').join('\n');
  return '';
}
