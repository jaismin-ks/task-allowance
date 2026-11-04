# TaskAllowance: from project to app

Audit date: Nov 4, 2026. Sources: the UX Spec v1.0, the Technical Architecture doc,
this repo, and [taskallowance-api](https://github.com/jaismin-ks/taskallowance-api).

**Constraint for now: nothing that costs money.** Paid items are listed separately at
the end and stay parked until you decide to spend.

## Where it stands

The app is much further along than an MVP. It matches the UX spec closely, and the
code is careful: transactional money writes, idempotent recurrence, spec copy used
verbatim, and accessibility labels and Reduce Motion handled throughout. Beyond the
spec it already has repeating tasks, search and filters, wishlist photos, a light
theme with five accents, and an on-device scrape fallback.

| Area | Status |
| --- | --- |
| Tasks, add/edit, undo, daily guide, soft warnings | Done |
| Wishlist, link fetch + manual, item detail, goal, "I bought it", next goal | Done |
| Onboarding, settings, allowance, currency, about, reset | Done |
| Voice capture | Done (needs a dev/production build, not Expo Go) |
| New-month summary, cross-month Available | Done |
| Generate pack (S5/S6) + `/api/generate-tasks` | **Not built** (needs a paid AI key, so parked) |
| Automated tests | Added in this branch (52, money math first) |
| App identity, icons, build config | Added in this branch |
| Crash handling | Added in this branch |
| Backup / restore | Missing |
| Store listing, privacy policy, screenshots | Missing |

## Bugs found

1. **Money drift, fixed.** Pool totals were float sums. Five tasks worth $10.00 added up
   to 9.999999999999998, so a $10 goal never triggered "Unlocked" and showed "$0.00 to go".
   Totals are now rounded to cents on write and read, and there are tests for it.
2. **Missed repeats pile up.** A daily task that's ignored for a month backfills
   31 pending copies. Suggest: when generating, mark older uncompleted occurrences of
   the same series as skipped (or keep only the latest), with a "Missed 4 days" caption.
3. **Template placeholders shipped.** Expo icon/splash, `task-allowance-app` name, no
   Android package. Fixed.
4. **Render crashes showed a blank screen.** Fixed with a root error boundary.

## Plan (all free)

### Phase A: foundations (this branch)
- [x] Round money to cents, plus a Jest suite running the real DB ops on SQLite
- [x] App name, bundle id/package, branded icon + splash, EAS profiles, README
- [x] Error boundary with "Copy error details"
- [x] Backup & restore: export everything to a JSON file (share sheet) and import it
      back. Today, deleting the app loses all data.

### Phase B: product polish
- [ ] Missed repeating tasks: collapse the backlog (bug 2)
- [ ] Optional daily reminder (local notification, on-device, no server): "3 tasks
      left today · $4.20 to earn". Off by default, with the time picked in Settings.
- [ ] First-run hint on the Tasks screen (one dismissible card) explaining value →
      goal, since onboarding is skippable
- [ ] Hide the "Generate pack" spec entry points until the feature exists (already
      hidden; keep it that way and remove dead copy if any)
- [ ] Empty-state and copy pass against spec §6 on a real device
- [ ] Ask for a store review after the first goal is unlocked (`expo-store-review`,
      free; only meaningful once the app is in a store)

### Phase C: quality gate (you, on devices)
- [ ] Spec §7 accessibility pass: VoiceOver + TalkBack on every screen, 160% text
- [ ] Release-mode builds: `npx expo run:ios --configuration Release` (free Apple ID,
      7-day signing) and the `preview` Android APK
- [ ] Month rollover on a device: change the phone date to the 1st and reopen
- [ ] Performance with ~200 tasks (Tasks uses a ScrollView; switch to a FlatList if it stutters)

### Phase D: release prep that's still free
- [ ] Privacy policy page (GitHub Pages, free). Data stays on the phone; product
      links go to the API; voice uses the OS recognizer. Stores require the URL.
- [ ] Store listing copy, keywords, and 6.7" + 5.5" screenshots (simulator)
- [ ] Deploy taskallowance-api on Vercel Hobby (free) with Upstash Redis free tier,
      so rate limiting is on. Set `EXPO_PUBLIC_API_BASE` in `eas.json`.
- [ ] Share the Android `preview` APK with a few testers directly (no Play account needed)

## Parked: costs money

| Item | Cost | Why it waits |
| --- | --- | --- |
| Generate pack (AI) | LLM API usage (small, but needs a card on file) | The architecture doc already designs it: `/api/generate-tasks`, zod validation, 10/day cap |
| App Store release, TestFlight, iPhone dev builds over 7 days | Apple Developer Program, $99/yr | Required for any iOS distribution |
| Google Play release | $25 one-time | Required for the Play Store (APK sideloading is free) |
| Crash reporting at scale | Sentry free tier is fine at first | Free tier first; only pay if volume grows |
| Cloud sync / accounts | Supabase free tier, later paid | Architecture doc says Phase 3+, optional |
