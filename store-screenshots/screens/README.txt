Drop raw LexiTap simulator captures (PNG) here, then reference them by filename in deck.json.

The bundled deck.example.json expects:
01_quiz.png            - multiple-choice quiz mid-question, one option selected, no keyboard visible
02_srs.png             - review/quiz screen showing an SRS interval label ("See you in 3 days") or streak counter
03_offline.png         - app in active use with airplane mode / no connectivity indicator, progress visible
04_exam.png            - TOEFL/IELTS/GRE tier quiz content, or the locked/unlocked exam-pack tier cards
05_paywall.png         - paywall showing exam pack cards (TOEFL $9.99, IELTS $9.99, All-Exams Bundle $29.99), no subscription language
06_knowledge_map.png   - onboarding Knowledge Map reveal (Known/Learning/New segments + "Start learning" CTA)

Capture at the largest required size (6.9" iPhone) with a clean status bar (9:41, full battery,
no charging bolt):

xcrun simctl status_bar <UDID> override --time "9:41" --batteryState discharging --batteryLevel 100

Full screen intent + copy rationale for each shot: website/assets/SCREENSHOTS_SPEC.md (the canonical
plan this deck renders — update deck.json headlines there first if the copy changes).

After rendering, review the side-by-side showcase at out/index.html.
The default quick/all scripts render classic, fancy, and bold directions so Ryan can choose visually.
