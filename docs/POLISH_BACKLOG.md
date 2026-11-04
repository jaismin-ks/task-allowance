# TaskAllowance: road to a store-ready app

Audit date: 2026-10-16. Inputs: the App Structure & UX Spec v1.0, the Technical Architecture doc, and a full read of the codebase.

**Where the app stands.** The core loop is solid and matches the spec closely. Money writes are atomic, Available carries across months, there's a 5-second Undo, repeating tasks work, onboarding, goal reached, the new-month wrap-up, light/dark themes with accents, Reduce Motion, and careful accessibility labels are all in. What's missing is mostly the layer that makes people *stay*: seeing their history and progress over time, reminders, and protection for their data. That's below, along with store-readiness work.

Legend:
- ✅ done in this pass
- 🔧 JS only (ships with an OTA update or a normal rebuild)
- 📦 adds a native module, so it needs a new dev or EAS build
- 👤 needs you: an account, money, or a decision
- 🤖 AI. Deferred because it needs paid API credits.

---

## P0: retention and trust (biggest UX gaps)

| # | Item | Why it matters | Type |
|---|------|----------------|------|
| 1 | **Activity screen.** Earnings by day, this month vs allowance, lifetime earned, past completed tasks. | Today, completed tasks vanish at midnight and there's no way to see what you've done. For a "paid in effort" app, the history *is* the reward. | ✅ 🔧 |
| 2 | **Streaks.** Count consecutive days with at least one completed task. Show it on Tasks and in Activity. | The cheapest, best-proven habit hook in this category. | ✅ 🔧 |
| 3 | **Goal ETA.** "About 12 days at your recent pace" on the goal card. | Turns a static bar into a forecast and makes the goal feel reachable. | ✅ 🔧 |
| 4 | **Crash safety net.** A friendly error screen with "Try again" instead of a red or white screen. Also a readable screen if a database migration fails. | One crash with no recovery path is a 1-star review. | ✅ 🔧 |
| 5 | **Money-math unit tests** (daily guide, money parsing and formatting, recurrence, filters, streak and ETA). | The architecture doc says to test this first. A bug that miscounts money breaks the whole product promise. | ✅ 🔧 |
| 6 | **Backup and restore.** Export everything to a file through the share sheet, and import it back. | Data lives only on the phone. A lost or replaced phone wipes months of history. Settings → Data. Wishlist photos travel inside the file; preferences don't. Not tested on a device yet. | ✅ 📦 (expo-sharing, expo-document-picker) |
| 7 | **Daily reminder.** An optional local notification ("3 tasks left today, $4.20 to earn") at a time you pick, set in Settings. | The main reason people forget to come back. Runs on the device, no server needed. Settings → Reminder. Today's reminder carries real numbers and stays quiet once everything's done. Reminders stop after 7 days without opening the app. Not tested on a device yet. | ✅ 📦 (expo-notifications, datetimepicker) |

## P1: polish that users notice

| # | Item | Notes | Type |
|---|------|-------|------|
| 8 | Swipe actions on task rows: swipe left to delete, swipe right to complete. | Standard in checklist apps. gesture-handler is already installed, but this needs on-device feel testing. | 🔧 |
| 9 | Goal milestones: a toast plus a light haptic at 25%, 50% and 75% of the goal. | Small moments of reward between "start" and "Unlocked". | 🔧 |
| 10 | "Ahead of today's guide" state on the daily guide strip once you pass it. | Right now the bar just sits full, with no acknowledgement. | ✅ 🔧 |
| 11 | "Do it again" on today's completed one-off tasks, by long-press. | Common for chores that repeat irregularly. | 🔧 |
| 12 | Monthly bar chart in Activity (last 6 months earned vs allowance). | Once there are several months of data. | 🔧 |
| 13 | Wishlist sort (newest, price, closest to affordable). | The list grows over time. | 🔧 |
| 14 | Swap the long Tasks ScrollView for a FlatList. | Keeps scrolling smooth with 100+ pending tasks. | 🔧 |
| 15 | App rating prompt after the second goal is reached. | The happiest moment in the app is the right time to ask. Fires after the second goal is bought, at most once per app version. | ✅ 📦 (expo-store-review) |
| 16 | Home-screen widget (today's earnings and goal %). | High perceived quality, but a large build. | 📦 large |

## P2: store readiness (mostly you)

| # | Item | Type |
|---|------|------|
| 17 | Apple Developer account ($99/yr) and Google Play account ($25 one-time). | 👤 cost |
| 18 | A hosted privacy policy URL, which both stores require. The in-app Privacy text can be reused. A free GitHub Pages page works. | 👤 |
| 19 | Store screenshots (6.7" and 6.1" iPhone, plus Android phone), subtitle, keywords and description. | 👤 |
| 20 | Confirm the scraper API (`taskallowance-api` on Vercel) is deployed and that `EXPO_PUBLIC_API_BASE` in `eas.json` points at it. | 👤 |
| 21 | An accessibility pass on a real device: VoiceOver, TalkBack, and the largest text size on every screen (spec §7). | 👤 device |
| 22 | Crash reporting (Sentry free tier) so you hear about crashes from TestFlight users. | 📦 👤 |
| 23 | Commit the pending icon, splash, app.json and eas.json changes that are still uncommitted in the working tree. | 👤 |

## Deferred: AI (needs API credits)

| # | Item | Type |
|---|------|------|
| 24 | Generate pack S5/S6 (`/api/generate-tasks`), plus the "Generate pack" entry points on Tasks and in the empty state. | 🤖 |
| 25 | Voice value parsing ("fold laundry worth two dollars"). Could be done with a regex and no AI (spec §S4 note), so it can move up if you want it. | 🔧 later |
