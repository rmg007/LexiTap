#!/usr/bin/env node
/**
 * Self-test for guardrails.mjs — asserts the hook BLOCKS (exit 2) every
 * forbidden pattern and ALLOWS (exit 0) legitimate near-misses.
 *
 * Why this exists: the hook fails OPEN by design (any internal error → allow),
 * so a syntax error would silently disable ALL enforcement with no signal.
 * This runs in CI (.github/workflows/infra.yml) and can be run locally:
 *   node .claude/hooks/guardrails-selftest.mjs
 *
 * The forbidden literals live in THIS file (executed via node, never echoed
 * through a Bash command string) so the live hook never scans them.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'guardrails.mjs');

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const edit = (file_path, new_string) => ({ tool_name: 'Edit', tool_input: { file_path, new_string } });
const write = (file_path, content) => ({ tool_name: 'Write', tool_input: { file_path, content } });

// [event, expectedExit, label]
const CASES = [
  // --- secrets / broad-add (original rules) ---
  [bash('git add .env'), 2, 'stage .env blocked'],
  [bash('git add .env.example'), 0, 'stage .env.example allowed'],
  [bash('git add -A'), 2, 'broad-add -A blocked'],
  [bash('git add .'), 2, 'broad-add . blocked'],
  [bash('git add ORCHESTRATION.md ROADMAP.md'), 0, 'explicit-path add allowed'],
  [bash('git commit -a -m "x"'), 2, 'commit -a blocked'],
  [bash('git commit -m "x"'), 0, 'plain commit allowed'],
  // --- destructive git ops (2026-06-11 hardening) ---
  [bash('git push --force origin main'), 2, 'force-push blocked'],
  [bash('git push -f origin main'), 2, 'push -f blocked'],
  [bash('git push origin +main:main'), 2, 'refspec force-push blocked'],
  [bash('git push --force-with-lease origin feature'), 0, 'force-with-lease allowed'],
  [bash('git push --force-if-includes origin feature'), 0, 'force-if-includes allowed'],
  [bash('git push origin main'), 0, 'plain push allowed'],
  [bash('git push -u origin feature'), 0, 'push -u allowed'],
  [bash('git push origin --delete main'), 2, 'remote main deletion blocked'],
  [bash('git push origin --delete old-feature'), 0, 'remote feature deletion allowed'],
  [bash('git branch -D stale'), 2, 'branch -D blocked'],
  [bash('git branch -d merged-branch'), 0, 'branch -d allowed'],
  [bash('git worktree remove --force ../wt'), 2, 'worktree remove --force blocked'],
  [bash('git worktree remove ../wt'), 0, 'worktree remove allowed'],
  [bash('git stash clear'), 2, 'stash clear blocked'],
  [bash('git stash drop stash@{0}'), 2, 'stash drop blocked'],
  [bash('git stash list'), 0, 'stash list allowed'],
  // --- file-write rules (one per category) ---
  [edit('mobile/src/presentation/screens/QuizScreen.tsx', '<TextInput />'), 2, 'TextInput in quiz blocked'],
  [edit('mobile/src/presentation/screens/HomeScreen.tsx', '<TextInput />'), 0, 'TextInput outside quiz allowed'],
  [write('mobile/src/infrastructure/db/wordQueries.ts', 'db.exec(`SELECT * FROM words WHERE id = ${id}`)'), 2, 'SQL interpolation blocked'],
  [write('mobile/src/infrastructure/db/wordQueries.ts', "db.exec('SELECT * FROM words WHERE id = ?', [id])"), 0, 'parameterized SQL allowed'],
  [write('mobile/src/presentation/components/Badge.tsx', "const s = '\u{1F525}'"), 2, 'emoji in app UI blocked'],
  [write('mobile/src/presentation/components/Badge.tsx', "const s = 'fire' // a → b"), 0, 'arrow char in comment allowed'],
  [write('mobile/src/presentation/components/Badge.test.tsx', "const s = '\u{1F525}'"), 0, 'emoji in test file allowed'],
];

let failed = 0;
for (const [event, expected, label] of CASES) {
  const res = spawnSync('node', [HOOK], { input: JSON.stringify(event), encoding: 'utf8' });
  const got = res.status ?? -1;
  if (got !== expected) {
    failed++;
    console.error(`FAIL ${label}: expected exit ${expected}, got ${got}${res.stderr ? ` — ${res.stderr.trim()}` : ''}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${CASES.length} guardrail self-tests FAILED — the hook is not enforcing what it claims.`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} guardrail self-tests passed.`);
