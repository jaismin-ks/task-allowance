// db/schema.js
import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const userProfile = sqliteTable('user_profile', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  displayName: text('display_name').notNull().default('Me'),
  monthlyAllowanceCap: real('monthly_allowance_cap').notNull().default(150.0),
  dailyTaskCap: real('daily_task_cap'),
  currencyCode: text('currency_code').notNull().default('USD'),
  voiceInputEnabled: integer('voice_input_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const task = sqliteTable('task', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  title: text('title').notNull(),
  monetaryValue: real('monetary_value').notNull(),
  effortRating: integer('effort_rating').notNull(),
  completionStatus: text('completion_status').notNull().default('pending'),
  source: text('source').notNull().default('manual'),
  taskPackId: text('task_pack_id'),
  seriesId: text('series_id'), // set when generated from a repeating task_series
  dueDate: text('due_date'), // local 'YYYY-MM-DD' of the occurrence (repeating tasks only)
  notes: text('notes'), // optional description
  remindAt: text('remind_at'), // optional local 'YYYY-MM-DDTHH:MM' for a notification
  completedAt: text('completed_at'),
  timestamp: text('timestamp').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  // One occurrence per series per day — makes generation idempotent
  uniqueIndex('idx_task_series_due').on(table.seriesId, table.dueDate).where(sql`series_id IS NOT NULL`),
]);

// A repeating task: the template + rule. Occurrences are ordinary `task` rows,
// so completing, undo and pool math are unchanged.
export const taskSeries = sqliteTable('task_series', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  title: text('title').notNull(),
  monetaryValue: real('monetary_value').notNull(),
  effortRating: integer('effort_rating').notNull(),
  source: text('source').notNull().default('manual'),
  frequency: text('frequency').notNull(), // 'daily' | 'weekly' | 'monthly'
  weekdays: text('weekdays'), // weekly: comma list, 0 = Sunday ("1,4" = Mon + Thu)
  monthDay: integer('month_day'), // monthly: 1–31, clamped to the month's last day
  notes: text('notes'), // copied onto each occurrence
  remindTime: text('remind_time'), // optional 'HH:MM': each occurrence reminds on its day
  startDate: text('start_date').notNull(), // local 'YYYY-MM-DD'
  lastGeneratedDate: text('last_generated_date'), // local 'YYYY-MM-DD'
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const wishlistItem = sqliteTable('wishlist_item', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  productUrl: text('product_url'), // null for items entered manually with no link
  title: text('title'),
  imageUrl: text('image_url'),
  price: real('price'),
  currency: text('currency'), // as scraped (e.g. 'CAD'); null = assume user's currency
  priorityFlag: integer('priority_flag', { mode: 'boolean' }).notNull().default(false),
  scrapeStatus: text('scrape_status').notNull().default('pending'),
  purchasedAt: text('purchased_at'), // set by redeemGoal; non-null = "Got it"
  addedAt: text('added_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  // DB-level guarantee that only one item can be the priority at a time
  uniqueIndex('idx_single_priority').on(table.priorityFlag).where(sql`priority_flag = 1`),
]);

export const allowancePool = sqliteTable('allowance_pool', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  monthKey: text('month_key').notNull().unique(),
  monthlyBudgetCap: real('monthly_budget_cap').notNull(),
  totalEarned: real('total_earned').notNull().default(0),
  totalSpent: real('total_spent').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});