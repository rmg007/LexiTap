---
phase: P3
domain: Monetization
priority: High
gateBy: A0 (EAS dev client)
dependsOn:
  - A0 (leave Expo Go)
  - ACCT-1 (developer accounts + Apple Paid Apps agreement)
  - REVCAT-1 (store products configured)
releaseCriteria:
  - ✓ All R1–R7 subtasks closed
  - ✓ RevenueCat SDK initializes + retrieves offerings on real device
  - ✓ Purchase flow works (initiate → complete → entitlement visible)
  - ✓ Entitlement checks gate exam pack content
  - ✓ Analytics: purchase_initiated, purchase_completed, refund logged
  - ✓ 160+ tests pass (mobile + content-tool)
---

# P-3: RevenueCat Integration Plan (R1–R7)

**Goal:** Implement RevenueCat B2C for exam packs + All-Exams bundle. One-time non-consumable purchases, per-pack entitlements (exam_toefl/ielts/gre/gmat/business) + all_exams superset. RevenueCat backend validates receipts; client checks entitlements before showing locked content.

**Architecture:**
- `STORE_PRODUCTS` in `tiers.ts` is the source of truth for SKUs + entitlements.
- `RevenueCatIapService` implements `IapService` port; container swaps StubIapService → production.
- Entitlement checks in `CheckTierAccessUseCase` → gate quiz content.
- Analytics via `AnalyticsService` (PostHog): purchase lifecycle events.

---

## Task Breakdown (R1–R7)

### **R1: SDK Setup & App Store Configuration**
**Effort:** M (2–3d, includes calendar latency) **Owner:** Ryan

**Subtasks:**
- **R1.1** Apple Paid Apps agreement + banking/tax forms (start early: 1–3d latency)
  - [ ] Sign into App Store Connect (team W8FZGT253G)
  - [ ] Accept "Paid Applications" agreement
  - [ ] Enter banking/tax info (if not already done for A1)
  - [ ] Verify "Ready for Sale" status before R2
- **R1.2** Google Play merchant account + banking
  - [ ] Ensure Google Play is enrolled (same Gmail as GCloud project)
  - [ ] Link merchant account + banking
  - [ ] Verify production environment selected
- **R1.3** Add `react-native-purchases` pod + expo plugin to mobile
  - [ ] `npm install react-native-purchases @react-native-purchases/expo-plugin`
  - [ ] Add to `app.config.ts` plugins array
  - [ ] Run `npx expo prebuild --clean` on iOS + Android (both must succeed)
  - [ ] Verify no new linking errors
- **R1.4** Create `REVENUECAT_INTEGRATION.md` with minimal example (see section below)
  - [ ] Initialization pattern
  - [ ] Error handling for offline / unconfigured SDK
  - [ ] Test mode (staging API key) vs production

**Acceptance:** Pod installs, `npx expo prebuild` succeeds, no new linking errors.

---

### **R2: RevenueCat Dashboard Setup**
**Effort:** S (4–6h) **Owner:** Ryan

**Subtasks:**
- **R2.1** Create RevenueCat project (organization "LexiTap")
  - [ ] Sign up / create project at `https://app.revenuecat.com`
  - [ ] Record public SDK keys (separate iOS + Android)
  - [ ] Create staging + production projects (1 each)
- **R2.2** Link iOS + Android apps
  - [ ] iOS: select bundle `com.lexitap.app`, link to App Store Connect app
  - [ ] Android: select package `com.lexitap.app`, link to Google Play app
  - [ ] Authorize RevenueCat to read App Store / Play API
- **R2.3** Import products from stores (maps SKUs)
  - [ ] Products → "Import from stores"
  - [ ] Select all 8 exam packs + bundle SKUs (STORE_PRODUCTS in tiers.ts)
  - [ ] Verify SKU mapping: `com.lexitap.exam.toefl` etc.
  - [ ] Confirm all 8 products appear in dashboard
- **R2.4** Create entitlements (grants on purchase)
  - [ ] Entitlements → New: `exam_toefl`, `exam_ielts`, `exam_gre`, `exam_gmat`, `exam_business`, `all_exams`
  - [ ] Map exam packs → their entitlements (1:1)
  - [ ] Map all SKUs + upgrades → `all_exams` entitlement
- **R2.5** Create default Offering
  - [ ] Offerings → New: `default` (or use auto-generated)
  - [ ] Add all 8 products to the offering
  - [ ] Verify order + currency
