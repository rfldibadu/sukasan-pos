// Sukasan POS Background Web Push Service Worker

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {
    title: "Sukasan POS",
    body: "You have a new update",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    url: "/orders",
    tag: "sukasan-notification",
  };

  try {
    const json = event.data.json();
    payload = { ...payload, ...json };
  } catch {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: payload.tag || `sukasan-${Date.now()}`,
    renotify: true,
    data: {
      url: payload.url || "/orders",
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an existing tab/window is already on Sukasan POS, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
