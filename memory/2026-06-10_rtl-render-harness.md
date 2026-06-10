## Session: RTL render harness — install + code review (2026-06-10)

**What happened:** Installed @testing-library/react-native@12, wrote 3 render test files, proved harness RED on the motivating bug, closed issue #10. Then ran a full code review of the work.

**Decisions:**
- Use **RTL v12, not v13** — v13 requires React 19; repo is `react@18.3.1` / RN 0.76.9. Lock: `@testing-library/react-native@^12.9.0`. This constraint holds until the Expo/RN upgrade to React 19.
- Must explicitly add `react-test-renderer@18.3.1` to devDependencies — RTL's peer dep resolves to v19 by default and npm ERESOLVE-fails unless pinned.

**Bugs / gotchas:**
- `npm install @testing-library/react-native@^12.9.0` fails with ERESOLVE: RTL asks for `react-test-renderer >=16.8.0`, npm resolves to latest (v19), which conflicts with `react@18.3.1`. Fix: `npm install --save-dev @testing-library/react-native@^12.9.0 react-test-renderer@18.3.1` together in one command.
- `act()` warnings during RTL tests are cosmetic — they come from `react-native-reanimated`'s mocked rAF flushing after test teardown. Not failures. Do NOT add suppressions; they're harmless.
- `createMockServices` wraps handler functions in `{ execute: fn }` — pass the raw function, not `{ execute: fn }`. The `as unknown as () => Promise<T>` cast in tests is a TS type-annotation workaround only; runtime is correct.

**Code review findings (not yet fixed — follow-up work):**
- **BATCH fixture drift (confirmed):** `passiveRecognition.invariant.test.tsx` BATCH already diverged — shorter definitions (`'to take temporarily'` vs `'to take something to use temporarily'`) and different `exampleSentence` (`'She will _ soon.'`). The other two files match each other. Fix: extract `mobile/src/presentation/screens/__fixtures__/learnFixtures.ts` with a single shared `BATCH` + `makeWord`. Do this before the next person copy-pastes from the wrong file.
- **Multi-sense test only covers card 1:** `LearnCardScreen.render.test.tsx` multi-sense test checks senses on `BATCH[0]` only — never taps to cards 2/3. A regression where the sense cache broke on index > 0 would not be caught.
- **Invariant doesn't cover feedback phase:** `passiveRecognition.invariant.test.tsx` asserts immediately after `findByText('borrow')` (question phase). A `TextInput` added to the feedback overlay wouldn't be caught.
- **No `renderWithProviders` helper:** ThemeProvider + ServicesProvider inlined in every `render()` call (4+ sites). Adding a required provider (e.g. NavigationContext) means touching every test file. Extract a helper before the harness grows.

**Patterns / lessons:**
- RTL v12 render tests in this repo: wrap in `<ThemeProvider initialPreference="dark"><ServicesProvider value={services}>`. `initialPreference` must be explicit — `'system'` reads `useColorScheme()` which may throw in jsdom.
- For async screen renders (screens with a loading state + `useEffect`), always `await findByText(...)` before asserting — `queryByText` on a not-yet-resolved async state returns null and silently passes.
- `fireEvent.press` in RTL v12 + `jest-expo` is synchronous and state flushes before the next `fireEvent` call. No manual `act()` wrapping needed around individual `fireEvent` calls.