- **R2.6** Store API keys as EAS secrets
  - [ ] `eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS --value <ios-public-key>`
  - [ ] `eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID --value <android-public-key>`
  - [ ] Confirm EAS secrets list shows both

**Acceptance:** Dashboard configured, all 8 products + 6 entitlements visible, default offering live, API keys secure.

---

### **R3: Install SDK & Initialize**
**Effort:** M (1–2d) **Owner:** Ryan

**Subtasks:**
- **R3.1** Configure Purchases in app entrypoint (`mobile/src/App.tsx` or early init)
  - [ ] Import `Purchases` from `react-native-purchases`
  - [ ] Call `Purchases.configure({ apiKey: getApiKey() })`
  - [ ] Wrap in try-catch, log errors (never throw in init)
  - [ ] Verify calls `configure` only once (use a module-level flag or React hook)
- **R3.2** Implement `getApiKey()` helper (env-gated, fail-closed)
  - [ ] Return `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` on iOS, `_ANDROID` on Android
  - [ ] Return `null` if key is unset → stub fallback (no-op, logs warning)
  - [ ] Document: keys come from EAS secrets
- **R3.3** Add error boundary for SDK failures
  - [ ] Wrap `Purchases.configure()` in try-catch
  - [ ] Log error details (never leak API keys)
  - [ ] Set a "isSdkReady" flag → fallback to stub behavior if false
  - [ ] Test offline (disable network) → graceful degradation
- **R3.4** Verify on real device (physical iOS + Android)
  - [ ] Install EAS dev build on iOS device
  - [ ] Install EAS dev build on Android device
  - [ ] Open app logs → confirm no SDK errors
  - [ ] Confirm `Purchases.configure()` completed

**Acceptance:** SDK initializes without error on real device, graceful fallback if offline / unconfigured.

---

### **R4: RevenueCatIapService Implementation**
**Effort:** M (2–3d) **Owner:** Ryan

**Subtasks:**
- **R4.1** Create `RevenueCatIapService` class implementing `IapService` port
  - [ ] New file: `mobile/src/infrastructure/iap/RevenueCatIapService.ts`
  - [ ] Implement `getProducts(skus)` → `Purchases.getOfferings()` → map to `IapProduct[]`
  - [ ] Implement `purchase(sku)` → `Purchases.purchasePackage()` → return `PurchaseResult`
  - [ ] Implement `restorePurchases()` → `Purchases.getCustomerInfo()` → extract & return
  - [ ] Implement `validateReceipt(token)` → **stub for now** (RevenueCat backend validates; see R6)
  - [ ] Handle errors: user cancelled, network, unknown
  - [ ] Log purchase events (sku, status, timestamp)
- **R4.2** Add `getActiveEntitlements()` / `getCustomerInfo()` methods (port extension)
  - [ ] Add to `IapService` interface
  - [ ] `getActiveEntitlements()` → queries `Purchases.getCustomerInfo()`, extracts entitlements
  - [ ] Used by R5 access checks; critical for gating
- **R4.3** Handle purchase statuses
  - [ ] `'purchased'` → success, receipt token stored
  - [ ] `'pending'` → Ask-to-Buy (child), receipt pending parent approval
  - [ ] `'cancelled'` → user backed out
  - [ ] `'error'` → network / store error, message logged
- **R4.4** Add unit tests
  - [ ] Mock `Purchases` (jest)
  - [ ] Test happy path: `getProducts()` → maps offerings correctly
  - [ ] Test purchase: returns correct `PurchaseResult`
  - [ ] Test restore: returns list of purchased SKUs
  - [ ] Test error handling: offline, SDK not configured, invalid SKU
- **R4.5** Container integration
  - [ ] Create `createRevenueCatIapService()` factory
  - [ ] Swap `StubIapService` → `RevenueCatIapService` in container (conditional on SDK ready)
  - [ ] Keep `StubIapService` for tests + offline fallback
  - [ ] Update `.claude/settings.json` high-risk deny to include iap/ path

**Acceptance:** Service implements IapService, all methods tested, container swaps stub→revcat, 160+ tests pass.

---

### **R5: Entitlement Checks in Content Access**
**Effort:** M (1–2d) **Owner:** Ryan

**Subtasks:**
- **R5.1** Create `CheckTierAccessUseCase` 
  - [ ] New domain use case: takes `(tierId) → boolean` (has access)
  - [ ] Logic: `isFree(tier) OR owns(tier.entitlementId) OR owns('all_exams')`
  - [ ] Calls `iapService.getActiveEntitlements()` (from R4.2)
  - [ ] Caches entitlements (short TTL, e.g., 5min) to avoid repeated queries
