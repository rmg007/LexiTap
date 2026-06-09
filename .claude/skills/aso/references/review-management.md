# Review Management — LexiTap

Reviews drive both **ranking** (rating weight) and **conversion** (star average + recent sentiment). Two jobs: (1) mine reviews for product + keyword signal, (2) respond well.

## Mining (competitors now, LexiTap after launch)
Use `WebSearch`/`WebFetch` on public App Store / Play review pages. Extract:
- **Recurring phrases** learners use → feed into keyword pools (`keyword-strategy.md`) and description copy. Real user wording out-converts marketing wording.
- **Top complaints** about competitors → positioning wedges (e.g. "too gamified", "needs internet", "subscription too expensive" all favor LexiTap).
- **Feature requests** → candidate roadmap items (file as GitHub Issues, the work queue).

Never fabricate review data. If you can't access live reviews, say so and state what you'd look for.

## Responding (after launch)
- **Respond to all 1–3★ promptly**, and to detailed 4–5★. Apple/Play both surface developer responses.
- **Tone:** warm, plain B1-readable English (your users are ESL). No corporate boilerplate.
- **Always:** thank → acknowledge the specific issue → state the fix or where it's tracked → invite follow-up. Never argue.
- A resolved complaint often gets the user to **update their rating** — ask gently once fixed.

### Response templates
**Bug / crash (1–2★):**
> Thanks for telling us — sorry this happened. We're fixing [specific issue] in the next update. If you can email [support] with your device, we'll make sure it's covered. We really appreciate your patience.

**Missing feature (2–3★):**
> Great suggestion — [feature] is now on our list. We build from learner feedback like this, so thank you. We'll post here when it ships.

**Pricing confusion (common — clarify the no-subscription model):**
> Just to clarify: LexiTap is free to learn, and exam packs are a **one-time** purchase — no subscription. If something charged unexpectedly, email [support] and we'll sort it out.

**Happy power user (4–5★):**
> Thank you — this means a lot. If LexiTap helped your English, a quick note on which feature helped most really helps other learners find us. Keep going! 🎯

## Rating prompt strategy (in-app, later)
- Trigger the native review prompt at a **positive moment** (e.g. just after a streak milestone or completing a session), never mid-task or after an error.
- Respect Apple's 3-prompts-per-365-days limit; gate behind genuine engagement.
- Never incentivize reviews (against store policy).

## Metrics to watch (real, not invented)
- Star average + **recent** (last-30-day) average — recency is weighted.
- Rating **volume** velocity around launch.
- Complaint **themes** over time → are fixes landing?
Track these from the real App Store Connect / Play Console dashboards — don't estimate them.
