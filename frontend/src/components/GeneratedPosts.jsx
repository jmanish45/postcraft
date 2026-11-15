import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Pencil,
  Save,
  AlertTriangle,
  Trash2,
  Clock,
  ExternalLink,
  Plus,
  RotateCcw,
  X,
  Bell,
  BellRing,
  Volume2,
} from "lucide-react";
import XLogo from "./XLogo";
import { calculateTwitterLength, TWITTER_MAX_LENGTH } from "../utils/twitterCharCount";
import {
  getRemainingCooldownMs,
  setLastPostTimeToNow,
  getLastPostTime,
  areNotificationsEnabled,
  setNotificationsEnabled,
  COOLDOWN_DURATION_MS,
} from "../utils/storage";
import {
  getNotificationPermission,
  requestNotificationPermission,
  showPostReminderNotification,
  scheduleServerPushReminder,
  cancelServerPushReminder,
  sendServerTestPush,
} from "../utils/reminderService";

export default function GeneratedPosts({
  posts = [],
  onUpdatePost,
  onTogglePosted,
  onDeletePost,
  onClearAll,
  onSwitchToCreate,
}) {
  const [filter, setFilter] = useState("all"); // "all" | "unposted" | "posted"
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [copyAllStatus, setCopyAllStatus] = useState(false);

  // 15-Minute Safety Cooldown Timer & Notification State
  const [cooldownRemaining, setCooldownRemaining] = useState(() => getRemainingCooldownMs());
  const [cooldownAlertPost, setCooldownAlertPost] = useState(null);
  const [notificationsActive, setNotificationsActive] = useState(() => areNotificationsEnabled());
  const [permissionState, setPermissionState] = useState(() => getNotificationPermission());
  const [testAlertSent, setTestAlertSent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = getRemainingCooldownMs();
      setCooldownRemaining(remaining);
      // Auto-close alert window once cooldown reaches 0
      if (remaining <= 0 && cooldownAlertPost) {
        setCooldownAlertPost(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cooldownAlertPost]);

  // Listen to cooldown complete event dispatched by background reminder service
  useEffect(() => {
    const handleCooldownComplete = () => {
      setCooldownRemaining(0);
      setCooldownAlertPost(null);
    };
    window.addEventListener("postcraft:cooldown-complete", handleCooldownComplete);
    return () => {
      window.removeEventListener("postcraft:cooldown-complete", handleCooldownComplete);
    };
  }, []);

  const handleToggleNotifications = async () => {
    const current = getNotificationPermission();
    if (current !== "granted") {
      const res = await requestNotificationPermission();
      setPermissionState(res);
      if (res === "granted") {
        setNotificationsEnabled(true);
        setNotificationsActive(true);
        await showPostReminderNotification({
          title: "🔔 15m Reminders Active!",
          body: "Your phone will ring with a notification 15 minutes after you post each draft.",
          isTest: true,
        });
      } else {
        alert(
          "Notifications are blocked in Chrome. Please tap the lock/settings icon in the browser address bar and enable Notifications for this site."
        );
      }
    } else {
      const nextState = !notificationsActive;
      setNotificationsEnabled(nextState);
      setNotificationsActive(nextState);
    }
  };

  const handleSendTestAlert = async () => {
    const perm = getNotificationPermission();
    if (perm !== "granted") {
      const res = await requestNotificationPermission();
      setPermissionState(res);
      if (res !== "granted") {
        alert("Please allow notifications to receive reminders on your mobile device.");
        return;
      }
      setNotificationsEnabled(true);
      setNotificationsActive(true);
    }

    setTestAlertSent(true);

    // Try server-side push first (wakes up sleeping mobile phone via FCM)
    let pushDelivered = false;
    try {
      pushDelivered = await sendServerTestPush({
        title: "⏰ Postcraft Server Push Test!",
        body: "Server push verified! This will wake your phone and ring after 15 minutes even with screen off.",
      });
    } catch {
      pushDelivered = false;
    }

    // Fall back to local Service Worker notification if offline or push unavailable
    if (!pushDelivered) {
      await showPostReminderNotification({
        title: "⏰ Postcraft 15m Reminder Ready!",
        body: "Your phone is ready. A reminder like this will ring 15 minutes after each post.",
        isTest: true,
      });
    }

    setTimeout(() => setTestAlertSent(false), 2500);
  };

  const formatCooldown = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const unpostedPosts = posts.filter((p) => !p.isPosted);
  const postedPosts = posts.filter((p) => p.isPosted);

  const displayedPosts =
    filter === "unposted"
      ? unpostedPosts
      : filter === "posted"
      ? postedPosts
      : posts;

  const handleStartEdit = (post) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = (id) => {
    onUpdatePost(id, editContent);
    setEditingId(null);
  };

  const handleCopyPost = async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      alert("Unable to copy to clipboard automatically. Please copy manually.");
    }
  };

  // Intercept click when cooldown is active to display the Alert Window
  const handlePostClick = (post) => {
    if (cooldownRemaining > 0) {
      setCooldownAlertPost(post);
      return;
    }
    executePostToX(post);
  };

  const executePostToX = (post) => {
    // 1. Copy to clipboard as safety fallback
    try {
      navigator.clipboard.writeText(post.content);
    } catch {
      // ignore
    }

    // 2. Mark post as posted in localStorage
    onTogglePosted(post.id, true);

    // 3. Trigger 15-minute anti-suspension cooldown & arm reminder
    setLastPostTimeToNow();
    setCooldownRemaining(COOLDOWN_DURATION_MS);

    // 4. Schedule server-side Web Push (wakes up mobile device even if app is closed or screen is off)
    scheduleServerPushReminder({
      delaySeconds: 15 * 60,
      title: "⏰ Time for your next X post!",
      body: "Your 15-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
      reminderId: "active_post_reminder",
    });

    // 5. Open X intent (triggers native X mobile app on iOS/Android, or web compose)
    const encodedText = encodeURIComponent(post.content);
    const xIntentUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(xIntentUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyAll = async () => {
    if (!displayedPosts.length) return;
    const allText = displayedPosts.map((p) => p.content).join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(allText);
      setCopyAllStatus(true);
      setTimeout(() => setCopyAllStatus(false), 2000);
    } catch {
      alert("Failed to copy all drafts.");
    }
  };

  const handleConfirmClearAll = () => {
    if (
      window.confirm(
        "Clear all saved drafts for a fresh day? This will wipe previous drafts so only new posts will be stored."
      )
    ) {
      onClearAll();
      setCooldownRemaining(0);
      cancelServerPushReminder("active_post_reminder");
    }
  };

  if (!posts.length) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center sm:p-12 shadow-2xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <Clock size={20} />
        </div>
        <h3 className="font-heading mt-4 text-base font-bold text-neutral-800">
          No saved drafts
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-neutral-500">
          Add your source content and generate fresh post drafts for today.
        </p>
        <button
          type="button"
          onClick={onSwitchToCreate}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 active:scale-95 shadow-xs"
        >
          <Plus size={14} />
          <span>Generate New Drafts</span>
        </button>
      </div>
    );
  }

  const isCooldownActive = cooldownRemaining > 0;

  return (
    <section className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">
              Saved Posts
            </h2>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">
              {posts.length}
            </span>
          </div>

          {/* Minimal Countdown Indicator Above Posts (No loud alerts, just clean timer) */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {isCooldownActive ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-600">
                <Clock size={12} className="text-neutral-900 animate-pulse" />
                <span>Next post unlocked in</span>
                <span className="font-mono font-bold text-neutral-950">
                  {formatCooldown(cooldownRemaining)}
                </span>
                <span className="text-[11px] text-neutral-400">· 15m gap</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Ready to post on X</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Sleek Monochrome Styling (No red color) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 15-Minute Reminder Toggle Button */}
          <button
            type="button"
            onClick={handleToggleNotifications}
            title={
              notificationsActive
                ? "15-minute notification reminders are ON. Click to mute."
                : "Enable 15-minute notification reminders for your phone."
            }
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95 shadow-2xs ${
              notificationsActive
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black"
            }`}
          >
            {notificationsActive ? (
              <BellRing size={12} className="text-emerald-600 animate-pulse" />
            ) : (
              <Bell size={12} />
            )}
            <span className="hidden sm:inline">
              {notificationsActive ? "15m Reminders On" : "Enable Reminders"}
            </span>
            <span className="sm:hidden">
              {notificationsActive ? "15m On" : "Reminders"}
            </span>
          </button>

          {/* Test Ringtone Alert Button */}
          <button
            type="button"
            onClick={handleSendTestAlert}
            title="Test notification ringtone on this device"
            className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs font-semibold text-neutral-600 hover:border-black hover:text-black transition active:scale-95 shadow-2xs"
          >
            <Volume2 size={12} />
            <span className="hidden sm:inline">
              {testAlertSent ? "Ringing..." : "Test Alert"}
            </span>
          </button>

          {/* Start New Day / Clear Button (Clean neutral styling) */}
          <button
            type="button"
            onClick={handleConfirmClearAll}
            title="Clear all drafts to start fresh for a new day"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-black hover:text-black active:scale-95 shadow-2xs"
          >
            <RotateCcw size={12} />
            <span>Clear for New Day</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-black hover:text-black active:scale-95 shadow-2xs"
          >
            {copyAllStatus ? (
              <>
                <Check size={13} className="text-emerald-600" />
                <span className="font-bold text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy All</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSwitchToCreate}
            className="flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 active:scale-95 shadow-2xs"
          >
            <Plus size={13} />
            <span>New Batch</span>
          </button>
        </div>
      </div>

      {/* 15-Minute Safety Interval Complete Banner */}
      {!isCooldownActive && getLastPostTime() > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-emerald-100/50 p-3.5 text-xs text-emerald-950 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Check size={14} className="stroke-[2.5]" />
            </div>
            <div>
              <p className="font-bold">15-Minute Safety Gap Completed!</p>
              <p className="text-[11px] text-emerald-700">
                Your account is in safe standing. You can now post your next draft without spam risk.
              </p>
            </div>
          </div>
          {unpostedPosts.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter("unposted")}
              className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 active:scale-95 shadow-xs"
            >
              Post Next ({unpostedPosts.length} left)
            </button>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
            filter === "all"
              ? "bg-black text-white shadow-xs"
              : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
          }`}
        >
          <span>All</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
            {posts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("unposted")}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
            filter === "unposted"
              ? "bg-black text-white shadow-xs"
              : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
          }`}
        >
          <span>To Post</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              filter === "unposted" ? "bg-white/20" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {unpostedPosts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("posted")}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
            filter === "posted"
              ? "bg-black text-white shadow-xs"
              : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
          }`}
        >
          <span>Posted</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              filter === "posted" ? "bg-white/20" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {postedPosts.length}
          </span>
        </button>
      </div>

      {/* Posts Cards Grid */}
      <div className="space-y-3.5">
        {displayedPosts.map((post, index) => {
          const isEditing = editingId === post.id;
          const currentContent = isEditing ? editContent : post.content || "";
          const charCount = calculateTwitterLength(currentContent);
          const isOverLimit = charCount > TWITTER_MAX_LENGTH;

          const isThisPostPosted = !!post.isPosted;
          const isLockedByCooldown = !isThisPostPosted && isCooldownActive;

          return (
            <article
              key={post.id || index}
              className={`overflow-hidden rounded-2xl border bg-white p-3.5 sm:p-5 shadow-2xs transition ${
                isThisPostPosted
                  ? "border-neutral-200 bg-neutral-50/70"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {/* Card Header */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Post {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Clean Status Pill */}
                  {isThisPostPosted ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <Check size={11} className="stroke-[3]" />
                      <span>
                        {post.postedAt
                          ? `Posted at ${new Date(post.postedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "Posted"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">
                      {post.based_on?.length > 0 && `(Based on: ${post.based_on.join(", ")})`}
                    </span>
                  )}
                </div>

                {/* Subtle Single Delete Button (Neutral, no red) */}
                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-800 active:scale-95"
                  title="Remove post"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Card Content or Inline Editor */}
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-base sm:text-sm leading-6 outline-none transition focus:border-black focus:bg-white"
                    placeholder="Edit your post..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-black hover:text-black"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(post.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                    >
                      <Save size={13} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-800 sm:text-base">
                  {post.content}
                </p>
              )}

              {/* Character Limit Warning (Clean subtle warning, no loud red box) */}
              {isOverLimit && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-100 p-2.5 text-xs font-medium text-neutral-800">
                  <AlertTriangle size={13} className="shrink-0 text-neutral-700" />
                  <span>
                    Exceeds maximum limit of 279 characters by {charCount - TWITTER_MAX_LENGTH}. Shorten before posting.
                  </span>
                </div>
              )}

              {/* Card Footer */}
              <div className="mt-4 flex flex-col gap-2.5 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Character Counter with 230-279 indicator */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`font-semibold tabular-nums ${
                      isOverLimit
                        ? "font-bold text-neutral-900 underline"
                        : charCount >= 230
                        ? "font-bold text-emerald-700"
                        : "text-neutral-500"
                    }`}
                  >
                    {charCount}
                  </span>
                  <span className="text-neutral-400">/ 279 chars</span>
                  {charCount >= 230 && charCount <= 279 && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Optimal (230–279)
                    </span>
                  )}
                  {charCount < 230 && (
                    <span className="text-[10px] text-neutral-400">
                      (target 230–279)
                    </span>
                  )}
                </div>

                {/* Action Buttons: Sleek & Modern (Fully responsive, fits mobile without overflow) */}
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(post)}
                        className="flex h-8 sm:h-9 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 sm:px-3 text-xs font-semibold text-neutral-700 transition hover:border-black hover:text-black active:scale-95 shadow-2xs"
                      >
                        <Pencil size={11} className="sm:w-3 sm:h-3" />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyPost(post.content, post.id)}
                      className="flex h-8 sm:h-9 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 sm:px-3.5 text-xs font-semibold text-neutral-700 transition hover:border-black hover:text-black active:scale-95 shadow-2xs"
                    >
                      {copiedId === post.id ? (
                        <>
                          <Check size={12} className="text-emerald-600 stroke-[3]" />
                          <span className="font-bold text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} className="sm:w-3 sm:h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Primary Post on X Button */}
                  {isThisPostPosted ? (
                    // POSTED STATE: Sleek Emerald Green with Green Check (Guaranteed within card bounds)
                    <button
                      type="button"
                      onClick={() => handlePostClick(post)}
                      className="flex h-8 sm:h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 sm:px-4 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95 shadow-2xs whitespace-nowrap"
                      title="Post again on X"
                    >
                      <Check size={13} className="stroke-[3]" />
                      <span>Posted on X</span>
                      <ExternalLink size={10} className="opacity-80" />
                    </button>
                  ) : (
                    // UNPOSTED STATE: Active Black OR Muted Cooldown State
                    <button
                      type="button"
                      onClick={() => handlePostClick(post)}
                      className={`flex h-8 sm:h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 sm:px-4 text-xs font-bold transition active:scale-95 shadow-2xs whitespace-nowrap ${
                        isLockedByCooldown
                          ? "border border-neutral-200 bg-neutral-100 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 cursor-pointer shadow-none"
                          : "bg-black text-white hover:bg-neutral-800"
                      }`}
                      title={
                        isLockedByCooldown
                          ? `Cooldown active: ${formatCooldown(cooldownRemaining)} remaining. Click to view.`
                          : "Post on X"
                      }
                    >
                      <XLogo className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
                      <span>Post on X</span>
                      <ExternalLink size={10} className="opacity-70" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ALERT WINDOW: 20-Minute Safety Cooldown Modal */}
      {cooldownAlertPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCooldownAlertPost(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
                <Clock size={20} className="animate-pulse" />
              </div>
              <button
                type="button"
                onClick={() => setCooldownAlertPost(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="font-heading text-lg font-bold text-neutral-950">
              Account Safety Wait (15-Min Gap)
            </h3>

            <p className="mt-2 text-xs leading-5 text-neutral-600">
              Please wait{" "}
              <span className="font-mono font-bold text-black text-sm">
                {formatCooldown(cooldownRemaining)}
              </span>{" "}
              before posting your next tweet.
            </p>

            <p className="mt-2 text-[11px] leading-4 text-neutral-400">
              Posting with less than 15 minutes gap can cause X to flag your account for duplicate content or automated spam.
            </p>

            {/* Reminder Alert Notice */}
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200/80 p-2.5 text-[11px] text-neutral-600">
              <Bell size={13} className="shrink-0 text-neutral-700" />
              <span>
                {notificationsActive
                  ? "🔔 A reminder notification will ring on your phone when 15m finishes."
                  : "💡 Turn on '15m Reminders' above to get a mobile notification when ready."}
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCooldownAlertPost(null)}
                className="w-full rounded-xl bg-black py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800 active:scale-95 shadow-xs"
              >
                Got it ({formatCooldown(cooldownRemaining)} remaining)
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = cooldownAlertPost;
                  setCooldownAlertPost(null);
                  if (p) executePostToX(p);
                }}
                className="w-full py-1.5 text-center text-[11px] font-semibold text-neutral-400 hover:text-black transition"
              >
                Post anyway now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