- **R5.2** Integrate with quiz/word flow
  - [ ] Before showing quiz content for a tier, call `checkTierAccess(tierId)`
  - [ ] If false → show paywall (existing `PaywallScreen` component)
  - [ ] Pass `tier` metadata (displayName, description, price) to paywall
- **R5.3** Update paywall to initiate purchase
  - [ ] Button "Unlock TOEFL" → calls `iapService.purchase(tier.sku)`
  - [ ] Show loading state
  - [ ] On success → refresh entitlements, dismiss paywall, resume quiz
  - [ ] On cancel → return to tier list
  - [ ] On error → show error toast + retry option
- **R5.4** Add analytics (see R5, duplicated here for clarity)
  - [ ] Event `paywall_shown` (tierId, reason: 'locked' | 'retrigger')
  - [ ] Event `purchase_initiated` (sku, tierId)
  - [ ] Event `purchase_completed` (sku, revenue, currency) — **only on success**
  - [ ] Event `purchase_cancelled` (sku)
  - [ ] Event `purchase_error` (sku, error) — sanitize error
- **R5.5** Add tests
  - [ ] `CheckTierAccessUseCase`: free tier → always true
  - [ ] Exam pack tier + user owns entitlement → true
  - [ ] Exam pack tier + user owns all_exams → true
  - [ ] Exam pack tier + user owns nothing → false
  - [ ] SDK offline → fallback (assume false, show paywall)
  - [ ] Quiz screen: locked tier → paywall shows
  - [ ] Paywall purchase → on success, refreshes access

**Acceptance:** Locked content blocked by paywall, purchase flow works, 160+ tests pass.

---

### **R6: Receipt Validation (Backend)**
**Effort:** S (4–6h) **Owner:** Ryan

**Subtasks:**
- **R6.1** Document that RevenueCat validates on backend
  - [ ] Add comment to `RevenueCatIapService.validateReceipt()`: "RevenueCat validates server-side; client does not verify."
  - [ ] Link to RevenueCat docs: `https://docs.revenuecat.com/docs/receipts`
- **R6.2** Stub `validateReceipt()` in service
  - [ ] For now, always return `{ isValid: true, entitledSkus: [] }`
  - [ ] Document: "Receipt validation is delegated to RevenueCat backend; not checked client-side."
  - [ ] Mark as **deprecated** in code (no client callers needed post-R5)
- **R6.3** Configure RevenueCat webhook (optional, for future B2B)
  - [ ] Document in REVENUECAT_INTEGRATION.md: webhook URL for refund handling
  - [ ] Deferred to B2B phase (R7 covers refunds in principle)

**Acceptance:** `validateReceipt()` stubbed, tests pass, no client-side validation needed.

---

### **R7: Refund Handling & Entitlement Revocation**
**Effort:** M (1–2d, deferred post-launch) **Owner:** TBD (Phase 3+ or Phase 4)

**Subtasks:**
- **R7.1** Document refund policy in privacy/help
  - [ ] Refunds processed by Apple / Google, not RevenueCat
  - [ ] User can refund in App Store / Play Store
  - [ ] On refund, entitlement is removed (store → RevenueCat → client, next check)
- **R7.2** Add webhook endpoint for refund notifications (deferred)
  - [ ] RevenueCat → Supabase Edge Function → log refund
  - [ ] Not needed for launch (entitlements refresh on app restart)
  - [ ] Post-launch: implement to revoke in-session if user refunds during active play
- **R7.3** Implement entitlement refresh on refund (server-side, async)
  - [ ] Background job or webhook trigger
  - [ ] Call RevenueCat API, fetch customer info, update user.entitlements
  - [ ] Deferred: may not ship in P3 (revocation on next app open sufficient)
- **R7.4** Handle mid-session revocation gracefully
  - [ ] If user refunds while quiz is playing, next content request fails
  - [ ] Show "This content is no longer available" → paywall offer re-unlock
  - [ ] Deferred to Phase 4 (post-launch polish)

**Acceptance:** Refund behavior documented, graceful fallback on next app open, deferred work tracked in ROADMAP.md.

---

## Deliverables

