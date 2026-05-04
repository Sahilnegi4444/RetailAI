/**
 * Model Event Bus — Global event system for coordinating model state across pages.
 * When training completes, all subscribed pages automatically refresh their data.
 */

const listeners = new Set();
let _lastTrainedAt = null;

export const modelEvents = {
  /** Subscribe to model-retrained events. Returns unsubscribe function. */
  onModelRetrained(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  /** Call this when training completes to notify all pages. */
  notifyModelRetrained() {
    _lastTrainedAt = Date.now();
    console.log('[MODEL EVENTS] 🔔 Model retrained — notifying', listeners.size, 'listeners');
    listeners.forEach(cb => {
      try { cb(_lastTrainedAt); } catch (e) { console.error(e); }
    });
  },

  /** Get timestamp of last retraining (or null if none this session) */
  getLastTrainedAt() {
    return _lastTrainedAt;
  }
};
