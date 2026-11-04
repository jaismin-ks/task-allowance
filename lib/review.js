// lib/review.js
// Store rating prompt. Asked at the happiest moment: just after the user marks
// their second goal as bought, at most once per app version. Never from a
// button and never with a question first (Apple / Google guidelines). The OS
// may still decide not to show it, which is fine.
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { getLifetimeStats } from '../db/operations/stats';
import { flags } from './prefs';

const MIN_GOALS_REACHED = 2;

export async function maybeAskForReview() {
  try {
    const version = Constants.expoConfig?.version ?? '0';
    if (flags.get('reviewAskedVersion') === version) return;
    if (getLifetimeStats().goalsReached < MIN_GOALS_REACHED) return;
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return;
    flags.set('reviewAskedVersion', version);
    await StoreReview.requestReview();
  } catch {
    // A rating prompt is never worth an error
  }
}
