// Postcraft 20-Minute Reminder & Notification Service
import {
  getLastPostTime,
  getRemainingCooldownMs,
  isReminderNotified,
  setReminderNotified,
  areNotificationsEnabled,
  COOLDOWN_DURATION_MS,
} from "./storage";

/**
 * Web Audio API Pleasant 2-Tone Chime: D5 (587.33 Hz) -> A5 (880 Hz)
 * Requires no external audio assets; synthesized purely in the browser.
 */
export function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: Gentle chime (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Tone 2: Harmonic resolution (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0.25, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.85);
  } catch (err) {
    console.warn("Could not synthesize chime:", err);
  }
}

/**
 * Trigger mobile vibration pattern if supported
 */
export function triggerVibration(pattern = [200, 100, 200, 100, 200]) {
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
 * Deliver system notification (via Service Worker if available, fallback to Notification API)
 */
export async function showPostReminderNotification({
  title = "⏰ Time for your next X post!",
  body = "Your 20-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
  isTest = false,
} = {}) {
  // Always trigger sound & vibration
  playChime();
  triggerVibration([200, 100, 200, 100, 200]);

  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    // Preferred on Android Chrome / PWA: Service Worker registration
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "/favicon.png",
          badge: "/favicon-32x32.png",
          vibrate: [200, 100, 200, 100, 200],
          tag: isTest ? `postcraft-test-${Date.now()}` : "postcraft-20m-reminder",
          renotify: true,
          requireInteraction: true,
          data: { url: "/" },
        });
        return true;
      }
    }

    // Fallback for desktop window context
    new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon-32x32.png",
    });
    return true;
  } catch (err) {
    console.warn("Failed to display system notification:", err);
    return false;
  }
}

/**
 * Checks whether a reminder is due, and if so, triggers notification + sound
 */
export async function checkAndTriggerReminder() {
  const lastTime = getLastPostTime();
  if (!lastTime) return false;

  const remaining = getRemainingCooldownMs();
  const alreadyNotified = isReminderNotified();

  if (remaining <= 0 && !alreadyNotified) {
    setReminderNotified(true);
    if (areNotificationsEnabled()) {
      await showPostReminderNotification();
    } else {
      // Still play chime & vibrate in-app even if system notifications are muted
      playChime();
      triggerVibration([200, 100, 200]);
    }

    // Broadcast event for UI updates
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("postcraft:cooldown-complete", {
          detail: { lastPostTime: lastTime },
        })
      );
    }
    return true;
  }
  return false;
}

// Global singleton background watcher
let workerInstance = null;
let fallbackInterval = null;
let isInitialized = false;

export function initReminderService() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  // 1. Try launching dedicated Web Worker for background ticking
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
  // When mobile phone unlocks or Chrome tab becomes visible, immediately check
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

