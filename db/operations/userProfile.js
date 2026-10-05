// db/operations/userProfile.js
import { sqlite } from '../client';
import { getCurrentMonthKey } from './completeTask';

// null until onboarding (or its Skip) creates the single profile row — app/index.js
// uses that to decide whether to show onboarding.
export function getProfile() {
  const row = sqlite.getFirstSync(
    `SELECT display_name AS displayName, monthly_allowance_cap AS monthlyAllowanceCap,
            currency_code AS currencyCode, voice_input_enabled AS voiceInputEnabled
     FROM user_profile LIMIT 1`
  );
  return row ? { ...row, voiceInputEnabled: !!row.voiceInputEnabled } : null;
}

// Single-user app: make sure exactly one profile row exists
export function ensureUserProfile({ monthlyAllowanceCap = 150, currencyCode = 'USD' } = {}) {
  sqlite.runSync(
    `INSERT INTO user_profile (display_name, monthly_allowance_cap, currency_code)
     SELECT 'Me', ?, ? WHERE NOT EXISTS (SELECT 1 FROM user_profile)`,
    [monthlyAllowanceCap, currencyCode]
  );
}

const PROFILE_COLUMNS = {
  displayName: 'display_name',
  currencyCode: 'currency_code',
  voiceInputEnabled: 'voice_input_enabled',
};

// Name / currency / voice toggle. Allowance goes through updateMonthlyCap.
export function updateProfile(fields) {
  const entries = Object.entries(fields).filter(([k]) => PROFILE_COLUMNS[k]);
  if (!entries.length) return;
  const sets = entries.map(([k]) => `${PROFILE_COLUMNS[k]} = ?`).join(', ');
  const values = entries.map(([k, v]) => (k === 'voiceInputEnabled' ? (v ? 1 : 0) : v));
  sqlite.runSync(`UPDATE user_profile SET ${sets}, updated_at = datetime('now')`, values);
}

// Changing the cap mid-month never claws back earned money — the daily guide is
// simply recomputed from the new remaining budget (and may drop to the floor).
export function updateMonthlyCap(newCap) {
  const monthKey = getCurrentMonthKey();
  sqlite.withTransactionSync(() => {
    sqlite.runSync(
      `UPDATE user_profile SET monthly_allowance_cap = ?, updated_at = datetime('now')`,
      [newCap]
    );
    sqlite.runSync(
      `UPDATE allowance_pool SET monthly_budget_cap = ? WHERE month_key = ?`,
      [newCap, monthKey]
    );
  });
}
