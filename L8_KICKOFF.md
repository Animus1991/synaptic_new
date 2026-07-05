# Sprint L8 kickoff — distribution & trust

**Baseline:** post Sprint L7 (Jul 2026) · canonical status in `PRODUCT_SCALE_STATUS.md`

---

## L8-2 Audit export API (shipped in L8 slice 1)

| Field | Value |
| ----- | ----- |
| **Route** | `GET /v1/orgs/:orgId/audit-logs/export` |
| **Auth** | Bearer JWT · `org_admin` role |
| **Query** | `format=csv\|json` (default `csv`) · `since` ISO-8601 · `limit` (default 1000, max 5000) |
| **Response** | `Content-Disposition: attachment` · CSV `text/csv` or JSON `application/json` |
| **Columns (CSV)** | `id`, `createdAt`, `orgId`, `accountId`, `action`, `resource`, `ip`, `metadata` (JSON string) |
| **Health probe** | `/health` → `features.l8Enterprise.auditExport: true` |
| **Source** | `auditLogExport.ts` · reuses `listAuditLogsForOrgAsync` |

### Remaining L8-2 (docs / deployment)

- [x] Data processing map (`docs/compliance/DATA_MAP.md`)
- [x] Retention policy (`docs/compliance/RETENTION.md`)
- [x] DPA template (`docs/compliance/DPA_TEMPLATE.md`)
- [ ] Legal review + host privacy policy at production URL

---

## L8-1 App Store / Play Store pipeline (scaffold paths)

| Path | Purpose |
| ---- | ------- |
| `capacitor.config.ts` | App id `com.synapse.learning` · webDir `dist` (exists) |
| `ios/App/App.xcodeproj` | Capacitor iOS shell (exists) |
| `android/` | Capacitor Android shell (exists) |
| `mobile/fastlane/Fastfile` | iOS + Android lanes (`sync`, `build`, `beta`, `release`, `metadata`) |
| `mobile/fastlane/Appfile` | Apple ID + team (env-driven) |
| `mobile/fastlane/Matchfile` | Optional match signing |
| `mobile/fastlane/.env.example` | Credential template |
| `mobile/store/ios/metadata/` | App Store Connect copy + review notes |
| `mobile/store/android/metadata/` | Play Console listing |
| `mobile/store/ios/screenshots/` | Screenshot drop folder (see README) |
| `docs/legal/PRIVACY_POLICY.md` | Privacy policy — **host before submission** |
| `mobile/Gemfile` | `bundle install` in `mobile/` |
| `mobile/android-signing.gradle.properties.example` | Android release keystore hints |

### npm scripts

```bash
npm run cap:sync              # build + cap sync
npm run mobile:ios:beta       # TestFlight upload (requires macOS + credentials)
npm run mobile:ios:metadata   # Upload store copy only
npm run mobile:android:beta   # Play internal track
npm run mobile:android:build  # Local AAB
```

### First-time setup

```bash
cd mobile
bundle install
cp fastlane/.env.example fastlane/.env   # fill Apple / Play credentials
# Android: copy android-signing.gradle.properties.example → android/gradle.properties
```

### Submission checklist

- [ ] Apple Developer + Google Play accounts
- [ ] Replace `synapse.example.com` URLs in metadata + privacy policy
- [ ] Signed release builds (Fastlane `beta` / `release` lanes)
- [ ] Privacy policy URL live
- [ ] Store screenshots in `mobile/store/ios/screenshots/`
- [ ] App review notes (LTI/SAML enterprise features — in review_information/notes.txt)

---

## L8-3 Brand / GTM (non-code)

- Landing page refresh + institution one-pager
- Demo video (workspace + student-org + teacher heatmap)
- Parallel track — does not block L8-2 code

---

## L8-4 PRODUCT_SCALE_STATUS sync

Reconcile `PRODUCT_SCALE_STATUS.md` through L7; canvas backlog updated in `synapse-competitive-matrix.canvas.tsx`.
