// store/uiStore.js
// Global overlay state: one Undo snackbar and one toast at a time (G2).
import { create } from 'zustand';

let nextId = 1;

export const useUiStore = create((set) => ({
  snackbar: null, // { id, message, actionLabel, onAction }
  toast: null, // { id, message }
  showSnackbar: (snackbar) => set({ snackbar: { ...snackbar, id: nextId++ } }),
  hideSnackbar: (id) => set((s) => (s.snackbar && (id == null || s.snackbar.id === id) ? { snackbar: null } : s)),
  showToast: (message) => set({ toast: { message, id: nextId++ } }),
  hideToast: (id) => set((s) => (s.toast?.id === id ? { toast: null } : s)),
  // Transcript handed back from Voice capture to an already-open Add task sheet
  voiceDraft: null,
  setVoiceDraft: (voiceDraft) => set({ voiceDraft }),
}));

export const showToast = (message) => useUiStore.getState().showToast(message);
