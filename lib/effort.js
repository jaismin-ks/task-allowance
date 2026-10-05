// lib/effort.js
// Effort level names (spec §5.2). Time bands match the AI system prompt.
export const EFFORT_LEVELS = [
  { level: 1, name: 'Tiny', time: 'under 5 min', short: '<5 MIN' },
  { level: 2, name: 'Quick', time: '5–20 min', short: '20 MIN' },
  { level: 3, name: 'Steady', time: '20–45 min', short: '45 MIN' },
  { level: 4, name: 'Hard', time: '45–60 min', short: '60 MIN' },
  { level: 5, name: 'Big push', time: '1 hour +', short: '1 HR+' },
];

export const effortInfo = (level) => EFFORT_LEVELS[Math.min(5, Math.max(1, level)) - 1];