| File | Owner | Status |
|------|-------|--------|
| **plans/P3_REVENUECAT_PLAN.md** | Ryan | This doc |
| **mobile/REVENUECAT_INTEGRATION.md** | Ryan | Code examples (see below) |
| **mobile/src/infrastructure/iap/RevenueCatIapService.ts** | Ryan | Implementation (R4) |
| **mobile/src/domain/tier/CheckTierAccessUseCase.ts** | Ryan | Access check logic (R5) |
| **mobile/src/presentation/screens/PaywallScreen.tsx** | Ryan | Purchase UI (R5) |
| **.claude/settings.json** | Ryan | Add `mobile/src/infrastructure/iap/` to deny-list (R4.5) |

---

## Dependencies & Risk

| Dep | Status | Blocker? | Mitigation |
|-----|--------|----------|------------|
| **A0** (EAS dev client) | Critical | YES | RevenueCat native SDK won't run in Expo Go; A0 must ship first (already done) |
| **ACCT-1** (developer accounts) | In progress | YES | Apple Paid Apps agreement + banking latency (1–3d); start immediately |
| **REVCAT-1** (store products) | Pending | YES | SKUs must be created in App Store / Play before R2 dashboard setup |
| **New Arch compat** | Unverified | MEDIUM | RevenueCat + Google Sign-In (AU2) + Apple auth need testing on `newArchEnabled:true`; confirm at R1.3 prebuild step |
| **Magic-link deep linking** | Unverified | MEDIUM | AU2 will wire magic-link deep-links; test in dev client (expo-linking fiddly) |

---

## Success Criteria (Release Gate)

- [ ] `npm run check` passes (160+ tests)
- [ ] EAS dev build installs on physical iOS + Android
- [ ] On first open, `Purchases.configure()` completes without error
- [ ] Paywall appears when locked tier is tapped
- [ ] Purchase flow succeeds (user owns exam pack entitlement post-purchase)
- [ ] Entitlement check blocks access before purchase, allows after
- [ ] Analytics events logged: purchase_initiated, purchase_completed, purchase_cancelled
- [ ] All 8 SKUs + 6 entitlements configured in RevenueCat dashboard
- [ ] EAS secrets for API keys are set
- [ ] REVENUECAT_INTEGRATION.md documents init + error handling

---

## Timeline

| Phase | Task | Duration | Dependency |
|-------|------|----------|------------|
| **Week 1** | R1 (SDK + store config) | 2–3d | A0, ACCT-1 |
| | R2 (RevenueCat dashboard) | 4–6h | R1 |
| **Week 2** | R3 (SDK init) | 1–2d | R1, R2 |
| | R4 (IapService impl) | 2–3d | R3 |
| **Week 3** | R5 (Entitlement checks + paywall) | 1–2d | R4 |
| | R6 (Receipt validation) | 4–6h | R4 |
| | R7 (Refunds, deferred) | — | Post-launch |

**Critical path:** A0 → ACCT-1 → R1 (calendar latency) → R2 → R3 → R4 → R5.

**Parallel:** AU1–AU3 (auth) can start in parallel with R1–R4, but R5 (paywall) + auth (sign-in) together unblock P3 release.

---

## Notes

### RevenueCat vs Expo-IAP
- **RevenueCat chosen** per `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md`
  - Managed receipt validation (no backend work)
  - Built-in analytics + entitlement management
  - Cross-platform (iOS + Android identical API)
- **Expo-IAP** abandoned: no entitlements, manual receipt validation, less mature

### One-Time Non-Consumable Model
- No subscriptions; all products are **one-time non-consumable**
- Entitlements persist forever (user owns permanently)
- RevenueCat tracks in `CustomerInfo.entitlements` (not expiring)
- Free tiers (Foundation, Advanced, Common 3K/9K) carry no product

### Pricing
- Exam packs: **$9.99 each** (TOEFL, IELTS, GRE, GMAT, Business)
- All-Exams bundle: **$29.99** (covers all exams + future ones)
- Upgrade SKUs: **$19.99 / $9.99** (priced relative to bundle: `$29.99 - paid`)

### Analytics
- PostHog integration (existing in app)
- Events: `purchase_initiated`, `purchase_completed` (revenue), `purchase_cancelled`, `purchase_error`, `paywall_shown`
- No PII in events (anon_id only per analytics policy)

### Auth Integration (AU2)
- RevenueCat allows anonymous purchases (default)
- After sign-in, call `Purchases.logIn(supabaseUserId)` to alias IDs
- Enables multi-device entitlement restore (owner's account, not anonymous)
- Can ship RevenueCat *before* auth (will be wired in R5 if AU2 is ready)

---

*Created: 2026-05-31 · Status: Ready to execute (A0 + ACCT-1 prerequisites)*
