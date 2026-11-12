const STORAGE_KEY = "postcraft_saved_posts_v2";
const COOLDOWN_KEY = "postcraft_last_post_time";
const REMINDER_NOTIFIED_KEY = "postcraft_reminder_notified_v2";
const NOTIFICATIONS_ENABLED_KEY = "postcraft_notifications_enabled";

export const COOLDOWN_DURATION_MS = 20 * 60 * 1000; // 20 minutes in milliseconds

export function getSavedPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load saved posts from localStorage", err);
    return [];
  }
}

export function savePostsToStorage(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (err) {
    console.error("Failed to save posts to localStorage", err);
  }
}

export function clearSavedPostsFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear posts from localStorage", err);
  }
}

// 20-Minute Safety Cooldown & Posting Reminder Storage
export function getLastPostTime() {
  try {
    const val = localStorage.getItem(COOLDOWN_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function setLastPostTimeToNow() {
  try {
    const now = Date.now();
    localStorage.setItem(COOLDOWN_KEY, now.toString());
    // Reset reminder notified flag for the new 20-min cycle
    localStorage.removeItem(REMINDER_NOTIFIED_KEY);
    return now;
  } catch {
    return Date.now();
  }
}

export function clearLastPostTime() {
  try {
    localStorage.removeItem(COOLDOWN_KEY);
    localStorage.removeItem(REMINDER_NOTIFIED_KEY);
  } catch {
    // ignore
  }
}

export function isReminderNotified() {
  try {
    return localStorage.getItem(REMINDER_NOTIFIED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setReminderNotified(val) {
  try {
    if (val) {
      localStorage.setItem(REMINDER_NOTIFIED_KEY, "true");
    } else {
      localStorage.removeItem(REMINDER_NOTIFIED_KEY);
    }
  } catch {
    // ignore
  }
}

export function areNotificationsEnabled() {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (stored !== null) return stored === "true";
    return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
  } catch {
    return false;
  }
}

export function setNotificationsEnabled(enabled) {
  try {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

export function getRemainingCooldownMs() {
  const lastTime = getLastPostTime();
  if (!lastTime) return 0;
  const elapsed = Date.now() - lastTime;
  const remaining = COOLDOWN_DURATION_MS - elapsed;
  return remaining > 0 ? remaining : 0;
}

// User-provided API Keys (stored securely on their own device)
export function getUserApiKey(provider = "groq") {
  try {
    return localStorage.getItem(`postcraft_apikey_${provider}`) || "";
  } catch {
    return "";
  }
}

export function saveUserApiKey(provider = "groq", key = "") {
  try {
    if (key.trim()) {
      localStorage.setItem(`postcraft_apikey_${provider}`, key.trim());
    } else {
      localStorage.removeItem(`postcraft_apikey_${provider}`);
    }
  } catch {
    // ignore
  }
}

export function clearUserApiKey(provider = "groq") {
  try {
    localStorage.removeItem(`postcraft_apikey_${provider}`);
  } catch {
    // ignore
  }
}
