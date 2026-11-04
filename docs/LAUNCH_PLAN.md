# TaskAllowance: from project to app

Sources: the UX Spec v1.0, the Technical Architecture doc, this repo, and
[taskallowance-api](https://github.com/jaismin-ks/taskallowance-api). It merges two
audits, from Oct 16 and Nov 4, 2026.

**Constraint for now: nothing that costs money.** Paid items are listed at the end and
stay parked until you decide to spend.

Legend: 📦 adds a native module, so it needs a new dev/EAS build (Expo Go already
includes most). 👤 needs you (a device, an account, or a decision).

## Done

| Area | Notes |
| --- | --- |
| Core loop from the spec | Tasks, wishlist, goal, undo, daily guide, onboarding, settings, month wrap-up |
| Money drift fix | Totals rounded to cents. A $10 goal could previously never unlock |
| Tests | DB-backed tests on real SQLite plus pure unit tests (`npm test`) |
| App identity | Name, bundle id/package, progress-ring icon + splash, EAS profiles |
| Crash screen | Root error boundary + migration failure screen, "Copy error details" |
| Backup & restore 📦 | File via share sheet, photos included, strict validation, all-or-nothing |
| Missed repeats | One pending copy per repeating task; misses kept as history, "MISSED 3" |
| Activity | Streak, last 7 days chart, lifetime totals, full history |
| Streaks + goal ETA | Streak chip on Tasks; "At your recent pace, about 12 days" |
| Daily reminder 📦 | Local notification, live copy, quiet once done, Settings → Reminder |
| Rating prompt 📦 | After the second goal is bought, once per version |
| Expo SDK 58 | Plus fixes for the tab bar crash and sheet header overlap it caused |
| Calmer Tasks screen | UX review 1–6: one goal card, quiet rows, Coming up, search on demand |
| Two tabs + profile | Tasks · Wishlist; Profile & settings and Calendar top right |
| Add task, simplified | Name + effort; value fills itself in to keep you on track for the allowance |
| Reminders + notes per task | Optional date/time (or time for repeats), optional note |
| Swipe tray + undo | Tap the tick to undo; swipe left for Done/Undo · Edit · Delete |
| Calendar + planning | Month view of each day's tasks; plan one-off tasks for a later day |

## Next: polish (free)

| # | Item | Notes |
| --- | --- | --- |
| 1 | Device test of everything marked 📦 above 👤 | Backup/restore round trip, reminder firing, permission denied path |
| 2 | ~~Swipe actions on task rows~~ ✅ | Right = done, left = delete with Undo. Needs on-device feel testing 👤 |
| 3 | Goal milestones | Toast + light haptic at 25 / 50 / 75 % |
| 4 | "Do it again" on today's completed one-off tasks | Long-press |
| 5 | Monthly bar chart in Activity | Last 6 months earned vs allowance |
| 6 | Wishlist sort | Newest, price, closest to affordable |
| 7 | Tasks list → FlatList | Smooth with 100+ pending tasks |
| 8 | Task templates | Save frequent tasks, add in one tap (a free stand-in for AI packs) |
| 9 | Home-screen widget 📦 | Large build; needs a dev build, not Expo Go |

## Quality gate (you, on devices) 👤

- Spec §7 accessibility pass: VoiceOver + TalkBack on every screen, 160% text size
- Release-mode builds: `npx expo run:ios --configuration Release` and the `preview` APK
- Month rollover: set the phone date to the 1st and reopen
- Missed repeats: set the date a few days ahead and reopen

## Release prep that's still free

- Privacy policy page on GitHub Pages (both stores require a URL). The in-app Privacy text can be reused.
- Store listing copy, keywords, screenshots (6.7" and 6.1" iPhone, Android phone)
- taskallowance-api on Vercel Hobby + Upstash free tier, so rate limiting is on.
  `eas.json` already points `preview`/`production` at `https://taskallowance-api.vercel.app`;
  confirm that deployment exists.
- Share the Android `preview` APK with testers directly (no Play account needed)

## Parked: costs money

| Item | Cost | Notes |
| --- | --- | --- |
| Generate pack (AI) | LLM API usage | Designed in the architecture doc: `/api/generate-tasks`, zod validation, 10/day cap |
| App Store / TestFlight | Apple Developer Program, $99/yr | Required for any iOS distribution |
| Google Play | $25 one-time | APK sideloading is free meanwhile |
| Crash reporting | Sentry free tier first | Only pay if volume grows |
| Cloud sync / accounts | Supabase free tier, later paid | Architecture doc says Phase 3+, optional |
