# TaskAllowance

Earn your wishlist. Give tasks a value, check them off, and watch your goal fill up.
Offline-first iOS + Android app built with Expo (SDK 58), Expo Router, SQLite (Drizzle) and Zustand.

- **Tasks:** one-off or repeating, valued by effort (1–5) with a soft *Daily guide* so a month lands on budget.
- **Wishlist:** paste a product link to auto-fill it, or type it in. One item is the *goal*.
- **Allowance:** completing a task credits the pool in a single SQLite transaction. Undo is available for 5 seconds.
  Available money carries across months.
- **Voice:** dictate task titles (development/production builds only, not Expo Go).

Everything lives on the phone. The only network calls are product-link lookups to
[taskallowance-api](https://github.com/jaismin-ks/taskallowance-api).

## Develop

```bash
npm install
npx expo start          # Expo Go works for everything except voice input
npm test                # money math, recurrence, formatting (needs Node 22.13+)
npm run lint
```

Point product-link lookups at the API (optional, manual entry always works) in `.env.local`:

```
EXPO_PUBLIC_API_BASE=http://<your-lan-ip>:3000
```

## Builds (all free)

`eas.json` has these profiles. EAS's free tier covers them, and so does a local
`npx expo run:ios` / `run:android`:

| Profile | What | Needs |
| --- | --- | --- |
| `development` | Dev client for the iOS simulator / Android | Free Expo account |
| `development-device` | Dev client on a real iPhone | Apple Developer Program (paid), or use `npx expo run:ios --device` with a free Apple ID (7-day signing) |
| `preview` | Installable Android APK to share with testers | Free Expo account |
| `production` | Store builds | Store accounts (paid), see `docs/LAUNCH_PLAN.md` |

```bash
npx eas-cli build --profile preview --platform android
```

## Project layout

```
app/              Expo Router screens (routes match the UX spec §3.4)
components/       Screen pieces + components/ui primitives
db/               Drizzle schema, migrations, transaction-safe operations
lib/              Pure logic: daily guide, recurrence, money formatting, validation
store/            Zustand stores (thin; money is always re-read from SQLite)
theme/            Tokens, palettes (dark/light × 5 accents), motion
tests/            Jest tests; the DB layer runs on Node's built-in SQLite
scripts/          make-icons.py regenerates the app icon set
```

Money rule: never keep running totals in JS. Every credit/debit is one SQLite
transaction, and amounts are rounded to cents on write and read.

## Roadmap

See [`docs/LAUNCH_PLAN.md`](docs/LAUNCH_PLAN.md).
