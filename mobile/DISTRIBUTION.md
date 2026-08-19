# Mobile distribution runbook (OPS-04)

Signed iOS/Android release builds via Fastlane + Capacitor.

## Prerequisites

1. `npm run build` succeeds
2. Copy `mobile/fastlane/.env.example` → `mobile/fastlane/.env` (Apple IDs, team IDs)
3. iOS: configure `MATCH_GIT_URL` signing repo → `npm run mobile:ios:certificates`
4. Android: copy `mobile/android-signing.gradle.properties.example` → `android/gradle.properties`

## Canonical URLs (OPS-05)

Edit `mobile/config/distribution.json`, then:

```bash
npm run distribution:sync-urls
```

Updates App Store / Play metadata and `docs/legal/PRIVACY_POLICY.md`.

Public privacy page: `public/legal/privacy/index.html` → `/legal/privacy`

## Lanes

Every npm script maps 1:1 to a Fastlane lane in `mobile/fastlane/Fastfile`.
Ordered by promotion stage: **sync → build → beta → release**.

### iOS

| Command | Fastlane lane | Action |
| ------- | ------------- | ------ |
| `npm run mobile:ios:certificates` | `ios certificates` | Install/refresh App Store signing certs (`match`, read-write) |
| `npm run mobile:ios:sync` | `ios sync` | Sync web assets into the Capacitor iOS shell |
| `npm run mobile:ios:build` | `ios build_signed` | Signed IPA locally, no upload |
| `npm run mobile:ios:beta` | `ios beta` | Build + upload to TestFlight (internal) |
| `npm run mobile:ios:metadata` | `ios metadata` | Metadata-only `deliver` (no binary) |
| `npm run mobile:ios:release` | `ios release` | Build + `upload_to_app_store` (App Store; `submit_for_review: false`) |

### Android

| Command | Fastlane lane | Action |
| ------- | ------------- | ------ |
| `npm run mobile:android:sync` | `android sync` | Sync web assets into the Capacitor Android shell |
| `npm run mobile:android:build` | `android build_signed` | Signed AAB locally, no upload |
| `npm run mobile:android:beta` | `android beta` | Build + upload to Play **internal** track |
| `npm run mobile:android:release` | `android release` | Build + upload to Play **production** track |

### Promotion checklist (beta → production)

1. Ship to `beta` and validate on the internal track (TestFlight / Play internal).
2. Confirm store metadata is current: `npm run distribution:sync-urls` then `mobile:ios:metadata`.
3. iOS: place screenshots in `mobile/store/ios/screenshots/` (else `release` skips them).
4. Run the `release` lane. `submit_for_review`/production rollout stays **manual** in
   App Store Connect / Play Console — the lane uploads but does not auto-submit.

## Legal (OPS-06)

Before first production store submission, complete `docs/compliance/LEGAL_REVIEW_CHECKLIST.md` with counsel.
