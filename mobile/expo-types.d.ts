// COMMITTED twin of the gitignored, generated expo-env.d.ts (which Expo says
// not to commit). Without this, `tsc --noEmit` fails on any clean checkout —
// CI, fresh git worktree — with TS2882 on the `import '../global.css'`
// side-effect import, because the expo/types reference (which declares CSS
// modules) only exists in the generated file. Duplicating the reference is
// harmless when both files are present. Broke CI from the SDK-56 upgrade
// (556606c) until this file landed; do not delete.
/// <reference types="expo/types" />
