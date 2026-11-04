# TaskAllowance

A gamified allowance app: give your tasks a money value, check them off, and watch a goal from your wishlist fill up. There's no bank connection. It's a self-reported motivation tool, not a financial tracker.

Built with Expo (React Native), SQLite and a small serverless API. Plain JavaScript throughout.

## The core loop

1. **Add a task.** Give it an effort level (Tiny → Big push) and a value. The app suggests a value range from your monthly allowance.
2. **Check it off.** Its value is credited to this month's earnings, with a 5-second Undo.
3. **Pick a goal** from your wishlist. Paste a product link and the details fill themselves in, or type them.
4. **Reach it.** When you've earned the price, you get an "Unlocked" moment. Mark it bought and pick what's next.

Other features: an Activity view (streak, last 7 days, lifetime totals, full history), a goal ETA based on your recent pace, repeating tasks (daily / weekly / monthly), voice entry, a daily guide that spreads the remaining allowance across the rest of the month, a new-month wrap-up, onboarding, accent colours, light and dark themes, and Reduce Motion support.

## Architecture

```
┌──────────────────────────────────────┐
│  Mobile app (Expo SDK 57, RN 0.86)    │
│                                       │
│  Expo Router screens                  │
│        │                              │
│  Zustand stores — thin, no totals     │
│        │                              │
│  SQLite + Drizzle  ← source of truth  │
│  expo-sqlite/kv-store ← preferences   │
└───────────────┬───────────────────────┘
                │ HTTPS, only for "Fetch details"
                ▼
┌──────────────────────────────────────┐      ┌───────────────┐
│  Vercel function /api/scrape-product  │ ───► │ Retailer page │
│  SSRF guard · 6s timeout · Upstash RL │      └───────────────┘
└──────────────────────────────────────┘
```

The core loop never touches the network. Every read and write is local SQLite, so checking off a task is instant and works offline. The API lives in a separate repo (`taskallowance-api`).

### Data model

| Table | Holds |
| --- | --- |
| `user_profile` | Name, monthly allowance, currency, voice on/off |
| `task` | Title, value, effort 1–5, status, source (manual / voice), repeating-series link |
| `task_series` | Template + rule for repeating tasks; each due date becomes an ordinary `task` row |
| `wishlist_item` | Link, title, image, price, scraped currency, goal flag, purchased date |
| `allowance_pool` | One row per month: allowance, total earned, total spent |

## Three decisions worth explaining

### 1. Money math that can't drift or double-count

Completing a task does three things in **one SQLite transaction**: it flips the task to `completed`, makes sure this month's pool row exists, and increments `total_earned` with `SET total_earned = total_earned + ?`. That increment is atomic, not a read-modify-write. The transaction first checks that the task is still `pending`, so a double tap or a retry is a no-op ([db/operations/completeTask.js](db/operations/completeTask.js)).

The UI never keeps a running total. Progress is re-queried from the database after every change, so the screen can't disagree with what's stored.

Undo is the mirror operation, with one subtlety. It debits **the month the task was credited to** (read from `completed_at`), not the current month. An undo two seconds after midnight on the 1st still corrects last month. After the undo window, completed tasks are read-only, because editing a credited value would desync the pool.

Other invariants live in the schema, not in app code. A partial unique index (`WHERE priority_flag = 1`) means the database itself refuses two goals. A `(series_id, due_date)` unique index makes repeating-task generation idempotent.

### 2. Goal progress that survives the month boundary

The pool is per month, which is what the allowance and daily-guide math need. But goal progress reads **Available = Σ earned − Σ spent across every month**. The naive version, which reads only the current month, would drop a half-funded goal to 0% on the 1st of every month. "I bought it" spends the price from the current month in the same transaction that marks the item purchased.

Month rollover is checked on every app foreground, not just on launch. That catches the app sitting open across midnight on the last day of the month.

### 3. Scraping as a convenience, never a dependency

Product scraping fails often: big retailers run bot protection. So the design is about failing gracefully rather than winning:

1. **Server first.** The Vercel function fetches the page and reads OpenGraph tags, then JSON-LD, then fallbacks. It validates the URL and checks the *resolved* IP of every connection, including each redirect hop, so the endpoint can't be pointed at internal addresses (SSRF). It's rate-limited per IP and globally.
2. **On-device fallback.** If the server is blocked or finds no price, the app loads the page in an invisible, sandboxed WebView. That's a real browser on the user's own connection, and it can render JavaScript-heavy stores. The page data is treated as untrusted and validated before it reaches the form.
3. **Manual entry, always.** Whatever happens, the user lands on the same details form: pre-filled on success, or empty with a plain explanation of what went wrong. There's never a dead end.

No currency conversion: a price scraped in another currency is stored as scraped and shown with `≈`.

## Known limitations

- **Your data stays on this phone.** No account, sync or backup. Deleting the app erases everything.
- **No FX conversion.** Currency changes the symbol only.
- **Scraping is best-effort.** Shopify stores, Nike and IKEA work well. Amazon gives the title only. Etsy, Target and Best Buy are usually blocked. See the API repo for the full table.
- **Voice input needs a development or release build.** The speech module isn't available in Expo Go.
- **AI task packs aren't built yet.** The spec's "Generate pack" flow (an LLM proposes a set of tasks for a situation like exam week) is designed but deferred to avoid paid API costs.

## Running it

```bash
npm install
npx expo start          # Expo Go works for everything except voice input
npx expo run:ios        # or run:android — native build, includes voice
```

Product-link fetching needs the API. Create `.env.local` with:

```
EXPO_PUBLIC_API_BASE=https://taskallowance-api.vercel.app
```

To run the API locally instead, start it with `cd ../taskallowance-api && npm run dev` and use the LAN URL it prints.

### Builds

`eas.json` has two profiles. Both set `EXPO_PUBLIC_API_BASE`, because `.env.local` isn't uploaded to EAS:

```bash
eas build --platform android --profile preview      # installable APK for testing
eas build --platform ios --profile production       # App Store / TestFlight
```

### Tests

```bash
npm test
```

Unit tests in `__tests__/` cover the pure money and date logic: the daily guide and effort ranges, money parsing and formatting, recurrence rules, search and filters, form validation, and streak / goal-ETA math. The SQLite transactions themselves are checked on-device with Settings → Developer checks (dev builds only).

### Database migrations

The schema is in [db/schema.js](db/schema.js). After changing it, run `npx drizzle-kit generate`. Migrations apply automatically on app start.

## Project layout

```
app/          Expo Router screens: (tabs)/, task/, wishlist/, onboarding/, modals
components/   Screen pieces + ui/ primitives (Button, TextField, MoneyField, …)
db/           Drizzle schema, migrations, and transaction-safe operations
lib/          Daily-guide math, recurrence rules, formatting, API clients, prefs
store/        Zustand stores (thin wrappers over SQLite)
theme/        Design tokens, palettes, motion
```
