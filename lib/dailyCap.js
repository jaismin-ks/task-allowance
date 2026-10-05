// lib/dailyCap.js

const TIER_WEIGHTS = [1, 2, 3, 5, 8];
const MIN_DAILY_FLOOR = 1.0;

export function computeDailyCap(monthlyAllowanceCap, totalEarnedThisMonth, currentDate = new Date()) {
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDate.getDate() + 1;
  const remainingBudget = monthlyAllowanceCap - totalEarnedThisMonth;

  const dailyCap = Math.max(remainingBudget / daysRemaining, MIN_DAILY_FLOOR);
  const weightSum = TIER_WEIGHTS.reduce((a, b) => a + b, 0);
  const tierUnit = dailyCap / weightSum;

  let cumulative = 0;
  const tierRanges = TIER_WEIGHTS.map((w) => {
    const lower = cumulative;
    cumulative += tierUnit * w;
    return [lower, cumulative];
  });

  return { dailyCap, tierRanges };
}

export function checkValueAgainstTier(value, effortRating, tierRanges) {
  if (!tierRanges || !tierRanges[effortRating - 1]) return true;
  const [low, high] = tierRanges[effortRating - 1];
  return value >= low && value <= high; // false -> show soft warning, never block
}

// 'low' | 'high' | null — which side of the recommended range a value falls on
export function getTierMismatch(value, effortRating, tierRanges) {
  if (checkValueAgainstTier(value, effortRating, tierRanges)) return null;
  const [low] = tierRanges[effortRating - 1];
  return value < low ? 'low' : 'high';
}