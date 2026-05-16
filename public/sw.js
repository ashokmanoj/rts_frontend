// Service Worker — RTS push notifications
// v3 — differentiates new-request vs food-reminder notifications

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "RTS Notification", body: event.data.text() };
  }

  const isRequestNotif = data.type === "new_request";

  const options = {
    body:               data.body               || "",
    icon:               data.icon               || "/rtsLogo.png",
    badge:              data.badge              || "/rtsLogo.png",
    tag:                data.tag                || "rts-notification",
    renotify:           true,
    requireInteraction: data.requireInteraction ?? false,
    data: {
      url:  data.url  || "/",
      type: data.type || "general",
    },
  };

  // Food reminders get Yes/No action buttons; request notifications do not
  if (!isRequestNotif) {
    options.actions = [
      { action: "yes", title: "Yes, I'm done ✓" },
      { action: "no",  title: "No, take me there →" },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "RTS", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Food notification "Yes" action — user confirmed, just dismiss
  if (event.action === "yes") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
