// Postcraft Service Worker for PWA and 20-Minute Posting Reminders

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Display notification requested by client app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(
      title || "⏰ Time for your next X post!",
      {
        body:
          options?.body ||
          "Your 20-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
        icon: options?.icon || "/favicon.png",
        badge: options?.badge || "/favicon-32x32.png",
        vibrate: [200, 100, 200, 100, 200],
        tag: "postcraft-20m-reminder",
        renotify: true,
        requireInteraction: true,
        data: { url: options?.url || "/" },
        ...options,
      }
    );
  }
});

// Handle push notification events (Web Push)
self.addEventListener("push", (event) => {
  let data = {
    title: "⏰ Time for your next X post!",
    body: "Your 20-minute safety interval has passed. Tap to open Postcraft and post your next draft.",
    url: "/",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.png",
      badge: "/favicon-32x32.png",
      vibrate: [200, 100, 200, 100, 200],
      tag: "postcraft-20m-reminder",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || "/" },
    })
  );
});

// Handle notification tap / click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

