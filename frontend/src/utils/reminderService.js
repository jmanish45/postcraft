// Postcraft 15-Minute Reminder & Notification Service
// Fires ONLY when initiated by an actual user post to X.
// Triggers the phone's native notification ringtone stream (not media volume).

import {
  getLastPostTime,
  getRemainingCooldownMs,
  isReminderArmed,
  disarmReminder,
  isReminderNotified,
  setReminderNotified,
  areNotificationsEnabled,
  COOLDOWN_DURATION_MS,
} from "./storage";

/**
 * Trigger physical phone vibration pattern if supported
 */
export function triggerVibration(pattern = [500, 200, 500, 200, 500]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

/**
 * Check if the Notifications API is supported
 */
export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission; // 'granted', 'denied', or 'default'
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return Notification.permission;
  }
}

/**
 * Delivers native system notification via Service Worker.
 * On mobile devices (Android Chrome), this rings the phone's configured
 * NOTIFICATION RINGTONE (Notification sound stream), exactly like WhatsApp/SMS,
 * avoiding phone media audio playback.
 */
export async function showPostReminderNotification({
  title = "⏰ Time for your next X post!",
  body = "Your 15-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
  isTest = false,
} = {}) {
  // 1. Trigger physical vibration buzz
  triggerVibration([500, 200, 500, 200, 500]);

  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  // Unique tag ensures Android treats each alert as a fresh event, ringing the notification tone
  const uniqueTag = isTest
    ? `postcraft-test-${Date.now()}`
    : `postcraft-reminder-${Date.now()}`;

  try {
    // Service Worker notification: creates a high-priority system notification in the notification shade
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "/favicon.png",
          badge: "/favicon-32x32.png",
          vibrate: [500, 200, 500, 200, 500],
          silent: false, // Forces native phone notification ringtone
          tag: uniqueTag,
          renotify: true,
          requireInteraction: true,
          data: { url: "/" },
        });
        return true;
      }
    }

    // Window context fallback (desktop)
    new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon-32x32.png",
      silent: false,
      tag: uniqueTag,
    });
    return true;
  } catch (err) {
    console.warn("Failed to display system notification:", err);
    return false;
  }
}

/**
 * STRICT REMINDER DISCIPLINE:
 * Checks whether a reminder is due, and ONLY rings if:
 * 1. The reminder was actively armed by a user posting a draft from that exact point.
 * 2. 15 minutes have elapsed since that post.
 * 3. It has not already notified.
 * 4. The post is not ancient/stale (within 3 min of expiration).
 */
export async function checkAndTriggerReminder() {
  // If not armed by a user post, NEVER ring
  if (!isReminderArmed()) {
    return false;
  }

  const lastTime = getLastPostTime();
  if (!lastTime) {
    disarmReminder();
    return false;
  }

  const now = Date.now();
  const elapsed = now - lastTime;
  const remaining = COOLDOWN_DURATION_MS - elapsed;

  // Still within the 15-minute wait
  if (remaining > 0) {
    return false;
  }

  // If the user closed the app and came back hours later,
  // do NOT blast a stale alarm unexpectedly! Disarm cleanly.
  const maxLeniencyWindowMs = 3 * 60 * 1000; // 3 minutes grace
  const isStale = elapsed - COOLDOWN_DURATION_MS > maxLeniencyWindowMs;

  // Immediately disarm so it NEVER rings twice for this post
  disarmReminder();
  setReminderNotified(true);

  // Broadcast event for UI state refresh
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("postcraft:cooldown-complete", {
        detail: { lastPostTime: lastTime, isStale },
      })
    );
  }

  // If expired hours ago, do not ring
  if (isStale) {
    return false;
  }

  // Ring the notification ringtone at the 15-minute mark!
  if (areNotificationsEnabled()) {
    await showPostReminderNotification({
      title: "⏰ Time for your next X post!",
      body: "Your 15-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
    });
  } else {
    triggerVibration([500, 200, 500, 200, 500]);
  }

  return true;
}

// Global singleton background watcher
let workerInstance = null;
let fallbackInterval = null;
let isInitialized = false;

export function initReminderService() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  // 1. Web Worker for background ticking
  try {
    if (window.Worker) {
      workerInstance = new Worker("/timerWorker.js");
      workerInstance.onmessage = () => {
        checkAndTriggerReminder();
      };
      workerInstance.postMessage("start");
    }
  } catch (err) {
    console.log("Dedicated timer worker not available, falling back to interval:", err);
  }

  // 2. Fallback interval
  fallbackInterval = setInterval(() => {
    checkAndTriggerReminder();
  }, 1000);

  // 3. Screen unlock / tab visibility wake-up listener
  if (typeof document !== "undefined") {
    const handleWake = () => {
      checkAndTriggerReminder();
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleWake();
      }
    });

    window.addEventListener("focus", handleWake);
  }
}
