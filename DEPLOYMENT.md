# LexiTap Deployment Guide

## Overview

Deployments to TestFlight (iOS) and Play Store internal track (Android) are automated via GitHub Actions on git tags. Tag a release, push to GitHub, and the workflow handles building and submitting.

## How to Deploy

### 1. Tag the Release

```bash
git tag v0.1.0  # or your version
git push origin v0.1.0
```

Or push all tags:

```bash
git push --tags
```

### 2. Workflow Runs Automatically

The `.github/workflows/deploy.yml` workflow triggers on any `v*` tag:
- **iOS job:** Builds via EAS → submits to TestFlight
- **Android job:** Builds via EAS → submits to Play Store internal track

Both jobs run **in parallel** (independent).

### 3. Monitor Progress

- Navigate to [GitHub Actions](https://github.com/rmg007/lexitap/actions)
- Find the workflow run for your tag
- Each job logs:
  - `eas build` output (EAS server-side build status)
  - `eas submit` output (store submission status)

## Secrets Setup (One-Time)

Deployments require three secrets in GitHub (Settings → Secrets and variables → Actions):

| Secret | Source | Notes |
|--------|--------|-------|
| `EAS_TOKEN` | [eas.io account](https://eas.io/account/settings) → API tokens | Personal access token; never commit |
| `APPLE_ID` | App Store Connect | Email or team ID; used for TestFlight submission |
| `APPLE_PASSWORD` | App Store Connect | App-specific password (not login password); required for non-interactive submission |
| `GOOGLE_PLAY_JSON_KEY` | Google Play Console → Service Accounts | JSON key file (base64-encoded or raw) for Android submission |

### Adding Secrets

1. Go to [repo Settings](https://github.com/rmg007/lexitap/settings/secrets/actions)
2. Click **New repository secret**
3. Add each secret above

Currently, the workflow uses **only `EAS_TOKEN`**. Store submission is handled by EAS (`eas submit`), which pulls credentials from:
- `eas.json` config (ascAppId, service account setup)
- Environment variables or EAS-managed secrets (optional for future hardening)

**Note:** If App Store/Play Store submission fails, check that EAS has the necessary credentials configured in the EAS web dashboard.

## Expected Duration

- **iOS build:** 5–15 minutes (on-demand EAS runner)
- **Android build:** 5–15 minutes (on-demand EAS runner)
- **TestFlight submission:** 1–2 minutes
- **Play Store submission:** 1–2 minutes
- **Total:** 10–30 minutes (jobs run in parallel)

## Workflow Status & Notifications

### View Details
- **Real-time:** GitHub Actions UI → Workflow run → Job logs
- **Email notifications:** GitHub sends pass/fail emails to your account

### Common Issues

| Issue | Fix |
|-------|-----|
| `eas whoami` fails | Regenerate `EAS_TOKEN` and update GitHub secret |
| "App not found" on TestFlight | Verify `ascAppId` in `mobile/eas.json` matches App Store Connect |
| "Unauthorized" on Play Store | Check Google Play service account key in EAS dashboard |
| Build timeout (>30 min) | EAS may be overloaded; retry tag (delete and re-create) or check EAS status |
| Build fails with cryptic error | Check `mobile/app.config.ts` version matches the tag; ensure all dependencies are committed |

## Post-Deployment

### TestFlight (iOS)

1. Build appears in [App Store Connect](https://appstoreconnect.apple.com) → Builds → Processing
2. After processing (2–5 min), add testers and enable for external testing
3. Testers receive email invite to join beta

### Play Store (Android)

1. Build appears in Play Console → Release → Internal testing track
2. Add testers and enable for testing
3. Testers receive invite via Google Play app

## Rollback

To rollback a deployment (don't ship a build):

1. **Don't promote to production.** Internal/TestFlight builds don't affect users until you submit for review.
2. If a build is already in review, contact App Store / Play Store support to withdraw.
3. Tag and deploy a new version when ready.

## Version Bumping

Versions are defined in `mobile/app.config.ts` (Expo config):

```typescript
version: '0.1.0'
```

Before tagging:
1. Update `version` in `mobile/app.config.ts`
2. Commit: `git commit -am "chore: bump to v0.1.1"`
3. Tag: `git tag v0.1.1 && git push --tags`

EAS builds auto-increment the build number (`eas.json` → `autoIncrement: true`) for each submission.

## Advanced: Manual Builds

If the workflow fails or you need finer control:

```bash
cd mobile
npx eas login  # if not logged in
npx eas build --platform ios --profile production --wait
npx eas submit --platform ios --profile production --non-interactive
```

For Android:

```bash
npx eas build --platform android --profile production --wait
npx eas submit --platform android --profile production --non-interactive
```

## See Also

- [EAS Documentation](https://docs.expo.dev/eas/)
- `mobile/eas.json` — Build & submit config
- `mobile/app.config.ts` — Expo config (version, bundle ID, etc.)
- `.github/workflows/deploy.yml` — Workflow definition
