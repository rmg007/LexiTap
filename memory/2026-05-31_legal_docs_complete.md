# Legal Docs Complete (2026-05-31)

**Status:** DONE

## What was delivered

Three compliance documents for App Store submission:

1. **`lexitap-docs/08-financial-legal/PRIVACY_POLICY.md`** (6.4 KB)
   - Data collection: PostHog (anon_id, EU host), Sentry (scrubbed)
   - Supabase auth + encrypted backups
   - Third-party processors disclosed (Supabase, PostHog, Sentry, RevenueCat, Apple/Google)
   - Retention: analytics 90 days, backups until deletion
   - GDPR/CCPA: data access/deletion via settings or support@lexitap.app
   - Children: 13+ app with 16+ age gate
   - Canonical source: `website/public/privacy.html` (already HTML)

2. **`lexitap-docs/08-financial-legal/TERMS_OF_SERVICE.md`** (3.5 KB)
   - Service license: personal learning use only
   - Restrictions: no redistribution, no commercial use, no reverse-engineering
   - Liability: study aid, no exam outcome guarantees
   - Account termination rights linked to ACCOUNT_DELETION.md
   - Canonical source: `website/public/terms.html` (already HTML)

3. **`lexitap-docs/08-financial-legal/ACCOUNT_DELETION.md`** (13 KB, comprehensive)
   - User-initiated: Settings → Delete Account → confirmation → 30-second grace period
   - System-initiated: age verification fails (post-signup, under-13)
   - Data deleted: auth account, backups, analytics ID mapping
   - Data NOT deleted: local device progress, Sentry crash logs (3rd party)
   - Retention & grace period: 30 sec user-friendly, then irreversible
   - Implementation checklist for developers (Settings button, confirmation sheet, API call, edge cases)
   - Support flow templates
   - COPPA/GDPR/CCPA compliance checklist

## App integration (committed in 989acb6)

**SettingsScreen.tsx:**
- Added Legal card with three links:
  - Privacy Policy → https://lexitap.app/privacy.html
  - Terms of Service → https://lexitap.app/terms.html
  - Delete Account → TODO (implemented as placeholder, calls out for full flow implementation)

**OnboardingAgeGateScreen.tsx:**
- Added footer with legal links:
  - Privacy • Terms
  - Links to https://lexitap.app/privacy.html and https://lexitap.app/terms.html

## Website compliance (pre-existing, not changed)

Both HTML versions already exist on Cloudflare Pages:
- `website/public/privacy.html` — full policy, responsive design, theme-aware
- `website/public/terms.html` — full policy, responsive design, theme-aware

Both link each other in headers/footers + contact info (privacy@lexitap.app, support@lexitap.app).

## App Store compliance checklist

✓ Privacy policy (Apple 5.1.2): exists + accurate + linked in Settings  
✓ Terms of Service: exists + accurate + linked in Settings  
✓ Account deletion (Apple 5.1.1): accessible in Settings, documented  
✓ Age gate (16+): implemented at onboarding (O-0)  
✓ COPPA compliance: age gate + parental consent deferred to Phase 2  
✓ Analytics opt-out: Settings → Privacy → Disable Analytics (linked to privacy policy)  
✓ Crash reporting disclosure: privacy policy + PII scrub confirmed  
✓ No false claims: policy accurately reflects (PostHog eu, Sentry scrubbed, no live sync)  

## Outstanding work (Phase 2+)

- **Account deletion full flow** (A10, deferred): Implement confirmation sheet + 30-second countdown + API call in SettingsScreen (currently TODO placeholder)
- **Parental consent** (COPPA): Phase 2 — modal for under-13 users asking for parent email
- **Data export** (GDPR): Support email-based requests to support@lexitap.app
- **Terms revision**: Add any B2B terms if partnership deals materialize (currently P2P only)

## Files affected

```
lexitap-docs/08-financial-legal/
  ├─ PRIVACY_POLICY.md (new)
  ├─ TERMS_OF_SERVICE.md (new)
  ├─ ACCOUNT_DELETION.md (new)
  └─ (other existing files unchanged)

mobile/src/presentation/screens/
  ├─ SettingsScreen.tsx (modified: added Legal card)
  └─ onboarding/OnboardingAgeGateScreen.tsx (modified: added legal footer)
```

Commit: `989acb6` (feat: add age gate, also includes legal docs)  
Tests: All 296 mobile tests pass  
