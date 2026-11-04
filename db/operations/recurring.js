// db/operations/recurring.js
// Repeating tasks. A task_series holds the template + rule; each due date gets an
// ordinary `task` row (series_id + due_date), so completing / undo / pool math
// don't change.
//
// Only one occurrence per series is ever pending: the latest. A missed one stays
// on the list (captioned "FROM MON OCT 5") until the next one comes due, then it's
// marked 'skipped'. Skipped rows are kept as history — they're never credited,
// never shown in the list, and they drive the "MISSED 3" caption.
import { addDays, dateKey, matchesRule, parseDateKey, ruleFromSeries } from '../../lib/recurrence';
import { sqlite } from '../client';

// If the app isn't opened for a long stretch, only record this many days of
// missed occurrences (they're history, not list items).
const BACKFILL_DAYS = 31;

export const SKIPPED = 'skipped';

const SERIES_SELECT = `SELECT id, title, monetary_value AS monetaryValue, effort_rating AS effortRating,
  source, frequency, weekdays, month_day AS monthDay, start_date AS startDate,
  last_generated_date AS lastGeneratedDate, active FROM task_series`;

const ruleColumns = (rule) => [
  rule.frequency,
  rule.frequency === 'weekly' ? rule.weekdays.join(',') : null,
  rule.frequency === 'monthly' ? rule.monthDay : null,
];

function insertOccurrence(series, dueKey, status) {
  sqlite.runSync(
    `INSERT OR IGNORE INTO task (title, monetary_value, effort_rating, source, series_id, due_date, completion_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [series.title, series.monetaryValue, series.effortRating, series.source, series.id, dueKey, status]
  );
}

// A pending occurrence is superseded once a later occurrence of the same series
// exists (whatever its status). Also collapses backlogs created before this rule.
function skipSupersededOccurrences() {
  sqlite.runSync(
    `UPDATE task SET completion_status = '${SKIPPED}'
     WHERE completion_status = 'pending' AND series_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM task newer
                   WHERE newer.series_id = task.series_id AND newer.due_date > task.due_date)`
  );
}

// Idempotent: the (series_id, due_date) unique index + last_generated_date mean
// running this on every load never duplicates, and a deleted occurrence never returns.
export function generateDueOccurrences(today = new Date()) {
  const todayKey = dateKey(today);
  const due = sqlite.getAllSync(
    `${SERIES_SELECT} WHERE active = 1 AND (last_generated_date IS NULL OR last_generated_date < ?)`,
    [todayKey]
  );

  const floor = addDays(today, -(BACKFILL_DAYS - 1));
  sqlite.withTransactionSync(() => {
    for (const s of due) {
      const rule = ruleFromSeries(s);
      let d = s.lastGeneratedDate ? addDays(parseDateKey(s.lastGeneratedDate), 1) : parseDateKey(s.startDate);
      if (d < floor) d = floor;
      const dates = [];
      for (; dateKey(d) <= todayKey; d = addDays(d, 1)) {
        if (matchesRule(rule, d)) dates.push(dateKey(d));
      }
      // Only the newest one goes on the list; earlier dates were already missed
      dates.forEach((key, i) => insertOccurrence(s, key, i === dates.length - 1 ? 'pending' : SKIPPED));
      sqlite.runSync(`UPDATE task_series SET last_generated_date = ? WHERE id = ?`, [todayKey, s.id]);
    }
    skipSupersededOccurrences();
  });
}

// New repeating task, starting today. With `attachTaskId` (turning an existing
// one-off task into a repeating one), that task becomes today's occurrence when
// today matches the rule, so it isn't duplicated.
export function createSeries({ title, monetaryValue, effortRating, source = 'manual' }, rule, { attachTaskId } = {}) {
  const todayKey = dateKey();
  let id;
  sqlite.withTransactionSync(() => {
    id = sqlite.getFirstSync(
      `INSERT INTO task_series (title, monetary_value, effort_rating, source, frequency, weekdays, month_day, start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [title, monetaryValue, effortRating, source, ...ruleColumns(rule), todayKey]
    ).id;
    if (attachTaskId && matchesRule(rule, parseDateKey(todayKey))) {
      sqlite.runSync(
        `UPDATE task SET series_id = ?, due_date = ? WHERE id = ? AND completion_status = 'pending'`,
        [id, todayKey, attachTaskId]
      );
    }
  });
  generateDueOccurrences();
  return id;
}

// "This and future ones": update the template and rule, plus pending occurrences
// due on/after `fromKey`. Completed occurrences are never touched (already credited).
export function updateSeries(seriesId, { title, monetaryValue, effortRating }, rule, { fromKey = dateKey() } = {}) {
  sqlite.withTransactionSync(() => {
    sqlite.runSync(
      `UPDATE task_series SET title = ?, monetary_value = ?, effort_rating = ?,
         frequency = ?, weekdays = ?, month_day = ? WHERE id = ?`,
      [title, monetaryValue, effortRating, ...ruleColumns(rule), seriesId]
    );
    sqlite.runSync(
      `UPDATE task SET title = ?, monetary_value = ?, effort_rating = ?
       WHERE series_id = ? AND completion_status = 'pending' AND due_date >= ?`,
      [title, monetaryValue, effortRating, seriesId, fromKey]
    );
  });
}

// Stop repeating. With `deleteFromKey`, also removes pending occurrences due on/after
// it ("delete this and future ones"); otherwise tasks already on the list stay.
export function stopSeries(seriesId, { deleteFromKey } = {}) {
  sqlite.withTransactionSync(() => {
    sqlite.runSync(`UPDATE task_series SET active = 0 WHERE id = ?`, [seriesId]);
    if (deleteFromKey) {
      sqlite.runSync(
        `DELETE FROM task WHERE series_id = ? AND completion_status = 'pending' AND due_date >= ?`,
        [seriesId, deleteFromKey]
      );
    }
  });
}

export function getSeries(id) {
  const s = sqlite.getFirstSync(`${SERIES_SELECT} WHERE id = ?`, [id]);
  return s ? { ...s, active: !!s.active } : null;
}

// Active series for the Tasks "Repeating" section, with whether one is already on the list
export function listActiveSeries() {
  return sqlite
    .getAllSync(
      `${SERIES_SELECT.replace('FROM task_series', `,
         EXISTS (SELECT 1 FROM task t WHERE t.series_id = task_series.id AND t.completion_status = 'pending') AS hasPending,
         EXISTS (SELECT 1 FROM task t WHERE t.series_id = task_series.id AND t.due_date = ?) AS dueToday
       FROM task_series`)} WHERE active = 1 ORDER BY created_at DESC`,
      [dateKey()]
    )
    .map((s) => ({ ...s, active: true, hasPending: !!s.hasPending, dueToday: !!s.dueToday }));
}
