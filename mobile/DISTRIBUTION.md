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

| Command | Action |
| ------- | ------ |
| `npm run mobile:ios:build` | Signed IPA locally (`ios build_signed`) |
| `npm run mobile:ios:beta` | TestFlight upload |
| `npm run mobile:ios:metadata` | Metadata-only deliver |
| `npm run mobile:android:build` | Signed AAB locally |
| `npm run mobile:android:beta` | Play internal track upload |

## Legal (OPS-06)

Before first production store submission, complete `docs/compliance/LEGAL_REVIEW_CHECKLIST.md` with counsel.
