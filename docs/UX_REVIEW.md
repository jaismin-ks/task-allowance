# UX review: information overload

Nov 4, 2026. Based on the code as merged (spec screens, plus Activity, streaks, goal ETA,
reminders and repeating tasks). Not yet checked against a usability session. Worth
doing that with 3–5 people once the changes below are in.

## The diagnosis

Each feature was added for a good reason, and each one put something on the **Tasks**
screen. That screen now answers six questions at once (how am I doing on my goal, when
will I get there, how am I doing today, am I keeping my streak, what's due, what repeats)
before it shows the one thing you came to do: **tick off a task**.

### What you see before the first task (typical day: goal set, 4-day streak, 5 tasks)

| # | Element | Numbers |
| --- | --- | --- |
| 1 | Date · streak chip ("KEEP YOUR 4-DAY STREAK", amber) | 1 |
| 2 | "Good evening, Sam" | |
| 3 | Goal card: SAVING FOR · title · $124.50 / $349 · bar · "35% · $224.50 TO GO" · "At your recent pace, about 3 weeks." | 5 |
| 4 | Daily guide: "Earned today $3.20 of $4.85 suggested" · bar | 2 |
| 5 | Search field + Filter button | |
| 6 | "Today" · "2 / 5" | 1 |

That's **about 16 elements, 9 numbers and 2 progress bars** before the first task. With
the composer and tab bar taking about 170pt at the bottom, the first task starts about
520pt down, so **only about 2 tasks fit on screen** on a standard iPhone.

### Inside each task row

Up to seven things per row: checkbox, title, effort bars, "EFFORT 2/5 · 20 MIN · VOICE",
a "↻ DAILY" tag, "FROM THU OCT 8", "MISSED 2", and the value.

- Effort is shown **twice** (bars and text). It matters when you *set* a value, not when you tick the task off.
- "VOICE" (how the task was entered) means nothing to the user afterwards.
- "FROM …" and "MISSED …" are both amber, both on the same row, and say nearly the same thing.

### Signals compete

- **Three progress meters**: goal bar, daily guide bar, "2 / 5" counter, plus the streak.
- **Amber means "warning" in four unrelated places**: streak at risk, carried-over task, missed count, and "Add details" on wishlist cards. Seen together, the screen looks like it's scolding you, which goes against the architecture doc's "guilt-free" goal.
- **Repeating tasks appear twice**: as rows in Today and again in the "Repeating" section below.
- **ALL-CAPS mono captions everywhere** (SAVING FOR, TO GO, EFFORT, DAILY, FROM, MISSED). Each is small, but together they make the screen read like a dashboard. The spec itself asks for sentence case (§5.1).

### Elsewhere (smaller)

- **Add task**: Task + Effort (5 segments + helper) + Value (stepper + range helper) + Repeat (4 chips + helper, then weekdays). Most tasks only need a name and a value.
- **Settings**: 8 groups and about 20 rows. "Activity" and the read-only "Daily guide" row are places, not settings.
- **Wishlist** is in good shape: one goal card, a grid, one tag.

## Principles for the fix

1. **One job per screen.** Tasks is for *doing*. Activity is for *reviewing*. Wishlist is for *choosing*. Settings is for *configuring*. A stat goes on the screen where you act on it.
2. **One headline number on Tasks**: how close the goal is. Everything else is a quiet line or lives one tap away.
3. **Show an attribute when it's needed.** Effort and the suggested range matter while *adding* a task. Pace and ETA matter while *reviewing*.
4. **Amber only when you can act on it**, and never for things you missed.
5. **Celebrate, don't warn.** Show the streak when it's alive. Let the reminder notification do the nudging.

## Recommendations (in priority order)

1–5 shipped Nov 4 (calm Tasks screen). 6–8 are next.

| # | Change | Removes | Effort |
| --- | --- | --- | --- |
| ✅ 1 | **One calm goal card.** "Saving for Headphones", **$124.50 of $349**, one bar, and one quiet line: "$3.20 earned today". The daily guide strip goes away. Its number stays in Add task, where it sets the suggested range, and in Activity. The % and "to go" move to Item detail; the ETA moves to Item detail and Activity. | 1 bar, 5 numbers, about 150pt | S |
| ✅ 2 | **Streak only when it's a win**: a small "🔥 4 days" next to the date once you've done a task today. No "Keep your streak" on screen; the evening reminder already says it. | 1 amber warning | XS |
| ✅ 3 | **Search and filter appear when they help**: a search icon in the "Today" header, with the full toolbar shown once there are 8+ tasks or a filter is on. | 1 row for most users | S |
| ✅ 4 | **Simpler task rows**: title and value on line 1; line 2 only if there's something to say, muted not amber: "↻ Daily · missed 2". Effort as bars only, with no "EFFORT 2/5 · 20 MIN" text and no "VOICE". Screen-reader labels keep everything. | 2–4 items per row | S |
| ✅ 5 | **"Repeating" becomes "Coming up"**: only repeating tasks with nothing on today's list, collapsed to one row ("3 repeating · next: Laundry, Thu") that expands. | Duplicate rows | S |
| 6 | **Lighter Add task**: Repeat collapses to one row ("Repeat · Never ›") that opens the chips. Shorter helpers. | About 120pt of options | S |
| 7 | **Settings regroup** into Allowance · Reminders & feel (reminder, haptics, voice) · Appearance (theme, accent, motion) · Data · About. Drop the "Activity" and "Daily guide" rows; both are reachable from Tasks. | 2 groups, 2 rows | XS |
| 8 | **Fewer capitals**: sentence case for captions inside cards and rows. Keep caps only for the date line and tags. | | XS |

**Expected result for 1–5:** before the first task, about 6 elements and 3 numbers
instead of about 16 and 9. One progress bar instead of two. The first task starts about
330pt down instead of about 520pt, so **about 5 tasks are visible instead of 2**.
Nothing is removed from the app; it moves one tap away to where it's used.

## What I'd keep exactly as it is

- The goal card as the hero. It's the reason the app exists.
- Undo snackbars, swipe actions, tap-anywhere-to-complete.
- The Activity screen. It's where the extra stats should live, and it's already good.
- Empty states and their copy. They're clear and calm.

## How to check it worked

- First-time user, no explanation: "What would you do first on this screen?" Ideally they say "tick off a task" within 5 seconds.
- Count taps to complete 3 tasks and add 1. It shouldn't go up.
- Ask after a week of use: "Did anything on the Tasks screen make you feel behind?" Ideally the answer is no.
